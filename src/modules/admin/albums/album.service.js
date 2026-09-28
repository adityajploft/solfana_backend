import prisma from '../../../config/db.config.js';
import HttpError from '../../../common/errors/http.error.js';
import { generateUniqueAlbumSlug } from '../../../common/utils/generateUniqueSlug.js';
import uploadService from '../uploads/upload.service.js';
import uploadsService from '../../../common/services/uploads.service.js';
import { notificationQueue } from '../../../common/queues/notification.queue.js';

class AlbumService {

  // CREATE ALBUM
  async create({ body, file, userId }) {
    let album;
    let upload;

    try {
      let { categoryIds, podcasterId, title, description, metaKeywords, isExplicit, ...rest } = body;

      // TOTAL DURATION
      const totalDuration = 0;

      // TITLE
      if (!title || typeof title !== 'string' || title.trim().length < 1) {
        throw new HttpError(400, 'TITLE_REQUIRED', 'title_required', 'album');
      }
      title = title.trim();

      // DESCRIPTION
      if (!description || typeof description !== 'string' || description.trim().length < 1) {
        throw new HttpError(400, 'DESCRIPTION_REQUIRED', 'description_required', 'album');
      }
      description = description.trim();

      // CHECK DUPLICATE ALBUM
      const existingAlbum = await prisma.album.findFirst({
        where: {
          title,
          deletedAt: null
        },
        select: {
          id: true
        }
      });

      if (existingAlbum) {
        throw new HttpError(400, 'ALBUM_ALREADY_EXISTS', 'album_already_exists', 'album');
      }

      // GENERATE SLUG
      const slug = await generateUniqueAlbumSlug(title);

      // COVER IMAGE
      if (!file) {
        throw new HttpError(400, 'COVER_IMAGE_REQUIRED', 'cover_image_required', 'album');
      }

      // CREATE ALBUM
      album = await prisma.album.create({
        data: {
          ...rest,

          title,
          description,

          isExplicit: isExplicit ?? false,

          metaKeywords: metaKeywords || null,

          slug,
          totalDuration,
          createdBy: userId,

          categories: {
            create: categoryIds.map((id) => ({
              category: {
                connect: {
                  id
                }
              }
            }))
          },

          podcaster: {
            connect: {
              id: podcasterId
            }
          }
        },

        include: {
          coverImage: true,

          podcaster: {
            select: {
              id: true,
              name: true
            }
          },

          categories: {
            include: {
              category: true
            }
          }
        }
      });

      // SAVE COVER IMAGE
      upload = await uploadService.saveUpload({
        file,
        uploadType: 'COVER_IMAGE',
        entityType: 'ALBUM',
        entityId: album.id
      });

      await prisma.album.update({
        where: { id: album.id },
        data: { coverImageId: upload.id }
      });

      // NOTIFICATION
      if (album.status === 'PUBLISHED') {
        await notificationQueue.add('new-content-published', { contentId: album.id, type: "album" });
      }

      if (album.status === 'PENDING_APPROVAL') {
        await prisma.albumPublishRequest.create({
          data: {
            albumId: album.id,
            requestedBy: userId
          }
        });
      }

      return await prisma.album.findUnique({
        where: { id: album.id },
        include: { 
          coverImage: true,
          podcaster: {
            select: {
              id: true,
              name: true
            }
          },
          categories: {
            include: {
              category: true
            }
          }
        }
      });
    } catch (error) {
      if (upload?.id) {
        try {
          await uploadsService.deleteUpload(upload.id);
        } catch (err) {
          console.error('Upload cleanup failed:', err.message);
        }
      }

      if (album?.id) {
        try {
          await prisma.album.update({
            where: { id: album.id },
            data: { deletedAt: new Date() }
          });
        } catch (err) {
          console.error('Album rollback failed:', err.message);
        }
      }

      throw error;
    }
  }

  async attachCoverImage(albumId, uploadId) {
    return prisma.album.update({
      where: { id: albumId },
      data: { coverImageId: uploadId },
    });
  }


  // LIST ALBUMS
  async index(lang, { page = 1, limit = 10, search = '',  currentUser}) {

    const skip = (page - 1) * limit;

    const whereCondition = {
      deletedAt: null
    };

    if (currentUser?.roleId === 4) {
      whereCondition.podcasterId = currentUser.id;
    }    

    if (typeof search !== 'string') {
      search = '';
    }

    search = search.trim();

    if (search.length > 0) {
      whereCondition.title = {
        contains: search,
        mode: 'insensitive'
      };
    }

    const albums = await prisma.album.findMany({
      where: whereCondition,

      include: {
        coverImage: true,
        podcaster: {
          select: {
            id: true,
            name: true
          }
        },
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },

      orderBy: {
        createdAt: 'desc'
      },

      skip,
      take: limit
    });

    const totalCount = await prisma.album.count({
      where: whereCondition
    });

    const records = albums.map((album) => ({
        id: album.id,
        type: album.type,
        slug: album.slug,

        isExplicit: album.isExplicit,

        podcasterId: album.podcasterId,
        podcasterName: album.podcaster?.name,
        categories: album.categories.map((c) => ({
          id: c.category.id,
          name: c.category.name
        })),
        title: album.title,
        description: album.description,

        metaKeywords: album.metaKeywords,
        coverImage: album.coverImage
          ? {
            id: album.coverImage.id,
            originalName: album.coverImage.originalName,
            cdnUrl: album.coverImage.cdnUrl
          }
          : null,
        status: album.status,
        totalDuration: album.totalDuration,

        publishAt: album.publishAt,
        publishedAt: album.publishedAt,

        createdAt: album.createdAt,
        updatedAt: album.updatedAt
    }));

    return {
      records,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }
  async show(id, lang) {
    const album = await prisma.album.findFirst({
      where: { id, deletedAt: null },
      include: {
        coverImage: true,
        categories: {
          include: {
            category: true
          }
        },
        podcaster: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!album) {
      throw new HttpError(404, 'ALBUM_NOT_FOUND', 'album_not_found', 'album');
    }

    return {
      id: album.id,
      slug: album.slug,
      type: album.type,

      podcasterId: album.podcasterId,
      podcasterName: album.podcaster?.name || null,

      coverImage: album.coverImage
        ? {
            id: album.coverImage.id,
            originalName: album.coverImage.originalName,
            cdnUrl: album.coverImage.cdnUrl
          }
        : null,
      
      title: album.title,
      description: album.description,

      isExplicit: album.isExplicit,

      metaKeywords: album.metaKeywords,

      status: album.status,
      totalDuration: album.totalDuration,

      publishAt: album.publishAt,
      publishedAt: album.publishedAt,

      createdAt: album.createdAt,
      updatedAt: album.updatedAt,
      categories: album.categories.map((c) => ({
        id: c.category.id,
        name: c.category.name
      }))
    };
  }


  async update(id, data, userId) {
    const {categoryIds, totalDuration, title, description, metaKeywords, isExplicit, ...rest } = data;

    const album = await prisma.album.findFirst({
      where: { id, deletedAt: null }
    });

    if (!album) {
      throw new HttpError(404, 'ALBUM_NOT_FOUND', 'album_not_found', 'album');
    }

    // PREPARE UPDATE DATA
    const updateData = { ...rest };

    // TITLE
    if (title !== undefined) {
      if (!title || typeof title !== 'string' || title.trim().length < 1) {
        throw new HttpError(400, 'INVALID_TITLE', 'invalid_title', 'album');
      }
      const trimmedTitle = title.trim();

      // Check duplicate title
      const existingAlbum = await prisma.album.findFirst({
        where: { title: trimmedTitle, id: { not: id }, deletedAt: null },
        select: { id: true }
      });

      if (existingAlbum) {
        throw new HttpError(400, 'ALBUM_ALREADY_EXISTS', 'album_already_exists', 'album');
      }
      updateData.title = trimmedTitle;

      // Update slug if title changed
      if (trimmedTitle !== album.title) {
        updateData.slug = await generateUniqueAlbumSlug(trimmedTitle, id);
      }
    }

    // DESCRIPTION
    if (description !== undefined) {
      if (!description || typeof description !== 'string' || description.trim().length < 1) {
        throw new HttpError(400, 'INVALID_DESCRIPTION', 'invalid_description', 'album');
      }
      updateData.description = description.trim();
    }

    // META KEYWORDS
    if (metaKeywords !== undefined) {
      if (metaKeywords !== null && typeof metaKeywords !== 'string') {
        throw new HttpError(400, 'INVALID_META_KEYWORDS', 'invalid_meta_keywords', 'album');
      }

      updateData.metaKeywords = metaKeywords === null ? null : metaKeywords.trim();
    }

    // UPDATE CATEGORIES
    if (categoryIds !== undefined) {
      if (!Array.isArray(categoryIds)) {
        throw new HttpError(400, 'INVALID_CATEGORY', 'invalid_category', 'album');
      }

      await prisma.albumCategory.deleteMany({ where: { albumId: id }});

      if (categoryIds.length > 0) {
        await prisma.albumCategory.createMany({ data: categoryIds.map((categoryId) => ({ albumId: id, categoryId })) });
      }
    }

    if (isExplicit !== undefined) {
      updateData.isExplicit = isExplicit ?? false;
    }

    if (updateData.status !== undefined && updateData.status === 'PENDING_APPROVAL') {
      const request = await prisma.albumPublishRequest.create({ 
        data: {
          albumId: album.id,
          requestedBy: userId
        }
      });
    }

    // UPDATE ALBUM
    return prisma.album.update({
      where: { id },
      data: updateData
    });
  }

  // DELETE ALBUM
  async remove(id) {
    const album = await prisma.album.findFirst({
      where: { id, deletedAt: null }
    });

    if (!album) {
      throw new HttpError(404, 'ALBUM_NOT_FOUND', 'album_not_found', 'album');
    }

    return prisma.album.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async showBySlug(slug, lang) {

    const album = await prisma.album.findFirst({
      where: {
        slug,
        deletedAt: null
      },
      include: {
        coverImage: true,
        categories: {
          include: {
            category: true
          }
        },
        podcaster: { select: { id: true, name: true }}
      }
    });

    if (!album) {
      throw new HttpError(
        404,
        "ALBUM_NOT_FOUND",
        "album_not_found",
        "album"
      );
    }

    return {
      id: album.id,
      slug: album.slug,
      type: album.type,
      status: album.status,
      coverImage: album.coverImage
        ? {
          id: album.coverImage.id,
          originalName: album.coverImage.originalName,
          cdnUrl: album.coverImage.cdnUrl
        }
        : null,

      title: album.title,
      description: album.description,
      publishAt: album.publishAt,
      isExplicit: album.isExplicit,

      metaKeywords: album.metaKeywords,

      categories: album.categories.map((c) => ({
        id: c.category.id,
        name: c.category.name
      })),
      podcasterId: album.podcasterId,
      podcasterName: album.podcaster?.name || null
    };
  }


  async publishAlbum(albumId, user) {

    const album = await prisma.album.findUnique({
      where: { id: albumId },

    });

    if (!album) {
      throw new HttpError(404, "ALBUM_NOT_FOUND", "album_not_found", "album");
    }

    const podcasterProfile = await prisma.podcasterProfile.findUnique({
      where: {
        userId: album.podcasterId
      },
      select: {
        isVerified: true
      }
    });

    const isVerified = podcasterProfile?.isVerified;

    if (user.roleId != 4 || (user.roleId == 4 && isVerified)) {
      const updatedAlbum = await prisma.album.update({
        where: { id: albumId },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date()
        }
      });

      // Send notifications
      await notificationQueue.add('new-content-published', { contentId: albumId, type: "album" });      

      return updatedAlbum;
    }

    const existingRequest = await prisma.albumPublishRequest.findFirst({
      where: {
        albumId,
        status: "PENDING"
      }
    });

    if (existingRequest) {
      throw new HttpError(
        400,
        "REQUEST_ALREADY_SENT",
        "request_already_sent",
        "album"
      );
    }

    await prisma.album.update({
      where: { id: albumId },
      data: { status: "PENDING_APPROVAL" }
    });

    await prisma.albumPublishRequest.deleteMany({ where: { albumId } });

    const request = await prisma.albumPublishRequest.create({
      data: {
        albumId,
        requestedBy: user.id
      }
    });
    return request;
  }

  async scheduleAlbum(albumId, publishAt, user) {

    const album = await prisma.album.findUnique({ where: { id: albumId } });

    if (!album) {
      throw new HttpError(404, "ALBUM_NOT_FOUND", "album_not_found", "album");
    }

    const podcasterProfile = await prisma.podcasterProfile.findUnique({
      where: { userId: album.podcasterId },
      select: { isVerified: true }
    });

    const isVerified = podcasterProfile?.isVerified;

    if (user.roleId == 4 && !isVerified) {
      throw new HttpError(403, "ONLY_VERIFIED_PODCASTER_CAN_SCHEDULE", "only_verified_podcaster_can_schedule", "album");
    }

    const updatedAlbum = await prisma.album.update({
      where: { id: albumId },
      data: {
        status: "SCHEDULED",
        publishAt: new Date(publishAt)
      }
    });

    return updatedAlbum;
  }
  async deleteSchedule(albumId) {

    const album = await prisma.album.findUnique({
      where: { id: albumId }
    });

    if (!album) {
      throw new HttpError(404, "ALBUM_NOT_FOUND", "album_not_found", "album");
    }

    if (album.status !== "SCHEDULED") {
      throw new HttpError(400, "ALBUM_NOT_SCHEDULED", "album_not_scheduled", "album");
    }

    const updatedAlbum = await prisma.album.update({
      where: { id: albumId },
      data: {
        status: "DRAFT",
        publishAt: null
      }
    });

    return updatedAlbum;
  }

  async getPublishRequests(lang, { page = 1, limit = 10, search = "", type="ALBUM"}) {

    const skip = (page - 1) * limit;

    if (typeof search !== 'string') {
      search = '';
    }

    search = search.trim();

    const typeCondition = type === "TRACK" ? { trackId: { not: null } } : { albumId: { not: null } };

    const searchCondition = search
      ? {
          OR: [
            {
              album: { title: { contains: search.trim(), mode: 'insensitive' } }
            },

            {
              track: { title: { contains: search.trim(), mode: 'insensitive' } }
            }
          ]
        }
      : {};

    const whereCondition = {...typeCondition, ...searchCondition };

    const requests = await prisma.albumPublishRequest.findMany({
        where: whereCondition,
        include: {
          album: {
            include: {
              coverImage: true,
              categories: {
                include: {
                  category: true
                }
              }
            }
          },
          track: {
            include: {
              album: {
                include: {
                  categories: {
                    include: {
                      category: true
                    }
                  }
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },

        orderBy: {
          createdAt: 'desc'
        },

        skip,
        take: limit
      });

    const statusPriority = {
      PENDING: 1,
      APPROVED: 2,
      REJECTED: 3
    };

    requests.sort((a, b) => statusPriority[a.status] - statusPriority[b.status]);

    const totalCount = await prisma.albumPublishRequest.count({
      where: whereCondition
    });

    const records = requests.map((req) => {

      if (req.albumId && req.album) {
        return {
          requestId: req.id,
          type: 'ALBUM',
          albumId: req.albumId,
          requestedAt: req.createdAt,
          status: req.status,
          actionAt: req.actionAt,

          podcaster: {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email
          },

          album: {
            id: req.album.id,
            slug: req.album.slug,
            type: req.album.type,

            title: req.album.title,
            description: req.album.description,

            isExplicit: req.album.isExplicit,

            categories: req.album.categories.map((c) => c.category.name),

            coverImage: req.album.coverImage?.cdnUrl || null,

            totalDuration: req.album.totalDuration,
            status: req.album.status
          }
        };
      }
      if (req.trackId && req.track) {

        return {
          requestId: req.id,
          type: 'TRACK',
          trackId: req.trackId,
          requestedAt: req.createdAt,
          status: req.status,
          actionAt: req.actionAt,

          podcaster: {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email
          },

          track: {
            id: req.track.id,

            title: req.track.title,
            description: req.track.description,
            trackNumber: req.track.trackNumber,
            durationSeconds: req.track.durationSeconds,
            status: req.track.status,
            isExplicit: req.track.isExplicit,

            album: {
              id: req.track.album.id,
              categories: req.track.album.categories.map((c) => c.category.name),
              title: req.track.album.title || ""
            }
          }
        };
      }

    }).filter(Boolean);

    return {
      records,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  async publishRequestAction(requestId, action, adminId) {

    if (!["approve", "reject"].includes(action)) {
      throw new HttpError(
        400,
        "INVALID_ACTION",
        "invalid_action",
        "album"
      );
    }
    const request = await prisma.albumPublishRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new HttpError(404, "REQUEST_NOT_FOUND", "request_not_found", "album");
    }

    // Handle Album Publish Request
    if (request.albumId) {
      if (action === "approve") {
        const updatedAlbum = await prisma.album.update({
          where: { id: request.albumId },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date()
          }
        });

        await prisma.albumPublishRequest.update({
          where: { id: requestId },
          data: {
            status: "APPROVED",
            approvedBy: adminId,
            actionAt: new Date()
          }
        });

        // Send Notifications
        await notificationQueue.add('new-content-published', { contentId: request.albumId, type: "album" });
      }

      if (action === "reject") {
        await prisma.album.update({
          where: { id: request.albumId },
          data: { status: "REJECTED" }
        });

        await prisma.albumPublishRequest.update({
          where: { id: requestId },
          data: {
            status: "REJECTED",
            approvedBy: adminId,
            actionAt: new Date()
          }
        });
      }
    }

    // Handle Track Publish Request
    if (request.trackId) {
      if (action === "approve") {
        await prisma.track.update({
          where: { id: request.trackId },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date()
          }
        });

        await prisma.albumPublishRequest.update({
          where: { id: requestId },
          data: {
            status: "APPROVED",
            approvedBy: adminId,
            actionAt: new Date()
          }
        });

        // Send Notifications
        await notificationQueue.add('new-content-published', { contentId: request.trackId, type: "track" });
      }

      if (action === "reject") {
        await prisma.track.update({
          where: { id: request.trackId },
          data: { status: "REJECTED" }
        });

        await prisma.albumPublishRequest.update({
          where: { id: requestId },
          data: {
            status: "REJECTED",
            approvedBy: adminId,
            actionAt: new Date()
          }
        });
      }
    }

    return {
      requestId,
      action
    };
  }

  async bulkPublishRequestAction(requestIds, action, adminId) {

    if (!["approve", "reject"].includes(action)) {
      throw new HttpError(
        400,
        "INVALID_ACTION",
        "invalid_action",
        "album"
      );
    }

    const requests = await prisma.albumPublishRequest.findMany({
      where: { id: { in: requestIds } }
    });

    if (!requests.length) {
      throw new HttpError(
        404,
        "REQUEST_NOT_FOUND",
        "request_not_found",
        "album"
      );
    }

    await Promise.all(
      requests.map(async (request) => {
        // Handle Album Publish Request
        if (request.albumId) {
          if (action === "approve") {
            await prisma.album.update({
              where: { id: request.albumId },
              data: {
                status: "PUBLISHED",
                publishedAt: new Date()
              }
            });

            // Send Notifications
            await notificationQueue.add('new-content-published', { contentId: request.albumId, type: "album" });
          }

          if (action === "reject") {
            await prisma.album.update({
              where: { id: request.albumId },
              data: {
                status: "REJECTED"
              }
            });
          }
        }

        // Handle Track Publish Request
        if (request.trackId) {
          if (action === "approve") {
            await prisma.track.update({
              where: { id: request.trackId },
              data: {
                status: "PUBLISHED",
                publishedAt: new Date()
              }
            });

            // Send Notifications
            await notificationQueue.add('new-content-published', { contentId: request.trackId, type: "track" });
          }

          if (action === "reject") {
            await prisma.track.update({
              where: { id: request.trackId },
              data: {
                status: "REJECTED"
              }
            });
          }
        }

        await prisma.albumPublishRequest.update({
          where: { id: request.id },
          data: {
            status: action === "approve" ? "APPROVED" : "REJECTED",
            approvedBy: adminId,
            actionAt: new Date()
          }
        });

      })
    );

    return {
      total: requests.length,
      action
    };
  }
}

export default new AlbumService();