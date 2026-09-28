import HttpError from '../../../common/errors/http.error.js';
import emailService from '../../../common/services/email.service.js';
import prisma from '../../../config/db.config.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import notificationSettingsService from '../notification-settings/notification-settings.service.js';
import CustomerResource from '../resources/customer.resource.js'
import { addFreeSubscriptionPlan, getAdminData } from '../../../common/utils/helper.js';
import { notificationQueue } from '../../../common/queues/notification.queue.js';
import { config } from '../../../config/index.js';

class MobileAuthService {

  async loginWithEmail(email, lang = 'en') {
    const language = ['en', 'fr'].includes(lang) ? lang : 'en';

    const otp = process.env.NODE_ENV === 'development' ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    await prisma.customerOtp.deleteMany({
      where: { email },
    });

    await prisma.customerOtp.create({
      data: { email, otp, expiresAt },
    });

    // Send OTP email
    await emailService.sendOtp(email, otp, language);

    return {
      success: true
    };
  }

  async verifyLoginOtp(dto) {
    const otpRecord = await prisma.customerOtp.findFirst({
      where: {
        email: dto.email,
        otp: dto.otp,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otpRecord) {
      throw new HttpError(400, 'INVALID_OTP', 'invalid_otp', 'auth');
    }

    await prisma.customerOtp.delete({
      where: { id: otpRecord.id },
    });

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        profileImage: true,
        languageId: true,
        isActive: true,
      }
    });

    // If customer exists, proceed with login
    if (existingCustomer) {
      if (dto.firebaseToken) {
        await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: { fcmToken: dto.firebaseToken },
        });
      }

      await prisma.customerSession.updateMany({
        where: {
          customerId: existingCustomer.id,
          isActive: true
        },
        data: { isActive: false },
      });

      const session = await prisma.customerSession.create({
        data: {
          customerId: existingCustomer.id,
          deviceId: dto.deviceId,
        },
      });

      // Generate token
      const token = jwt.sign(
        {
          sub: existingCustomer.id,
          sessionId: session.id,
          deviceId: dto.deviceId,
          type: 'CUSTOMER',
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      return {
        accessToken: token,
        customer: existingCustomer,
        userExists: true,
        message: 'LOGIN_SUCCESS'
      };
    } else {
      // Customer doesn't exist - generate temporary token with signup data
      const tempToken = jwt.sign(
        {
          email: dto.email,
          deviceId: dto.deviceId,
          firebaseToken: dto.firebaseToken || null,
          phone: null,
          type: 'TEMP_SIGNUP',
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' } // 1 hour expiry for signup completion
      );

      return {
        accessToken: tempToken,
        email: dto.email,
        userExists: false,
        message: 'CONTINUE_SIGNUP'
      };
    }
  }

  async signupPhone(tokenData, phoneNumber) {
    if (tokenData.type !== 'TEMP_SIGNUP') {
      throw new HttpError(400, 'INVALID_SIGNUP_FLOW', 'invalid_signup_flow', 'auth');
    }

    const email = tokenData.email;

    if (!email) {
      throw new HttpError(400, 'EMAIL_REQUIRED', 'email_required', 'auth');
    }

    const existingCustomerWithPhone = await prisma.customer.findFirst({
      where: {
        phone: phoneNumber,
        email: { not: email }
      },
    });

    if (existingCustomerWithPhone) {
      throw new HttpError(400, 'PHONE_ALREADY_EXISTS', 'phone_already_exists', 'auth');
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { email },
    });

    if (existingCustomer) {
      throw new HttpError(400, 'EMAIL_ALREADY_EXISTS', 'email_already_exists', 'auth');
    }


    const newTokenPayload = {
      email: tokenData.email,
      deviceId: tokenData.deviceId,
      firebaseToken: tokenData.firebaseToken || null,
      phone: phoneNumber,
      type: 'TEMP_SIGNUP',
    };

    const updatedTempToken = jwt.sign(
      newTokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return {
      accessToken: updatedTempToken,
      email,
      phone: phoneNumber,
      success: true
    };
  }

  async createPassword(tokenData, passwordData, lang) {
    const language = ['en', 'fr'].includes(lang) ? lang : 'fr';
    if (tokenData.type !== 'TEMP_SIGNUP') {
      throw new HttpError(400, 'INVALID_SIGNUP_FLOW', 'invalid_signup_flow', 'auth');
    }

    const { email, deviceId, phone, firebaseToken } = tokenData;

    if (!email) {
      throw new HttpError(400, 'EMAIL_REQUIRED', 'email_required', 'auth');
    }

    if (!phone) {
      throw new HttpError(400, 'PHONE_REQUIRED', 'phone_required', 'auth');
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { email },
    });

    if (existingCustomer) {
      throw new HttpError(400, 'EMAIL_ALREADY_EXISTS', 'email_already_exists', 'auth');
    }

    // const DEFAULT_PROFILE_IMAGE = `${process.env.APP_URL}/uploads/user-profile/1.jpg`;

    // Hash password
    const hashedPassword = await bcrypt.hash(passwordData.password, 10);

    // Add Name
    const randomNumber = Math.floor(Math.random() * 10000000);
    const username = `${config('constants.customer_name_prefix')}${randomNumber}`;

    const langRecord = await prisma.language.findUnique({ where: { lang: language } });

    const customer = await prisma.customer.create({
      data: {
        name: username,
        email,
        phone: phone,
        password: hashedPassword,
        profileImage: null,
        // name: null, // Optional
        fcmToken: firebaseToken || null,
        languageId: langRecord.id || null,
      },
    });

    // Add Free Plan
    await addFreeSubscriptionPlan(customer);

    await notificationSettingsService.initializeUserSettings(customer.id);

    await prisma.customerSession.updateMany({
      where: {
        customerId: customer.id,
        isActive: true
      },
      data: { isActive: false },
    });

    // Create new session
    const session = await prisma.customerSession.create({
      data: {
        customerId: customer.id,
        deviceId: deviceId,
      },
    });

    const permanentToken = jwt.sign(
      {
        sub: customer.id,
        sessionId: session.id,
        deviceId: deviceId,
        type: 'CUSTOMER',
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Send welcome email
    await emailService.sendWelcomeEmail(email, null, 'fr');

    // Send Mail to Admin
    const admin = await getAdminData();

    // Nottification Queue to Admin
    await notificationQueue.add("send-welcome-email-notification", { admin: admin, customer: customer, lang: "fr" });

    return {
      accessToken: permanentToken,
      customer: CustomerResource.make(customer),
    };
  }

  async loginWithPassword(dto) {
    const customer = await prisma.customer.findFirst({
      where: { email: dto.email },
      include: {
        language: true, 
        interests: {
          include: {
            category: {
              include: {
                translations: true
              }
            },
          },
        },
        subscriptions: { 
          include: {
            plan: true  
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1  
        }
      },
    });

    if (!customer) {
      throw new HttpError(400, 'INVALID_CREDENTIALS', 'invalid_credentials', 'auth');
    }

    if (!customer.password) {
      throw new HttpError(400, 'PASSWORD_NOT_SET', 'password_not_set', 'auth');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, customer.password);
    if (!isPasswordValid) {
      throw new HttpError(400, 'INVALID_CREDENTIALS', 'invalid_credentials', 'auth');
    }

    if (dto.firebaseToken) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { fcmToken: dto.firebaseToken },
      });
    }

    await prisma.customerSession.updateMany({
      where: {
        customerId: customer.id,
        isActive: true
      },
      data: { isActive: false },
    });

    const session = await prisma.customerSession.create({
      data: {
        customerId: customer.id,
        deviceId: dto.deviceId,
      },
    });

    const token = jwt.sign(
      {
        sub: customer.id,
        sessionId: session.id,
        deviceId: dto.deviceId,
        type: 'CUSTOMER',
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return {
      accessToken: token,
      customer: CustomerResource.make(customer),
    };
  }

  async forgotPasswordEmail(email, lang = 'en') {
    const customer = await prisma.customer.findUnique({
      where: { email },
    });

    if (!customer) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'user_not_found', 'auth');
    }

    const otp = process.env.NODE_ENV === 'development' ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    await prisma.customerOtp.deleteMany({
      where: { email },
    });

    await prisma.customerOtp.create({
      data: { email, otp, expiresAt },
    });

    await emailService.sendMobileResetPasswordEmail(email, otp, lang);

    return { success: true };
  }

  async verifyForgotPasswordOtp(dto) {
    const otpRecord = await prisma.customerOtp.findFirst({
      where: {
        email: dto.email,
        otp: dto.otp,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otpRecord) {
      throw new HttpError(400, 'INVALID_OTP', 'invalid_otp', 'auth');
    }

    return { success: true };
  }

  async resetPassword(dto) {
    const otpRecord = await prisma.customerOtp.findFirst({
      where: {
        email: dto.email,
        expiresAt: { gt: new Date(Date.now() - 10 * 60000) },
      },
    });

    if (!otpRecord) {
      throw new HttpError(400, 'OTP_EXPIRED', 'otp_expired', 'auth');
    }

    // Delete OTP record
    await prisma.customerOtp.delete({
      where: { id: otpRecord.id },
    });

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const customer = await prisma.customer.update({
      where: { email: dto.email },
      data: { password: hashedPassword },
    });

    return { success: true };
  }

  async logout(customerId, deviceId = null) {
    if (deviceId) {
      await prisma.customerSession.updateMany({
        where: {
          customerId,
          deviceId,
          isActive: true
        },
        data: { isActive: false },
      });
    } else {
      await prisma.customerSession.updateMany({
        where: {
          customerId,
          isActive: true
        },
        data: { isActive: false },
      });
    }

    await prisma.customer.update({
      where: { id: customerId },
      data: { fcmToken: null },
    });

    return { success: true };
  }

  async me(customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        language: true, 
        interests: {
          include: {
            category: {
              include: {
                translations: true
              }
            },
          },
        },
      },
    });

    if (!customer) {
      throw new HttpError(404, 'CUSTOMER_NOT_FOUND', 'customer_not_found', 'auth');
    }

    return CustomerResource.make(customer);
  }

  async updateProfile(customerId, updateData) {
    const { name, phone, profileImage, email } = updateData;

    if (email) {
      const existingCustomerWithEmail = await prisma.customer.findFirst({
        where: {
          email: email,
          id: { not: customerId }
        },
      });

      if (existingCustomerWithEmail) {
        throw new HttpError(400, 'EMAIL_ALREADY_EXISTS', 'email_already_exists', 'auth');
      }
    }

    if (phone) {
      const existingCustomerWithPhone = await prisma.customer.findFirst({
        where: {
          phone: phone,
          id: { not: customerId }
        },
      });

      if (existingCustomerWithPhone) {
        throw new HttpError(400, 'PHONE_ALREADY_EXISTS', 'phone_already_exists', 'auth');
      }
    }

    const updateObject = {};
    if (name !== undefined) updateObject.name = name;
    if (phone !== undefined) updateObject.phone = phone;
    if (profileImage !== undefined) updateObject.profileImage = profileImage;
    if (email !== undefined) updateObject.email = email;

    // Update customer
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: updateObject,
      include: {
        language: true,
        interests: {
          include: {
            category: true
          }
        }
      }
    });

    return true;
  }

  async changePassword(customerId, passwordData) {
    const { oldPassword, newPassword } = passwordData;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        password: true,
        email: true
      }
    });

    if (!customer) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'user_not_found', 'auth');
    }

    if (!customer.password) {
      throw new HttpError(400, 'PASSWORD_NOT_SET', 'password_not_set', 'auth');
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, customer.password);
    if (!isOldPasswordValid) {
      throw new HttpError(400, 'INVALID_OLD_PASSWORD', 'invalid_old_password', 'auth');
    }

    const isSamePassword = await bcrypt.compare(newPassword, customer.password);
    if (isSamePassword) {
      throw new HttpError(400, 'SAME_AS_OLD_PASSWORD', 'same_as_old_password', 'auth');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: { password: hashedPassword }
    });

    return true;
  }

  async updateLanguage(customerId, lang) {
    const langRecord = await prisma.language.findUnique({ where: { lang } });
    if (!langRecord) throw new HttpError(400, 'INVALID_LANGUAGE', 'invalid_language', 'auth');

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: { languageId: langRecord.id },
    });

    return true;
  }

  async saveUserInterests(customerId, interestIds) {
    await prisma.customerInterest.deleteMany({
      where: { customer_id: customerId },
    });

    const rows = interestIds.map(id => ({
      customer_id: customerId,
      category_id: id,
    }));

    await prisma.customerInterest.createMany({
      data: rows,
      skipDuplicates: true,
    });

    return { success: true };
  }
}

export default new MobileAuthService();