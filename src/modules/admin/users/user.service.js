import prisma from '../../../config/db.config.js';
import HttpError from '../../../common/errors/http.error.js';
import bcrypt from 'bcrypt';
import { activeOnly } from '../../../common/utils/isDeletedHelper.js';
import uploadService from '../uploads/upload.service.js';

class UserService {
  /* ================= ADMIN ================= */

  async create(dto, file) {
    const email = dto.email.toLowerCase();

    const emailExists = await prisma.user.findUnique({ where: { email } });
    if (emailExists) throw new HttpError(400, 'EMAIL_EXISTS', 'email_exists', 'user');

    const roleId = Number(dto.roleId);
    if (isNaN(roleId)) {
      throw new HttpError(400, 'INVALID_ROLE_ID', 'invalid_role_id', 'user');
    }

    if (dto.phone) {
      const phoneExists = await prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (phoneExists) throw new HttpError(400, 'PHONE_EXISTS', 'phone_exists', 'user');
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!role) throw new HttpError(400, 'INVALID_ROLE_ID', 'invalid_role_id', 'user');

    if (roleId === 1) {
      const superAdmin = await prisma.user.findFirst({
        where: { roleId: 1 },
      });
      if (superAdmin) {
        throw new HttpError(400, 'SUPER_ADMIN_EXISTS', 'super_admin_exists', 'user');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: dto.name,
        phone: dto.phone,
        roleId: roleId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    if (file) {
      await uploadService.saveUpload({
        file,
        uploadType: 'PROFILE_IMAGE',
        entityType: 'USER',
        entityId: user.id,
      });
    }

    return { data: user };
  }

  async index({ page = 1, limit = 10, search = '' }) {
    page = Number(page);
    limit = Number(limit);

    const skip = (page - 1) * limit;

    const whereCondition = {
      ...activeOnly({
        roleId: { notIn: [1, 2, 4] },
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },

          // ✅ NEW: role name search
          {
            role: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereCondition,
        include: { role: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where: whereCondition }),
    ]);

    const uploads = await prisma.upload.findMany({
      where: {
        entityType: 'USER',
        uploadType: 'PROFILE_IMAGE',
        entityId: { in: users.map((u) => u.id) },
        isActive: true,
      },
    });

    const usersWithImage = users.map((user) => {
      const image = uploads.find((u) => u.entityId === user.id);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        languageId: user.languageId,
        isActive: user.isActive,

        profileImage: image
          ? {
            id: image.id,
            filename: image.filename,
            cdnUrl: image.cdnUrl,
            storagePath: image.storagePath,
          }
          : null,
      };
    });


    return {
      records: usersWithImage,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }


  async show(id) {
    const user = await prisma.user.findUnique({
      where: activeOnly({ id }),
      include: { role: true },
    });    

    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'user_not_found', 'user');

    const profileImage = await prisma.upload.findFirst({
      where: {
        entityType: 'USER',
        uploadType: 'PROFILE_IMAGE',
        entityId: user.id,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc', // latest image
      },
    });

    if (profileImage) {
      user.profileImage = profileImage.cdnUrl;
    } else {
      user.profileImage = null;
    }

    return { data: user };
  }

  async update(id, dto, file) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'user_not_found', 'user');

    let roleId = undefined;
    if (dto.roleId !== undefined) {
      roleId = Number(dto.roleId);
      if (isNaN(roleId)) {
        throw new HttpError(400, 'INVALID_ROLE_ID', 'invalid_role_id', 'user');
      }
    }

    const roleExists = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!roleExists) {
      throw new HttpError(400, 'ROLE_NOT_FOUND', 'role_not_found', 'user');
    }

    if (user.roleId === 1 && roleId && roleId !== 1) {
      throw new HttpError(400, 'CANNOT_CHANGE_SUPER_ADMIN_ROLE', 'cannot_change_super_admin_role', 'user');
    }

    if (dto.email && dto.email !== user.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (emailExists) throw new HttpError(400, 'EMAIL_EXISTS', 'email_exists', 'user');
    }

    if (dto.phone && dto.phone !== user.phone) {
      const phoneExists = await prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (phoneExists) throw new HttpError(400, 'PHONE_EXISTS', 'phone_exists', 'user');
    }

    if (roleId === 1) {
      const superAdmin = await prisma.user.findFirst({
        where: { roleId: 1, NOT: { id } },
      });
      if (superAdmin) {
        throw new HttpError(400, 'SUPER_ADMIN_EXISTS', 'super_admin_exists', 'user');
      }
    }

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...dto,
        ...(roleId !== undefined && { roleId }),
      },
    });

    if (file) {
      await uploadService.replaceUpload(
        'USER',
        id,
        'PROFILE_IMAGE',
        file
      );
    }

    return { data: updated };
  }

  async remove(id) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'user_not_found', 'user');

    if (user.roleId === 1) {
      throw new HttpError(400, 'CANNOT_DELETE_SUPER_ADMIN', 'cannot_delete_super_admin', 'user');
    }

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return {};
  }


}

export default new UserService();
