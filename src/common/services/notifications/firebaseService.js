import admin from '../../../config/firebase.config.js';

export const sendPushNotification = async ({
  token,
  title,
  body,
  data = {},
}) => {
  try {
    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
    };

    return await admin.messaging().send(message);
  } catch (error) {
    // Ignore invalid token or Firebase messaging errors
    console.warn('Push notification skipped:', error?.message);
    return null;
  }
};