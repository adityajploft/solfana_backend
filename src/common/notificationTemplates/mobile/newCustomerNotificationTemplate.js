import { notificationLayout } from '../notificationLayout.js';

export const newCustomerNotificationTemplate = (data, lang = 'en') => {
  const isTrack = data.type === 'track';

  const messages = {
    en: {
      title: 'New Customer Registered',
      description: `${data.name || 'A new customer'} has just registered on the platform.`,
    },
    fr: {
      title: 'Nouveau client inscrit',
      description: `${data.name || 'Un nouvel utilisateur'} vient de s'inscrire sur la plateforme.`,
    },
  };

  const content = messages[lang] || messages.en;

  return notificationLayout({
    title: content.title,
    description: content.description,

    data
  });
};