import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../../../config/db.config.js';
import emailService from '../../../common/services/email.service.js';
import HttpError from '../../../common/errors/http.error.js';

class AuthService {

  formatPermissions(rolePermissions){
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

  async login({ email, password , fcmToken}) {
    const user = await prisma.user.findFirst({
      where: { email },
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
    
    if (!user || !user.isActive || !user.password) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'invalid_credentials','auth');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'invalid_credentials','auth');
    }

    let isVerified = null;

    if (user.roleId === 4) {
      const podcasterProfile = await prisma.podcasterProfile.findUnique({
        where: { userId: user.id },
        select: { isVerified: true }
      });

      isVerified = podcasterProfile?.isVerified ?? false;
    }

    if (fcmToken) {
      await prisma.user.update({
        where: { id: user.id },
        data: { fcmToken },
      });
    }

    const token = jwt.sign(
      { id: user.id, roleId: user.roleId , tokenVersion: user.tokenVersion,},
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    const permissions = this.formatPermissions(user.role.permissions);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
        roleId: user.roleId,
        roleName : user?.role?.name || "",
        permissions : permissions || {},
        ...(user.roleId === 4 && { isVerified })
      },
    };
  }

  async forgotPassword({ email }, lang = 'en') {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      return; // silent success (security)
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: expiry,
      },
    });

    await emailService.sendResetPasswordEmail(email, rawToken, lang);
  }

  async resetPassword({ token, newPassword }) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: { gte: new Date() },
      },
    });

    if (!user) {
      throw new HttpError(401, 'INVALID_OR_EXPIRED_TOKEN','invalid_or_expired_token','auth');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
  }

  async logout(userId) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        tokenVersion: { increment: 1 },
        fcmToken: null
      },
    });

   return true;

  }

  async updateLanguage(customerId, lang) {
    const langRecord = await prisma.language.findUnique({ where: { lang } });
    
    if (!langRecord) throw new HttpError(400, 'INVALID_LANGUAGE', 'invalid_language', 'auth');

    const updatedCustomer = await prisma.user.update({
      where: { id: customerId },
      data: { languageId: langRecord.id },
    });

    return true;
  }
}

export default new AuthService();
