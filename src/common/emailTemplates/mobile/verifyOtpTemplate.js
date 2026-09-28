import { emailLayout } from "../emailLayout.js";

export const verifyOtpTemplate = (otp, lang = 'en') => {
    const brandColor = '#d946ef'; // Solfana Pink

    const messages = {
        en: {
        subject: 'Your OTP Code',
        greeting: 'Hi,',
        instruction: 'Enter this code to continue logging in without a password:',
        expiry: 'This code is valid for 5 minutes and can only be used once. By entering this code, you will also confirm the email address associated with your account.<br/>',
        
        footer: 'You received this email because a sign-in request was made for your account.',
        },
        fr: {
        subject: 'Votre code OTP',
        greeting: 'Bonjour,',
        instruction: 'Entrez ce code pour continuer à vous connecter à votre compte:',
        expiry: 'Ce code est valide pendant 5 minutes et ne peut être utilisé qu\'une seule fois.',
        footer: 'Vous recevez cet e-mail car une demande de connexion a été effectuée pour votre compte.',
        }
    };

    const content = messages[lang] || messages.en;

    const innerContent = `<p style="margin-bottom: 20px;margin-top: 0;">${content.greeting}</p>
        <p style="line-height: 20px;">${content.instruction}</p>
        
        <div style="margin: 30px 0; text-align: center;">
            <div style="display: inline-block; padding: 14px; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: ${brandColor}; border: 1px dashed ${brandColor}; border-radius: 8px;max-width: 190px;width: 100%;box-sizing: border-box;">${otp}</div>
        </div>

        <p style="margin-top: 20px;line-height: 20px;">${content.expiry}</p>`;

  return {
    subject: content.subject,
    html: emailLayout(innerContent, lang)
  };
};