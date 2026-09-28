import { emailLayout } from "../emailLayout.js";

export const podcasterFollowMailTemplate = (podcaster, customer, lang = 'en') => {
    const messages = {
        en: {
            subject: 'You Have a New Follower 🎉',
            greeting: `Hi ${podcaster.name || 'AdmiPodcastern'},`,
            line1: `${customer.name || 'A user'} has started following you on our platform.`,
            line2: 'Follower Details:',
            line2_a: 'Name: ',
            line2_b: 'Email: ',
            line3: `You’re gaining attention! Log in to your account to connect with your audience.`,
            footer: 'Keep creating great content 🚀',
        },
        fr: {
            subject: 'Vous avez un nouveau follower 🎉',
            greeting: `Bonjour ${podcaster.name || 'Podcaster'},`,
            line1:  `${customer.name || "Un utilisateur"} a commencé à vous suivre sur notre plateforme.`,
            line2: `Détails du follower:`,
            line2_a: 'Nom : ',
            line2_b: 'Email : ',
            line3: `Vous gagnez en popularité ! Connectez-vous à votre compte pour interagir avec votre audience.`,
            footer: 'Continuez à créer du contenu incroyable 🚀',
        },
    };

    const content = messages[lang] || messages.en;

    const innerContent = `
        <p style="">${content.greeting}</p>

        <p style="line-height: 1.6;">${content.line1}</p>

        <strong style="line-height: 1.6;">${content.line2}</strong>
        
        <ul>
            <li><strong style="line-height: 1.6;">${content.line2_a}</strong> <span>${customer.name || ""}</span></li>
            <li><strong style="line-height: 1.6;">${content.line2_b}</strong> <span>${customer.email}</span></li>
        </ul>
        
        <p style="line-height: 1.6;">${content.line3}</p>
        
        <p style="line-height: 1.6;">${content.footer}</p>`;
        

    return {
        subject: content.subject,
        html: emailLayout(innerContent, lang)
    };
};