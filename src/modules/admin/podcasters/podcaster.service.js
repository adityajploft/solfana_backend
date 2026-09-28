import prisma from '../../../config/db.config.js';
import HttpError from '../../../common/errors/http.error.js';
import { activeOnly } from '../../../common/utils/isDeletedHelper.js';
import uploadService from '../uploads/upload.service.js';
import bcrypt from 'bcrypt';

class PodcasterService {

  // CREATE PODCASTER
  async create(data, file) {
    const name = data.name?.trim();
    const email = data.email?.trim();
    const phone = data.phone?.trim();
    const bio = data.bio?.trim();
    const isVerified = data.isVerified || false;
    
    const password = data.password;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if subcategory exists (including soft-deleted)
    const existingPodcaster = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
      },
    });

    // Restore if soft-deleted
    if (existingPodcaster?.deletedAt) {
      return await prisma.user.update({
        where: { id: existingPodcaster.id },
        data: {
          deletedAt: null,
          isActive: data.isActive ?? true,
        },
      });
    }

    if (existingPodcaster) {
      throw new HttpError(409, 'PODCASTER_EXISTS', 'podcaster_exists', 'podcaster');
    }

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        email,
        roleId: 4,
        isActive: data.isActive ?? true,
        password: hashedPassword,
        podcasterProfile: {
          create: {
            bio,
            isVerified,
          },
        },
      },
      include: {
        podcasterProfile: true,
      },
    });

    // Save Upload if file exists
    if (file) {
      await uploadService.saveUpload({
        file,
        entityType: 'USER',
        entityId: user.id,
        uploadType: 'PROFILE_IMAGE',
      });
    }

    return user;
  }

  // GET ALL SUB_CATEGORIES
  async index({ page = 1, limit = 10, search = '' }) {
    page = Number(page);
    limit = Number(limit);

    const skip = (page - 1) * limit;

    const whereCondition = {
      ...activeOnly({
        roleId: 4,
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [podcasters, total] = await Promise.all([
      prisma.user.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          podcasterProfile: {
            select: {
              id: true,
              isVerified: true,
              bio: true,
            },
          },
        },
      }),
      prisma.user.count({ where: whereCondition }),
    ]);

    const uploads = await prisma.upload.findMany({
      where: {
        entityType: 'USER',
        uploadType: 'PROFILE_IMAGE',
        entityId: { in: podcasters.map((p) => p.id) },
        isActive: true,
      },
    });

    const uploadMap = {};
    uploads.forEach((u) => {
      uploadMap[u.entityId] = u;
    });

    const formatted = podcasters.map((podcaster) => ({
      id: podcaster.id,
      name: podcaster.name,
      email: podcaster.email,
      phone: podcaster.phone,
      bio: podcaster.podcasterProfile?.bio || "",
      isActive: podcaster.isActive,
      isVerified: podcaster.podcasterProfile?.isVerified,
      profileImage: uploadMap[podcaster.id]
        ? {
          id: uploadMap[podcaster.id].id,
          filename: uploadMap[podcaster.id].filename,
          cdnUrl: uploadMap[podcaster.id].cdnUrl,
          storagePath: uploadMap[podcaster.id].storagePath,
        }
        : null,
      createdAt: podcaster.createdAt,
      updatedAt: podcaster.updatedAt,
    }));

    return {
      records: formatted,   
      pagination: {         
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }


  // GET PODCASTER BY ID
  async show(id, lang) {
    const podcaster = await prisma.user.findUnique({
      where: activeOnly({ id }),
      include: {
        podcasterProfile: {
          select: {
            id: true,
            isVerified: true,
            bio: true,
          },
        },
      },
    });

    if (!podcaster) {
      throw new HttpError(404, 'PODCASTER_NOT_FOUND', 'podcaster_not_found', 'podcaster');
    }


    return {
      id: podcaster.id,
      name: podcaster?.name || "",
      email: podcaster.email || "",
      phone: podcaster.phone || "",
      bio: podcaster.podcasterProfile.bio || "",
      isVerified: podcaster.podcasterProfile.isVerified,
      isActive: podcaster.isActive,
    };
  }

  // UPDATE PODCASTER
  async update(id, data, file) {
    const userId = id;

    // 1. Check if the user exists and is not soft-deleted
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: { podcasterProfile: true },
    });

    if (!user) {
      throw new HttpError(404, 'PODCASTER_NOT_FOUND', 'podcaster_not_found', 'podcaster');
    }

    // 2. Duplicate Email Check
    const email = data.email?.trim();
    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const duplicate = await prisma.user.findFirst({
        where: {
          email: { equals: email, mode: 'insensitive' },
          NOT: { id: userId } // Exclude the current user
        },
      });
      if (duplicate) {
        throw new HttpError(409, 'EMAIL_EXISTS', 'email_already_in_use', 'common');
      }
    }

    let hashedPassword;

    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    // 3. Perform the Update
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name?.trim() ?? user.name,
        email: email ?? user.email,
        phone: data.phone?.trim() ?? user.phone,
        isActive: data.isActive ?? user.isActive,

        ...(hashedPassword && { password: hashedPassword }),

        // Nested profile update
        podcasterProfile: {
          upsert: {
            create: {
              bio: data.bio ?? "",
              isVerified: data.isVerified ?? false,
            },
            update: {
              bio: data.bio ?? user.podcasterProfile?.bio,
              isVerified:
                data.isVerified ?? user.podcasterProfile?.isVerified,
            },
          },
        },
      },
      include: {
        podcasterProfile: {
          select: { bio: true, isVerified: true },
        },
      },
    });

    if (file) {
      await uploadService.replaceUpload(
        'USER',
        userId,
        'PROFILE_IMAGE',
        file,
      );
    }
    return updatedUser;
  }

  // DELETE PODCASTER
  async remove(id) {
    const podcaster = await prisma.user.findUnique({
      where: { id },
    });

    if (!podcaster) {
      throw new HttpError(404, 'PODCASTER_NOT_FOUND', 'podcaster_not_found', 'podcaster');
    }

    // Soft delete
    return await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export default new PodcasterService();