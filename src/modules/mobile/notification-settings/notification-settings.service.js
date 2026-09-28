import prisma from '../../../config/db.config.js';
import HttpError from '../../../common/errors/http.error.js';
import { t } from '../../../common/services/i18n/i18n.service.js';
import { NOTIFICATION_CATEGORIES, ALL_NOTIFICATION_KEYS } from './notification.constants.js';

class NotificationSettingsService {
  async initializeUserSettings(customerId) {
    const defaultSettings = ALL_NOTIFICATION_KEYS.map(key => ({
      customerId,
      notificationKey: key,
      isEnabled: true
    }));

    await prisma.customerNotificationSetting.createMany({
      data: defaultSettings,
      skipDuplicates: true
    });

    return { success: true, count: ALL_NOTIFICATION_KEYS.length };
  }

  async getNotificationSettings(customerId) {
    const userSettings = await prisma.customerNotificationSetting.findMany({
      where: { customerId }
    });

    const settingsMap = {};
    userSettings.forEach(setting => {
      settingsMap[setting.notificationKey] = setting.isEnabled;
    });

     const notifications = ALL_NOTIFICATION_KEYS.map(key => ({
      key,
    enabled: settingsMap[key] ?? true
    }));

    return {
      notifications,
      lastUpdated: userSettings.length > 0 
        ? Math.max(...userSettings.map(s => s.updatedAt.getTime()))
        : null
    };
  }

  async updateNotificationSettings(customerId, updateData, lang = 'en') {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      throw new HttpError(404, 'CUSTOMER_NOT_FOUND', 'customer_not_found', 'notification');
    }

    const updates = [];
    const errors = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (!ALL_NOTIFICATION_KEYS.includes(key)) {
        errors.push(`${key}: ${t(lang, 'notification', 'INVALID_NOTIFICATION_KEY')}`);
        continue;
      }
      if (typeof value !== 'boolean') {
        errors.push(`${key}: ${t(lang, 'notification', 'VALUE_MUST_BE_BOOLEAN')}`);
        continue;
      }
      updates.push({ key, enabled: value });
    }

    if (errors.length > 0) {
      throw new HttpError(400, 'INVALID_NOTIFICATION_DATA', 'invalid_notification_data', 'notification', errors);
    }

    const operations = updates.map(({ key, enabled }) => 
      prisma.customerNotificationSetting.upsert({
        where: {
          customerId_notificationKey: {
            customerId,
            notificationKey: key
          }
        },
        update: { isEnabled: enabled },
        create: {
          customerId,
          notificationKey: key,
          isEnabled: enabled
        }
      })
    );

    await prisma.$transaction(operations);
    return this.getNotificationSettings(customerId, lang);
  }

}

export default new NotificationSettingsService();