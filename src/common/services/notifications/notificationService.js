import prisma from "../../../config/db.config.js";
import { getNotificationTemplate } from '../../notificationTemplates/templateLoader.js';
import { sendPushNotification } from './firebaseService.js';

export const createNotification = async ({
  receiverId,
  receiverType,
  senderId = null,
  senderType = null,
  notificationKey,
  moduleType = null,
  moduleId = null,
  data = {},
  isClickable = false,
  clickAction = "NONE",
  clickValue = null,
  lang = 'fr',
  fcmToken = null,
}) => {
  // 1. Check preference
  if (receiverType === 'CUSTOMER') {
    const setting = await prisma.customerNotificationSetting.findUnique({
      where: {
        customerId_notificationKey: { customerId: receiverId, notificationKey, },
      },
    });

    if (setting && !setting.isEnabled) return;
  }

  // 2. Get template
  const { title, description } = data.messageData ?? getNotificationTemplate(notificationKey, data, lang);

  // 3. Save in DB
  const notification = await prisma.notification.create({
    data: {
      title,
      description,
      receiverId,
      receiverType,
      senderId,
      senderType,
      notificationKey,
      moduleType,
      moduleId,
      isClickable,
      clickAction,
      clickValue,
      data,
    },
  });

  // 4. Push notification
  if (fcmToken) {
    await sendPushNotification({
      token: fcmToken,
      title,
      body: description,
      data: {
        notificationId: notification.id,
        moduleType,
        moduleId,
        isClickable,
        clickAction,
        clickValue,
        ...data,
      },
    });
  }

  return notification;
};