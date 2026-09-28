import { emailLayout } from "../emailLayout.js";

export const becomePodcasterMailTemplate = (admin, user, lang = 'en') => {
    const messages = {
        en: {
            subject: 'New Podcaster Interest Request Received',
            greeting: `Hi ${admin.name || 'Admin'},`,
            line1: `A user has submitted a request to become a podcaster on the platform.`,
            line2: 'User Details:',
            line2_a: 'Name: ',
            line2_b: 'Email: ',
        },
        fr: {
            subject: 'Nouvelle demande pour devenir podcasteur',
            greeting: `Bonjour ${admin.name || 'Admin'},`,
            line1: `Un utilisateur a soumis une demande pour devenir podcasteur sur la plateforme.`,
            line2: `Détails de l'utilisateur :`,
            line2_a: 'Nom : ',
            line2_b: 'Email : ',
        },
    };

    const content = messages[lang] || messages.en;

    const innerContent = `
        <p style="">${content.greeting}</p>

        <p style="line-height: 1.6;">${content.line1}</p>

        <strong style="line-height: 1.6;">${content.line2}</strong>
        
        <ul>
            <li><strong style="line-height: 1.6;">${content.line2_a}</strong> <span>${user.name || ""}</span></li>
            <li><strong style="line-height: 1.6;">${content.line2_b}</strong> <span>${user.email}</span></li>
        </ul>`;

    return {
        subject: content.subject,
        html: emailLayout(innerContent, lang)
    };
};