import { emailLayout } from "../emailLayout.js";

export const paymentSuccessUserMailTemplate = (planData, userData, lang = 'en') => {
    const messages = {
        en: {
            subject: 'Subscription Activated Successfully !',
            greeting: `Hi ${userData.name || ''},`,
            line1: 'Great news! Your subscription has been successfully activated.',
            line2: 'Here are your subscription details:',
            line2_a: 'Plan Name: ',
            line2_b: 'Amount Paid: ',
            line2_c: 'Start Date:',
            line2_d: 'End Date:',
            line3: 'You can now enjoy all premium features included in your plan.',
            footer: 'If you have any questions or need assistance, feel free to contact our support team.',
        },
        fr: {
            subject: 'Abonnement activé avec succès !',
            greeting: `Bonjour ${userData.name || ''},`,
            line1: 'Bonne nouvelle ! Votre abonnement a été activé avec succès.',
            line2: 'Voici les détails de votre abonnement :',
            line2_a: 'Nom du forfait : ',
            line2_b: 'Montant payé : ',
            line2_c: 'Date de début :',
            line2_d: 'Date de fin :',
            line3: 'Vous pouvez maintenant profiter de toutes les fonctionnalités premium incluses dans votre forfait.',
            footer: 'Si vous avez des questions ou si vous avez besoin d’aide, n’hésitez pas à contacter notre équipe d’assistance.',
        },
    };

    const content = messages[lang] || messages.en;

    const innerContent = `
        <p style="">${content.greeting}</p>

        <p style="line-height: 1.6;">${content.line1}</p>

        <strong style="line-height: 1.6;">${content.line2}</strong>
        
        <ul>
            <li><strong style="line-height: 1.6;">${content.line2_a}</strong> <span>${planData.name}</span></li>
            <li><strong style="line-height: 1.6;">${content.line2_b}</strong> <span>${planData.amount}</span></li>
            <li><strong style="line-height: 1.6;">${content.line2_c}</strong> <span>${planData.start_date}</span></li>
            <li><strong style="line-height: 1.6;">${content.line2_d}</strong> <span>${planData.end_date}</span></li>
        </ul>

        <p style="line-height: 1.6;">${content.line3}</p>
        
        <p style="margin-top: 25px; line-height: 1.6;">
            ${content.footer}
        </p>`;

    return {
        subject: content.subject,
        html: emailLayout(innerContent, lang)
    };
};