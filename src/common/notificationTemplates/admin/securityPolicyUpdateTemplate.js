import { notificationLayout } from '../notificationLayout.js';

export const securityPolicyUpdateTemplate = (data, lang = 'en') => {
  const messages = {
    en: {
      title: 'Policy Update',
      description:
        data.type === 'privacy-policy'
          ? 'Our Privacy Policy has been updated. Please review the changes.'
          : 'Our Terms & Conditions have been updated. Please review the changes.',
    },
    fr: {
      title: 'Mise à jour des politiques',
      description:
        data.type === 'privacy-policy'
          ? 'Notre politique de confidentialité a été mise à jour. Veuillez consulter les modifications.'
          : 'Nos conditions d’utilisation ont été mises à jour. Veuillez consulter les modifications.',
    },
  };

  const content = messages[lang] || messages.en;

  return notificationLayout({
    title: content.title,
    description: content.description,

    data
  });
};