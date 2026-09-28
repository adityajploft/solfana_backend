import prisma from '../../../config/db.config.js';
import HttpError from '../../../common/errors/http.error.js';
import bcrypt from 'bcrypt';

class ProfileService {

  formatPermissions(rolePermissions) {
    const permissions = {};

    rolePermissions.forEach((rp) => {
      const module = rp.permission.module;
      const action = rp.permission.action;

      if (!permissions[module]) {
        permissions[module] = {};
      }

      permissions[module][action] = true;
    });

    return permissions;
  };

  /* ================= USER ================= */
  async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'user_not_found', 'profile');
    }

    const profileUpload = await prisma.upload.findFirst({
      where: {
        entityType: 'USER',
        uploadType: 'PROFILE_IMAGE',
        entityId: userId,
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const permissions = this.formatPermissions(user.role.permissions);

    return {
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        profileImage: profileUpload?.cdnUrl || null,
        role: {
          id: user.role.id,
          name: user.role.name
        },
        permissions: permissions || {},
        createdAt: user.createdAt
      }
    };
  }

  async updateProfile(userId, dto, currentUserRoleId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'user_not_found', 'profile');

    /*Field Restriction */
    if (currentUserRoleId !== 1 && (dto.email || dto.roleId)) {
      throw new HttpError(403, 'EMAIL_ROLE_UPDATE_FORBIDDEN', 'email_role_update_forbidden', 'profile');
    }

    if (dto.phone && dto.phone !== user.phone) {
      const phoneExists = await prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (phoneExists) throw new HttpError(400, 'PHONE_EXISTS', 'phone_exists', 'profile');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: dto,
    });

    return { data: updated };
  }

  async changePassword(userId, dto) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'user_not_found', 'profile');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) throw new HttpError(400, 'CURRENT_PASSWORD_INCORRECT', 'current_password_incorrect', 'profile');

    if (dto.newPassword !== dto.confirmPassword) {
      throw new HttpError(400, 'PASSWORD_MISMATCH', 'password_mismatch', 'profile');
    }

    const sameAsOld = await bcrypt.compare(dto.newPassword, user.password);

    if (sameAsOld) {
      throw new HttpError(400, 'PASSWORD_SAME_AS_OLD', 'password_same_as_old', 'profile');
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { data: true };
  }
}

export default new ProfileService();