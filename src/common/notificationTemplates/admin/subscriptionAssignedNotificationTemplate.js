import { notificationLayout } from '../notificationLayout.js';

export const subscriptionAssignedNotificationTemplate = (data, lang = 'en') => {

    const messages = {
        en: {
            title: 'Subscription Assigned',
            description: `An administrator has assigned you the ${data.planName} plan.`,
        },
        fr: {
            title: 'Abonnement attribué',
            description: `Un administrateur vous a attribué le plan ${data.planName}.`,
        },
    };

    const content = messages[lang] || messages.en;

    return notificationLayout({
        title: content.title,
        description: content.description,

        data
    });
};