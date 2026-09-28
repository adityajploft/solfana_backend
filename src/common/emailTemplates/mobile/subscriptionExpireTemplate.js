import { emailLayout } from "../emailLayout.js";

export const subscriptionExpireTemplate = (user, plan, endDate, lang = 'en') => {
    const messages = {
        en: {
            subject: 'Your Subscription Has Expired',
            greeting: `Hi ${user.name || ''},`,
            line1: `Your subscription has now expired.`,
            line1_a: 'Plan Name: ',
            line1_b: 'Expiry Date: ',
            line2: 'You no longer have access to premium features.',
            line3: 'To regain access, please renew your subscription.',
        },
        fr: {
            subject: 'Votre abonnement a expiré',
            greeting: `Bonjour ${user.name || ''},`,
            line1: `Votre abonnement a maintenant expiré.`,
            line1_a: 'Nom du forfait : ',
            line1_b: 'Date d’expiration : ',
            line2: 'Vous n’avez plus accès aux fonctionnalités premium.',
            line3: 'Pour retrouver votre accès, veuillez renouveler votre abonnement.',
        },
    };

    const content = messages[lang] || messages.en;

    const innerContent = `
        <p style="">${content.greeting}</p>

        <p style="line-height: 1.6;">${content.line1}</p>

        
        <p style="line-height: 1.6;">${content.line2}</p>        

        <p><strong style="line-height: 1.6;">${content.line1_b}</strong> <span>${plan.name}</span></p>

        <p><strong style="line-height: 1.6;">${content.line1_b}</strong> <span>${endDate}</span></p>

        <p style="line-height: 1.6;">${content.line3}</p>`;

    return {
        subject: content.subject,
        html: emailLayout(innerContent, lang)
    };
};