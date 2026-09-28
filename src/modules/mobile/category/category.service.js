import prisma from '../../../config/db.config.js';
import HttpError from '../../../common/errors/http.error.js';
import { getPagination } from '../../../common/utils/pagination.js';
import CategoryResource from '../resources/category.resource.js';
import PodcasterResource from '../resources/podcaster.resource.js';
import AlbumResource from '../resources/album.resource.js';
import { buildRecommendedAlbums, buildExploreAlbums } from '../../../common/utils/analytics.helper.js';
import { title } from 'process';

class MobileCategoryService {

  // helpers

  pickTranslation(list, lang, fallback) {
    const row = list.find(x => x.language.lang === lang);
    return row?.name || fallback;
  }

  pickImage(uploads) {
    if (!uploads || !uploads.length) return null;
    const img = uploads.find(
      u => u.uploadType === 'CATEGORY_IMAGE' && u.isActive
    );
    return img?.cdnUrl || img?.filepath || null;
  }


  async search(query, languageId) {
    const { search } = query;

    const browse_category_type = ["Audiobook", "Podcast"];
    const categoryWhere = {
      isActive: true,
      parentId: null,
      ...(search && {
        translations: {
          some: {
            languageId,
            name: {
              contains: search,
              mode: "insensitive"
            }
          }
        }
      })
    };

    const albumWhere = {
      status: "PUBLISHED",
      ...(search && {
        OR: [
          {
            title: {
              contains: search,
              mode: "insensitive"
            }
          },
          {
            description: {
              contains: search,
              mode: "insensitive"
            }
          },
          {
            metaKeywords: {
              contains: search,
              mode: "insensitive"
            }
          },
          {
            podcaster: {
              name: {
                contains: search,
                mode: "insensitive"
              }
            }
          },
          {
            categories: {
              some: {
                category: {
                  translations: {
                    some: {
                      languageId,
                      name: {
                        contains: search,
                        mode: "insensitive"
                      }
                    }
                  }
                }
              }
            }
          }
        ]
      })
    };

    const podcasterWhere = {
      roleId: 4,
      ...(search && {
        name: {
          contains: search,
          mode: "insensitive"
        }
      })
    };

    const [
      categories,
      albums,
      podcasters
    ] = await Promise.all([
      prisma.category.findMany({
        where: categoryWhere,
        include: {
          translations: {
            where: { languageId },
            include: { language: true }
          }
        },
        orderBy: { position: 'asc' },
        take: 10
      }),

      prisma.album.findMany({
        where: albumWhere,
        select: {
          id: true,
          title: true,
          description: true,
          metaKeywords: true,
          isExplicit: true,
          coverImage: {
            select: {
              cdnUrl: true
            }
          },
          podcaster: {
            select: {
              name: true
            }
          }
        },
        take: 10
      }),

      prisma.user.findMany({
        where: podcasterWhere,
        select: {
          id: true,
          name: true,
          profileImage: true
        },
        take: 10
      })
    ]);

    return {
      browse_category_type,
      Genres: {
        categories: await CategoryResource.cardCollection(categories),
        albums: AlbumResource.cardCollection(albums),
        podcasters: await PodcasterResource.cardCollection(podcasters)
      }

    };
  }


  // Genre List (level 2) Logic

  async genres(query, lang) {
    const { page, limit, skip } = getPagination(query);
    const { search } = query;

    const where = {
      parentId: null,
      isActive: true,
      deletedAt: null,
      ...(search && {
        translations: {
          some: {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        }
      })
    };

    const [rows, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: { position: 'asc' },
        skip,
        take: limit,
        include: {
          translations: {
            include: { language: true }
          }
        }
      }),

      prisma.category.count({ where })
    ]);

    const genres = rows.map(r => ({
      id: r.id,
      name: this.pickTranslation(
        r.translations,
        lang,
        r.name
      )
    }));

    return {
      genres: genres,
      pagination: {
        page,
        limit,
        total
      }
    };
  }

  async getChildren(categoryId, query, lang) {
    const { page, limit, skip } = getPagination(query);
    const { search } = query;

    const where = {
      parentId: categoryId,
      isActive: true,
      deletedAt: null,
      ...(search && {
        translations: {
          some: {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        }
      })
    };

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { position: 'asc' },
        include: {
          translations: {
            include: { language: true }
          }
        }
      }),

      prisma.category.count({ where })
    ]);

    const categoryIds = categories.map(c => c.id);

    const albums = await prisma.album.findMany({
      where: {
        categories: {
          some: {
            categoryId: {
              in: categoryIds
            }
          }
        },
        deletedAt: null,
        status: 'PUBLISHED'
      },
      include: {
        coverImage: true,
        categories: {
          include: {
            category: true
          }
        }
      }
    });

    const albumMap = {};

    for (const album of albums) {
      const albumCategories = album.categories || [];

      for (const albumCategory of albumCategories) {
        const catId = albumCategory.categoryId;

        if (!albumMap[catId]) {
          albumMap[catId] = [];
        }

        const exists = albumMap[catId].some(a => a.id === album.id);
        if (!exists) {
          albumMap[catId].push({
            id: album.id,
            type: album.type,
            title: album.title,
            isExplicit: album.isExplicit,
            coverImage: album.coverImage?.cdnUrl || null,
            totalDuration: album.totalDuration
          });
        }
      }
    }

    const formatted = categories.map(c => ({
      id: c.id,
      name: this.pickTranslation(
        c.translations,
        lang,
        c.name
      ),
      albums: albumMap[c.id] || []
    }));

    return {
      records: formatted,
      pagination: {
        page,
        limit,
        total
      }
    };
  }


  async genreContent(genreId, query, lang) {
    const { page, limit, skip } = getPagination(query);

    const genre = await prisma.category.findUnique({
      where: { id: genreId }
    });

    if (!genre) {
      throw new HttpError(404, 'GENRE_NOT_FOUND');
    }

    const where = {
      parentId: genreId,
      isActive: true,
      deletedAt: null
    };

    const [rows, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { position: 'asc' },
        include: {
          translations: { include: { language: true } }
        }
      }),
      prisma.category.count({ where })
    ]);

    return {
      podcasts: rows
        .filter(r => r.type === 'PODCAST')
        .map(r => ({
          id: r.id,
          name: this.pickTranslation(r.translations, lang, r.name)
        })),

      audiobooks: rows
        .filter(r => r.type === 'AUDIOBOOK')
        .map(r => ({
          id: r.id,
          name: this.pickTranslation(r.translations, lang, r.name)
        })),

      all: rows.map(r => ({
        id: r.id,
        name: this.pickTranslation(r.translations, lang, r.name)
      })),

      pagination: {
        page,
        limit,
        total
      }
    };
  }

  async browseByType(type, query, userId, langId) {
    const { page, limit, skip } = getPagination(query);
    const { search } = query;

    const categoryWhereCondition = {
      isActive: true, parentId: null, 
      ...(search && {
        translations: { some: { languageId: langId, name: { contains: search, mode: 'insensitive' } } }
      })
    };

    const categories = await prisma.category.findMany({
      where: categoryWhereCondition,
      include: {
        translations: { where: { languageId: langId }, select: { name: true } },
      },
      orderBy: { position: 'asc' },
      take: 10 
    });

    const browseCategories = await CategoryResource.cardCollection(categories);

    const recommendedData = await buildRecommendedAlbums({userId, langId, type, search,  limit, skip, paginate : true });
    const recommended = AlbumResource.cardCollection(recommendedData.data);

    const exploreData = await buildExploreAlbums({ type, langId, limit: 6 });
    const explore =  AlbumResource.cardCollection(exploreData.data);

    return {
      records: {
        browse: browseCategories, 
        recommended_for_you: recommended, 
        explore: explore 
      },
      pagination: {
        page,
        limit,
        total: recommendedData.total
      }
    };
  }
}

export default new MobileCategoryService();
