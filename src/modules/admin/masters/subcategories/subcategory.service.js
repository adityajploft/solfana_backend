import prisma from '../../../../config/db.config.js';
import HttpError from '../../../../common/errors/http.error.js';
import { activeOnly } from '../../../../common/utils/isDeletedHelper.js';

class SubCategoryService {
  /* ---------------- HELPER ---------------- */

  async getLanguageId(langCode) {
    const language = await prisma.language.findUnique({
      where: { lang: langCode },
      select: { id: true },
    });

    if (!language) {
      throw new HttpError(400, 'LANGUAGE_NOT_FOUND', 'language_not_found', 'common');
    }

    return language.id;
  }

  async ensureDefaultTranslation(translations, name) {
    if (translations.length > 0) return translations;

    const defaultLang = await prisma.language.findFirst({
      where: { isDefault: true, isActive: true },
      select: { lang: true },
    });

    if (!defaultLang) {
      throw new HttpError(500, 'DEFAULT_LANGUAGE_NOT_SET', 'default_language_not_set', 'common');
    }

    return [{ lang: defaultLang.lang, name }];
  }

  // CREATE SUB_CATEGORY
  async create(data) {
    const name = data.name?.trim();
    const parentId = data.parentId?.trim();
    if (!data.type) {
      throw new HttpError(400, 'TYPE_REQUIRED', 'type_required', 'category');
    }

    const type = data.type.trim();
    const translations = data.translations || [];

    const exists = await prisma.category.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        parentId,
        type,
        deletedAt: null,
      },
    });

    // Restore if soft-deleted
    if (exists?.deletedAt) {
      // Pre-fetch language IDs to avoid multiple queries
      const langMap = new Map();
      for (const t of translations) {
        langMap.set(t.lang, await this.getLanguageId(t.lang));
      }

      return await prisma.category.update({
        where: { id: exists.id },
        data: {
          deletedAt: null,
          isActive: data.isActive ?? true,
          parentId,
          translations: {
            upsert: translations.map(t => ({
              where: {
                id_languageId: {
                  id: exists.id,
                  languageId: langMap.get(t.lang),
                },
              },
              update: { name: t.name },
              create: {
                name: t.name,
                language: {
                  connect: { id: langMap.get(t.lang) },
                },
              },
            })),
          },
        },
        include: { 
          translations: { 
            include: { language: { select: { lang: true } } } 
          } 
        },
      });
    }

    if (exists) {
      throw new HttpError(409, 'SUB_CATEGORY_EXISTS', 'sub_category_exists', 'subcategory');
    }

    // Add default language if no translations provided
    if (translations.length === 0) {
      const defaultLang = await prisma.language.findFirst({
        where: { isDefault: true, isActive: true },
        select: { lang: true },
      });

      if (!defaultLang) {
        throw new HttpError(500, 'DEFAULT_LANGUAGE_NOT_SET', 'default_language_not_set', 'common');
      }

      translations.push({
        lang: defaultLang.lang,
        name,
      });
    }

    return prisma.category.create({
      data: {
        name,
        parentId,
        type,
        isActive: data.isActive ?? true,
        translations: {
          create: translations.map(t => ({
            name: t.name,
            language: {
              connect: { lang: t.lang },
            },
          })),
        },
      },
      include: {
        translations: {
          include: { language: { select: { lang: true } } },
        },
      },
    });
  }

  // GET ALL SUB_CATEGORIES
  async index(type, lang) {
    const subCategories = await prisma.category.findMany({
      where: activeOnly({
        type,
        deletedAt: null,
        parentId: { not: null },
      }),
      orderBy: { createdAt: 'desc' }, // Better than 'id'
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            translations: {
              where: { language: { lang } },
              select: { name: true },
            },
          },
        },
        translations: {
          select: {
            name: true,
            language: { select: { lang: true } },
          },
        },
      },
    });

    return subCategories.map((subCategory) => ({
      id: subCategory.id,
      name: subCategory.name,
      parentId: subCategory.parentId,
      categoryName: subCategory.parent.translations[0]?.name ?? subCategory.parent.name,
      translations: subCategory.translations.map((t) => ({
        name: t.name,
        lang: t.language.lang,
      })),
      isActive: subCategory.isActive,
      createdAt: subCategory.createdAt,
      updatedAt: subCategory.updatedAt,
    }));
  }

  // GET SUB_CATEGORY BY ID
  async show(id, lang) {
    const subCategory = await prisma.category.findUnique({
      where: activeOnly({ id }),
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            translations: {
              where: { language: { lang } },
              select: { name: true },
            },
          },
        },
        translations: {
          select: {
            name: true,
            language: { select: { lang: true } },
          },
        },
      },
    });

    if (!subCategory) {
      throw new HttpError(404, 'SUB_CATEGORY_NOT_FOUND', 'sub_category_not_found', 'subcategory');
    }

    // Find translation for requested language
    const translation = subCategory.translations.find(t => t.language.lang === lang);

    return {
      id: subCategory.id,
      name: translation?.name || subCategory.name,
      type: subCategory.type,
      parentId: subCategory.parentId,
      categoryName: subCategory.parent.translations[0]?.name ?? subCategory.parent.name,
      translations: subCategory.translations.map((t) => ({
        name: t.name,
        lang: t.language.lang,
      })),
      isActive: subCategory.isActive,
    };
  }

  // UPDATE SUB_CATEGORY
  async update(id, data) {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new HttpError(404, 'CATEGORY_NOT_FOUND', 'category_not_found', 'category');
    }

    const name = data.name?.trim();
    const type = data.type ?? category.type; // Don't trim enum values
    const parentId = data.parentId !== undefined ? data.parentId : category.parentId;

    // Only check for duplicates if name or parentId is changing
    if ((name && name !== category.name) || (data.parentId !== undefined && data.parentId !== category.parentId)) {
      const duplicate = await prisma.category.findFirst({
        where: {
          name: { equals: name ?? category.name, mode: 'insensitive' },
          parentId: parentId,
          type,
          deletedAt: null,
          NOT: { id },
        },
      });

      if (duplicate) {
        throw new HttpError(409, 'CATEGORY_EXISTS', 'category_exists', 'category');
      }
    }

    // Handle translations
    const translations = data.translations || [];

    if (translations.length > 0) {
      await Promise.all(
        translations.map(async (t) => {
          const languageId = await this.getLanguageId(t.lang);

          return prisma.categoryTranslation.upsert({
            where: {
              categoryId_languageId: {
                categoryId: id,
                languageId,
              },
            },
            update: { name: t.name },
            create: {
              name: t.name,
              category: { 
                connect: { id },
              },
              language: {
                connect: { id: languageId },
              },
            },
          });
        })
      );
    }

    return prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(data.type && { type: data.type }), // ✅ Added: allow type update
        ...(data.parentId !== undefined && { parentId: data.parentId }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        translations: {
          include: { language: { select: { lang: true } } },
        },
      },
    });
  }

  // DELETE SUB_CATEGORY
  async remove(id) {
    const subCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!subCategory) {
      throw new HttpError(404, 'SUB_CATEGORY_NOT_FOUND', 'sub_category_not_found', 'subcategory');
    }

    // Soft delete
    return await prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export default new SubCategoryService();