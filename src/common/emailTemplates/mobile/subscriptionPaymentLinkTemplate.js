import { emailLayout } from "../emailLayout.js";

export const subscriptionPaymentLinkTemplate = (user, plan, paymentUrl, lang = 'en') => {
    const messages = {
        en: {
            subject: 'Renew Your Subscription Now',
            greeting: `Hi ${user.name || ''},`,
            line1: `Your subscription has expired today.`,
            line2: 'To continue enjoying our services, please renew your subscription using the link below:',
            line2_a: 'Pay Now',
            line2_b: 'Plan Name: ',
            line3: 'We look forward to having you back!',
        },
        fr: {
            subject: 'Votre abonnement expire bientôt !',
            greeting: `Bonjour ${user.name || ''},`,
            line1: `Votre abonnement a expiré aujourd’hui.`,
            line2: 'Pour continuer à profiter de nos services, veuillez renouveler votre abonnement via le lien ci-dessous :',
            line2_a: 'Payer maintenant',
            line2_b: 'Nom du plan: ',
            line3: 'Nous serions ravis de vous revoir !',
        },
    };

    const content = messages[lang] || messages.en;

    const innerContent = `
        <p style="">${content.greeting}</p>

        <p style="line-height: 1.6;">${content.line1}</p>

        <p style="line-height: 1.6;">${content.line2}</p>        
        
        <div style="margin: 35px 0; text-align: center;">
            <a href="${paymentUrl}" style="display: inline-block; padding: 14px 35px; font-size: 16px; font-weight: bold; color: #ffffff; background-color: #d946ef; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);">
                ${content.line2_a}
            </a>
        </div>

        <p><strong style="line-height: 1.6;">${content.line2_b}</strong> <span>${plan.name}</span></p>

        <p style="line-height: 1.6;">${content.line3}</p>`;

    return {
        subject: content.subject,
        html: emailLayout(innerContent, lang)
    };
};