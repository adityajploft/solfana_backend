import { emailLayout } from "../emailLayout.js";

export const welcomeEmailTemplate = (name, lang = 'en') => {
    const brandColor = '#d946ef'; // Solfana Pink

    const messages = {
        en: {
            subject: 'Welcome to Solfana!',
            greeting: `Hi ${name || ''},`,
            instruction: 'We’re excited to have you on board! Your account has been successfully created. You can now access all our features and start your journey with us.',
            footer: 'If you have any questions, feel free to reply to this email. Our team is always here to help!',
        },
        fr: {
            subject: 'Bienvenue chez Solfana !',
            greeting: `Bonjour ${name || ''},`,
            instruction: 'Nous sommes ravis de vous accueillir ! Votre compte a été créé avec succès. Vous pouvez maintenant accéder à toutes nos fonctionnalités et commencer votre aventure avec nous.',
            footer: "Si vous avez des questions, n'hésitez pas à répondre à ce courriel. Notre équipe est toujours là pour vous aider !",
        }
    };

    const content = messages[lang] || messages.en;

    const innerContent = `
        <p style="">${content.greeting}</p>
        <p style="line-height: 1.6;">${content.instruction}</p>
        
        <p style="margin-top: 25px; line-height: 1.6;">
            ${content.footer}
        </p>`;

    return {
        subject: content.subject,
        html: emailLayout(innerContent, lang)
    };
};