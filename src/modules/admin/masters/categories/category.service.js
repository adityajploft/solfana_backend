import prisma from '../../../../config/db.config.js';
import HttpError from '../../../../common/errors/http.error.js';
import { activeOnly } from '../../../../common/utils/isDeletedHelper.js';
import uploadsService from '../../../../common/services/uploads.service.js';

class CategoryService {
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

  /* ---------------- CRUD OPERATIONS ---------------- */

  // CREATE CATEGORY
  async create(data) {
    const { name, type = [], isActive = true } = data;

    // Check for existing category
    const exists = await prisma.category.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
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
          translations: {
            upsert: translations.map(t => ({
              where: {
                categoryId_languageId: {
                  categoryId: exists.id,
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
      throw new HttpError(409, 'CATEGORY_EXISTS', 'category_exists', 'category');
    }

    // Ensure at least default language translation exists
    const translations = await this.ensureDefaultTranslation(JSON.parse(data.translations) || [], name);

    return prisma.category.create({
      data: {
        name,
        type,
        isActive: isActive === "true" ? true : false,
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

  // GET ALL CATEGORIES
  async index(type, lang) {
    const categories = await prisma.category.findMany({
      where: {
        type,
        deletedAt: null,
        parentId: null,
      },
      orderBy: { position: 'asc' },
      include: {
        translations: {
          select: {
            name: true,
            language: { select: { lang: true } },
          },
        },
      },
    });

    return await Promise.all(
      categories.map(async (category) => {
        const image = await uploadsService.getUploadsByEntity(
          'CATEGORY',
          category.id,
          'CATEGORY_IMAGE'
        );
      
        return {
          id: category.id,
          type: category.type,
          // name: category.name,
          image: image[0] || null,
          translations: category.translations.map((t) => ({
            name: t.name,
            lang: t.language.lang,
          })),
          isActive: category.isActive,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
        };
      })
    );
  }

  // GET CATEGORY BY ID
  async show(id, lang) {
    const category = await prisma.category.findUnique({
      where: activeOnly({ id }),
      include: {
        translations: {
          select: {
            name: true,
            language: { select: { lang: true } },
          },
        },
        subCategories: true,
      },
    });

    if (!category) {
      throw new HttpError(404, 'CATEGORY_NOT_FOUND', 'category_not_found', 'category');
    }

    // Find translation for requested language
    const translation = category.translations.find(t => t.language.lang === lang);

    const image = await uploadsService.getUploadsByEntity(
      'CATEGORY',
      category.id,
      'CATEGORY_IMAGE'
    );
    
    return {
      id: category.id,
      type: category.type,
      image: image[0] ?? null,
      subCategories: category.subCategories,
      name: translation?.name || category.name,
      translations: category.translations.map((t) => ({
        name: t.name,
        lang: t.language.lang,
      })),
      isActive: category.isActive,
    };
  }

  // UPDATE CATEGORY
  async update(id, data) {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new HttpError(404, 'CATEGORY_NOT_FOUND', 'category_not_found', 'category');
    }

    const name = data.name?.trim();

    // Only check for duplicates if name is changing
    if (name && name !== category.name) {
      const duplicate = await prisma.category.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          NOT: { id },
        },
      });

      if (duplicate?.deletedAt) {
        // Pre-fetch language IDs to avoid multiple queries
        const langMap = new Map();
        for (const t of translations) {
          langMap.set(t.lang, await this.getLanguageId(t.lang));
        }
  
        return await prisma.category.update({
          where: { id: duplicate.id },
          data: {
            deletedAt: null,
            isActive: data.isActive ?? true,
            translations: {
              upsert: translations.map(t => ({
                where: {
                  categoryId_languageId: {
                    categoryId: duplicate.id,
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
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        translations: {
          include: { language: { select: { lang: true } } },
        },
      },
    });
  }

  // DELETE CATEGORY
  async remove(id) {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new HttpError(404, 'CATEGORY_NOT_FOUND', 'category_not_found', 'category');
    }

    // Soft delete
    return await prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export default new CategoryService();