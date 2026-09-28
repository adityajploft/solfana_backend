import { emailLayout } from "../emailLayout.js";

export const subscriptionReminderTemplate = (user, plan, endDate, daysLeft, lang = 'en') => {
    const messages = {
        en: {
            subject: 'Your Subscription is Expiring Soon',
            greeting: `Hi ${user.name || ''},`,
            line1: `Your subscription will expire in ${daysLeft} day(s).`,
            line2: 'Subscription Details:',
            line2_a: 'Plan Name: ',
            line2_b: 'Expiry Date: ',
            line3: 'To continue enjoying uninterrupted service, please renew your subscription before it expires.',
        },
        fr: {
            subject: 'Votre abonnement expire bientôt',
            greeting: `Bonjour ${user.name || ''},`,
            line1: `Votre abonnement expirera dans ${daysLeft} jour(s).`,
            line2: 'Détails de l’abonnement :',
            line2_a: 'Nom du forfait : ',
            line2_b: 'Date d’expiration : ',
            line3: 'Pour continuer à profiter d’un service ininterrompu, veuillez renouveler votre abonnement avant son expiration.',
        },
    };

    const content = messages[lang] || messages.en;

    const innerContent = `
        <p style="">${content.greeting}</p>

        <p style="line-height: 1.6;">${content.line1}</p>

        <strong style="line-height: 1.6;">${content.line2}</strong>
        
        <ul>
            <li><strong style="line-height: 1.6;">${content.line2_a}</strong> <span>${plan.name}</span></li>
            <li><strong style="line-height: 1.6;">${content.line2_b}</strong> <span>${endDate}</span></li>
        </ul>

        <p style="line-height: 1.6;">${content.line3}</p>`;

    return {
        subject: content.subject,
        html: emailLayout(innerContent, lang)
    };
};