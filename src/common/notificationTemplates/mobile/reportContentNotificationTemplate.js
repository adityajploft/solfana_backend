import { notificationLayout } from '../notificationLayout.js';

export const reportContentNotificationTemplate = (data, lang = 'en') => {
  
  const entityTypeMap = {
    ALBUM: 'Album',
    TRACK: 'Track',
    PODCASTER: 'Podcaster'
  };

  const entityLabel = entityTypeMap[data.entityType] || 'content';

  const messages = {
    en: {
      ADMIN: {
        title: 'Content Reported',
        description: `A ${entityLabel} has been reported by ${data.reporterName || 'a user'}.`,
      },
      PODCASTER: {
        title: 'Content Report Alert',
        description: `Your ${entityLabel} "${data.title || ''}" has been reported. Please review it.`,
      }
    },
    fr: {
      ADMIN: {
        title: 'Contenu signalé',
        description: `Un ${entityLabel} a été signalé par ${data.reporterName || 'un utilisateur'}.`,
      },
      PODCASTER: {
        title: 'Alerte de signalement',
        description: `Votre ${entityLabel} "${data.title || ''}" a été signalé. Veuillez le vérifier.`,
      }
    }
  };

  const content = messages[lang]?.[data.receiverType] || messages.en[data.receiverType];

  return notificationLayout({
    title: content.title,
    description: content.description,

    data
  });
};