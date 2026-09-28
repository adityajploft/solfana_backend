import { notificationLayout } from '../notificationLayout.js';

export const newReleaseTemplate = (data, lang = 'en') => {
  const isTrack = data.type === 'track';

  const messages = {
    en: {
      title: isTrack ? 'New Episode Released' : 'New Album Available',
      description: isTrack
        ? `"${data.trackName}" from ${data.albumName} is now available.`
        : `"${data.albumName}" by ${data.podcasterName} is now live.`,
    },
    fr: {
      title: isTrack ? 'Nouvel épisode disponible' : 'Nouvel album disponible',
      description: isTrack
        ? `"${data.trackName}" de ${data.albumName} est maintenant disponible.`
        : `"${data.albumName}" par ${data.podcasterName} est maintenant disponible.`,
    },
  };

  const content = messages[lang] || messages.en;

  return notificationLayout({
    title: content.title,
    description: content.description,

    data
  });
};