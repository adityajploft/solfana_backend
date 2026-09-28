import { emailLayout } from "../emailLayout.js";

export const resetPasswordTemplate = (otp, lang = 'en') => {
    const brandColor = '#d946ef'; // Solfana Pink

    const messages = {
        en: {
            subject: 'Reset Your Password',
            greeting: 'Hi,',
            instruction: 'We received a request to reset your password. Use the verification code below to proceed:',
            expiry: 'This code is valid for 10 minutes. If you did not request this, you can safely ignore this email.',
            footer: 'For security, never share this code with anyone.',
        },
        fr: {
            subject: 'Réinitialisez votre mot de passe',
            greeting: 'Bonjour,',
            instruction: 'Nous avons reçu une demande de réinitialisation de votre mot de passe. Utilisez le code de vérification ci-dessous pour continuer :',
            expiry: 'Ce code est valide pendant 10 minutes. Si vous n\'avez pas demandé cela, vous pouvez ignorer cet e-mail en toute sécurité.',
            footer: 'Pour votre sécurité, ne partagez jamais ce code avec qui que ce soit.',
        }
    };

    const content = messages[lang] || messages.en;

    const innerContent = `
        <p style="margin-bottom: 20px;">${content.greeting}</p>
        <p style="line-height: 1.6; ">${content.instruction}</p>
        
        <div style="margin: 30px 0; text-align: center;">
            <div style="display: inline-block; padding: 15px 40px; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: ${brandColor}; border: 2px dashed ${brandColor}; border-radius: 12px; background-color: rgba(217, 70, 239, 0.05);">
                ${otp}
            </div>
        </div>

        <p style="margin-top: 20px; line-height: 1.6;">
            ${content.expiry}
        </p>
        <p style="margin-top: 25px;">
            ${content.footer}
        </p>`;

    return {
        subject: content.subject,
        html: emailLayout(innerContent, lang)
    };
};