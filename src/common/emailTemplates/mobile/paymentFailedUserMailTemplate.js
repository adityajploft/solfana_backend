import { emailLayout } from "../emailLayout.js";

export const paymentFailedUserMailTemplate = (planData, userData, lang = 'en') => {
    const messages = {
        en: {
            subject: 'Payment Failed ! Action Required',
            greeting: `Hi ${userData.name || ''},`,
            line1: 'We were unable to process your subscription payment.',
            line2: 'Here are the details::',
            line2_a: 'Plan Name: ',
            line2_b: 'Amount: ',
            line2_c: 'Attempt Date:',
            line3: 'This may be due to insufficient balance, network issues, or payment authorization failure.',
            line4: 'Please try again to activate your subscription and continue enjoying our services.',
            footer: 'If the issue persists, feel free to contact our support team.',
        },
        fr: {
            subject: 'Échec du paiement ! Action requise',
            greeting: `Bonjour ${userData.name || ''},`,
            line1: 'Nous n’avons pas pu traiter le paiement de votre abonnement.',
            line2: 'Voici les détails de la tentative :',
            line2_a: 'Nom du forfait : ',
            line2_b: 'Montant : ',
            line2_c: 'Date de la tentative :',
            line3: 'Cela peut être dû à un solde insuffisant, à un problème de réseau ou à un échec d’autorisation de paiement.',
            line4: 'Veuillez réessayer pour activer votre abonnement et continuer à profiter de nos services.',
            footer: 'Si le problème persiste, n’hésitez pas à contacter notre équipe d’assistance.',
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
            <li><strong style="line-height: 1.6;">${content.line2_c}</strong> <span>${planData.attempt_date}</span></li>
        </ul>

        <p style="line-height: 1.6;">${content.line3}</p>
        <p style="line-height: 1.6;">${content.line4}</p>
        
        <p style="margin-top: 25px; line-height: 1.6;">
            ${content.footer}
        </p>`;

    return {
        subject: content.subject,
        html: emailLayout(innerContent, lang)
    };
};