import { emailLayout } from "../emailLayout.js";

export const admniResetPasswordTemplate = (token, lang = 'en') => {
    const brandColor = '#d946ef'; // Solfana Pink
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const messages = {
        en: {
            subject: 'Reset Your Admin Password',
            greeting: `Hello,`,
            instruction: 'A request has been made to reset the password for your administrative account. Please click the button below to set a new password:',
            actionText: 'Reset Password',
            expiry: 'This link will expire in 60 minutes for security reasons. If you did not request this change, please ignore this email.',
            footer: 'If the button above does not work, copy and paste the following link into your browser:',
        },
        fr: {
            subject: 'Réinitialisez votre mot de passe administrateur',
            greeting: `Bonjour,`,
            instruction: 'Une demande a été faite pour réinitialiser le mot de passe de votre compte administratif. Veuillez cliquer sur le bouton ci-dessous pour définir un nouveau mot de passe :',
            actionText: 'Réinitialiser le mot de passe',
            expiry: 'Ce lien expirera dans 60 minutes pour des raisons de sécurité. Si vous n\'avez pas demandé ce changement, veuillez ignorer cet e-mail.',
            footer: 'Si le bouton ci-dessus ne fonctionne pas, copiez et collez le lien suivant dans votre navigateur :',
        }
    };

    const content = messages[lang] || messages.en;

    const innerContent = `
        <p style="margin-bottom: 20px;">${content.greeting}</p>
        <p style="line-height: 1.6; ">${content.instruction}</p>
        
        <div style="margin: 35px 0; text-align: center;">
            <a href="${resetUrl}" style="display: inline-block; padding: 14px 35px; font-size: 16px; font-weight: bold; color: #ffffff; background-color: ${brandColor}; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);">
                ${content.actionText}
            </a>
        </div>

        <p style="line-height: 1.6; margin-bottom: 25px;">
            ${content.expiry}
        </p>

        <div style="border-top: 1px solid #334155; padding-top: 20px;">
            <p style="font-size: 12px; word-break: break-all;">
                ${content.footer}<br/>
                <a href="${resetUrl}" style="color: ${brandColor}; text-decoration: none;">${resetUrl}</a>
            </p>
        </div>`;

    return {
        subject: content.subject,
        html: emailLayout(innerContent, lang)
    };
};