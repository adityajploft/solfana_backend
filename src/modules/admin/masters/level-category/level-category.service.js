import prisma from '../../../../config/db.config.js';
import HttpError from '../../../../common/errors/http.error.js';
import { deleteFromCDN, getOptimizedImageUrl, uploadToCDN } from '../../../../common/utils/globalUploader.js';
import uploadService from '../../uploads/upload.service.js';

class LevelCategoryService {

    async create(data, files) {
        const file = files?.image?.[0] || null;
        const featuredImage = files?.featuredImage?.[0] || null;        

        let { name, parentId, level, isActive, translations, bgColor1, bgColor2, gradientText } = data;

        level = Number(level);
        isActive = isActive === true || isActive === "true";

        if (typeof translations === "string") {
            try {
                translations = JSON.parse(translations);
            } catch {
                throw new HttpError(400, 'INVALID_TRANSLATIONS_JSON', 'Invalid translations JSON', 'category');
            }
        }

        if (parentId) {
            const parent = await prisma.category.findUnique({
                where: { id: parentId }
            });

            if (!parent || parent.deletedAt) {
                throw new HttpError(400, 'INVALID_PARENT', 'Invalid parent category', 'category');
            }
        }

        const existing = await prisma.category.findFirst({
            where: {
                name,
                parentId: parentId || null,
                deletedAt: null
            }
        });

        if (existing) {
            throw new HttpError(400, 'CATEGORY_ALREADY_EXISTS', 'Category already exists', 'category');
        }

        let imageCdnData = null;
        let featuredImageCdnData = null

        try {
            const category = await prisma.$transaction(async (tx) => {

            const normalizedParentId = parentId || null;

            // Shift existing sibling categories down
            await tx.category.updateMany({
                where: { parentId: normalizedParentId },
                data: { position: { increment: 1 } }
            });

            // New category always goes to the top
            const createdCategory = await tx.category.create({
                data: {
                    name,
                    level,
                    isActive,
                    position: 1,

                    bgColor1: bgColor1 || null,
                    bgColor2: bgColor2 || null,
                    gradientText: gradientText || null,

                    parent: normalizedParentId ? { connect: { id: normalizedParentId } } : undefined,

                    translations: { 
                        create: translations?.map(t => ({
                            name: t.name,
                            language: {
                                connect: { lang: t.lang }
                            }
                        }))
                    }
                },

                include: {
                    translations: {
                        include: {
                            language: {
                                select: {
                                    lang: true
                                }
                            }
                        }
                    }
                }
            });

            if (file) {
                const uploadImage = await uploadService.saveUpload({
                    file,
                    uploadType: 'CATEGORY_IMAGE',
                    entityType: 'CATEGORY',
                    entityId: createdCategory.id
                });

                createdCategory.image = uploadImage;
            }

            if (featuredImage) {
                const uploadFeaturedImage = await uploadService.saveUpload({
                    file: featuredImage,
                    uploadType: 'CATEGORY_FEATURED_IMAGE',
                    entityType: 'CATEGORY',
                    entityId: createdCategory.id
                });

                createdCategory.featuredImage = uploadFeaturedImage;
            }

            createdCategory.translations = createdCategory.translations.map(t => ({
                lang: t.language.lang,
                name: t.name
            }));

            return createdCategory;
        });

            return category;

        } catch (error) {

            if (imageCdnData?.storagePath) {
                await deleteFromCDN(imageCdnData.storagePath);
            }

            if (featuredImageCdnData?.storagePath) {
                await deleteFromCDN(featuredImageCdnData.storagePath);
            }

            throw error;
        }
    }

    async index({ page = 1, limit = 10, search = '' }) {
        const skip = (page - 1) * limit;

        const whereCondition = {
            deletedAt: null,
            parentId: null,
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    {
                        translations: {
                            some: {
                                name: { contains: search, mode: 'insensitive' },
                            },
                        },
                    },
                ],
            }),
        };

        const total = await prisma.category.count({ where: whereCondition });

        const categories = await prisma.category.findMany({
            where: whereCondition,
            skip,
            take: limit,
            orderBy: { position: 'asc' },
            include: {
                translations: {
                    include: { language: { select: { lang: true } } },
                },
                children: {
                    where: { deletedAt: null },
                    include: {
                        translations: {
                            include: { language: { select: { lang: true } } },
                        },
                        children: {
                            where: { deletedAt: null },
                            orderBy: { position: 'asc' },
                            include: {
                                translations: {
                                    include: { language: { select: { lang: true } } },
                                },
                            },
                        },
                    },
                },
            },
        });

        const categoryIds = categories.flatMap(cat => [
            cat.id,
            ...(cat.children?.map(c1 =>
                [c1.id, ...(c1.children?.map(c2 => c2.id) || [])]
            ) || []).flat(),
        ]);

        const images = await prisma.upload.findMany({
            where: {
                entityType: 'CATEGORY',
                entityId: { in: categoryIds },
                deletedAt: null
            },
        });

        const attachExtras = (nodes, level = 1, parentId = null) =>
            nodes.map(node => {
                const img = images.find(
                    i =>
                        i.entityId === node.id &&
                        i.uploadType === 'CATEGORY_IMAGE'
                );

                const featuredImg = images.find(
                    i =>
                        i.entityId === node.id &&
                        i.uploadType === 'CATEGORY_FEATURED_IMAGE'
                );

                return {
                    id: node.id,
                    name: node.name,
                    level,
                    parentId,

                    bgColor1: node.bgColor1,
                    bgColor2: node.bgColor2,
                    gradientText: node.gradientText,

                    position: node.position,

                    translations: node.translations.map(t => ({
                        lang: t.language.lang,
                        name: t.name,
                    })),
                    isActive: node.isActive,
                    image: img
                        ? {
                            url: img.cdnUrl,
                            filename: img.filename,
                        }
                        : null,

                    featuredImage: featuredImg
                        ? {
                            url: featuredImg.cdnUrl,
                            filename: featuredImg.filename,
                        }
                        : null,

                    children: node.children
                        ? attachExtras(node.children, level + 1, node.id)
                        : [],
                    createdAt: node.createdAt,
                    updatedAt: node.updatedAt,
                };
            });

        return {
            records: attachExtras(categories),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async update(id, data, files) {
        const existing = await prisma.category.findUnique({ where: { id } });
        if (!existing || existing.deletedAt) {
            throw new HttpError(404, 'CATEGORY_NOT_FOUND', 'category_not_found', 'category');
        }

        const file = files?.image?.[0] || null;
        const featuredImage = files?.featuredImage?.[0] || null;

        let { name, level, parentId, isActive, translations, bgColor1, bgColor2, gradientText } = data;

        if (level !== undefined) level = Number(level);
        if (isActive !== undefined)
            isActive = isActive === true || isActive === "true";

        if (typeof translations === "string") {
            try {
                translations = JSON.parse(translations);
            } catch {
                throw new HttpError(400, 'INVALID_TRANSLATIONS_JSON', 'invalid_translations_json', 'category');
            }
        }

        const updateData = {};

        if (name !== undefined) updateData.name = name;
        if (level !== undefined) updateData.level = level;
        if (isActive !== undefined) updateData.isActive = isActive;

        if (bgColor1 !== undefined) {
            updateData.bgColor1 = bgColor1;
        }

        if (bgColor2 !== undefined) {
            updateData.bgColor2 = bgColor2;
        }

        if (gradientText !== undefined) {
            updateData.gradientText = gradientText;
        }

        if (parentId !== undefined) {
            updateData.parent = parentId
                ? { connect: { id: parentId } }
                : { disconnect: true };
        }

        if (translations) {
            updateData.translations = {
                deleteMany: {},
                create: translations.map(t => ({
                    name: t.name,
                    language: { connect: { lang: t.lang } }
                }))
            };
        }

        const updated = await prisma.category.update({
            where: { id },
            data: updateData,
            include: {
                translations: {
                    include: { language: { select: { lang: true } } }
                }
            }
        });

        if (file) {
            const upload = await uploadService.replaceUpload('CATEGORY', id, 'CATEGORY_IMAGE', file);

            updated.image = upload;
        }

        if (featuredImage) {
            const uploadFeaturedImage = await uploadService.replaceUpload('CATEGORY', id, 'CATEGORY_FEATURED_IMAGE', featuredImage);

            updated.featuredImage = uploadFeaturedImage;
        }

        const transformedTranslations = updated.translations.map(t => ({
            lang: t.language.lang,
            name: t.name
        }));
        updated.translations = transformedTranslations;

        return updated;
    }


    async remove(id) {
        const existing = await prisma.category.findUnique({ where: { id } });
        if (!existing || existing.deletedAt)
            throw new HttpError(404, 'CATEGORY_NOT_FOUND', 'category_not_found', 'category');

        const ids = [id];

        const collect = async pid => {
            const children = await prisma.category.findMany({
                where: { parentId: pid, deletedAt: null },
                select: { id: true }
            });
            for (const c of children) {
                ids.push(c.id);
                await collect(c.id);
            }
        };

        await collect(id);

        await prisma.category.updateMany({
            where: { id: { in: ids } },
            data: { deletedAt: new Date() }
        });

        return true;
    }

    async show(id) {
        const category = await prisma.category.findFirst({
            where: { id, deletedAt: null },
            include: {
                translations: {
                    include: {
                        language: {
                            select: {
                                lang: true,
                            },
                        },
                    },
                },
                parent: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (!category) {
            throw new HttpError(404, 'CATEGORY_NOT_FOUND', 'category_not_found', 'category');
        }

        const uploads = await prisma.upload.findMany({
            where: {
                entityType: 'CATEGORY',
                entityId: category.id,
                uploadType: {
                    in: [
                        'CATEGORY_IMAGE',
                        'CATEGORY_FEATURED_IMAGE',
                    ],
                },
            },
            select: {
                id: true,
                filename: true,
                originalName: true,
                filepath: true,
                mimetype: true,
                size: true,
                uploadType: true,
                entityType: true,
                entityId: true,
                cdnUrl: true,
                storagePath: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        const image = uploads.find(
            upload => upload.uploadType === 'CATEGORY_IMAGE'
        );

        const featuredImage = uploads.find(
            upload => upload.uploadType === 'CATEGORY_FEATURED_IMAGE'
        );

        return {
            id: category.id,
            name: category.name,

            type: category.type,

            level: category.level,
            parentId: category.parentId,

            parent: category.parent
                ? {
                    id: category.parent.id,
                    name: category.parent.name,
                }
                : null,

            isActive: category.isActive,

            bgColor1: category.bgColor1,
            bgColor2: category.bgColor2,
            gradientText: category.gradientText,

            translations: category.translations.map(translation => ({
                lang: translation.language.lang,
                name: translation.name,
            })),

            image: image
                ? {
                    id: image.id,
                    url: image.cdnUrl,
                    filename: image.filename,
                    originalName: image.originalName,
                    mimetype: image.mimetype,
                    size: image.size,
                    storagePath: image.storagePath,
                }
                : null,

            featuredImage: featuredImage
                ? {
                    id: featuredImage.id,
                    url: featuredImage.cdnUrl,
                    filename: featuredImage.filename,
                    originalName: featuredImage.originalName,
                    mimetype: featuredImage.mimetype,
                    size: featuredImage.size,
                    storagePath: featuredImage.storagePath,
                }
                : null,

            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
        };
    }

    async updatePosition(id, newPosition) {
        const category = await prisma.category.findFirst({
            where: { id, deletedAt: null },
            select: { id: true, position: true, parentId: true }
        });

        if (!category) {
            throw new HttpError(404, 'CATEGORY_NOT_FOUND', 'category_not_found', 'category');
        }

        const oldPosition = category.position;

        // Nothing to change
        if (oldPosition === newPosition) {
            return { id: category.id, position: category.position };
        }

        // Get all sibling categories
        const siblings = await prisma.category.findMany({
            where: { parentId: category.parentId, deletedAt: null },
            select: { id: true, position: true },
            orderBy: { position: 'asc' }
        });

        if (siblings.length === 0) {
            throw new HttpError(400, 'NO_SIBLINGS_FOUND', 'no_siblings_found', 'category');
        }

        // Maximum allowed position
        const maxPosition = siblings.length;
        if (newPosition > maxPosition) {
            throw new HttpError(400, 'INVALID_POSITION', 'invalid_position', 'category');
        }

        const updatedCategory = await prisma.$transaction(async (tx) => {
            // Moving category UP
            // Example: 4 -> 2
            //
            // 2 -> 3
            // 3 -> 4
            if (newPosition < oldPosition) {
                await tx.category.updateMany({
                    where: { parentId: category.parentId, deletedAt: null, position: { gte: newPosition, lt: oldPosition } },
                    data: { position: { increment: 1 } }
                });
            }

            // Moving category DOWN
            // Example: 2 -> 4
            //
            // 3 -> 2
            // 4 -> 3
            if (newPosition > oldPosition) {
                await tx.category.updateMany({
                    where: { parentId: category.parentId, deletedAt: null, position: { gt: oldPosition, lte: newPosition } }, 
                    data: { position: { decrement: 1 } }
                });
            }

            // Finally update selected category
            return await tx.category.update({
                where: { id: category.id },
                data: { position: newPosition },
                select: { id: true, name: true, parentId: true, position: true, level: true }
            });
        });

        return updatedCategory;
    }
}

export default new LevelCategoryService();
