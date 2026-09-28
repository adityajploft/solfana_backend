import { emailLayout } from "../emailLayout.js";
import { REPORT_REASONS } from "../../../common/constants/reportReasons.js";

export const reportContentPodcasterTemplate = (podcaster, reportData, lang = 'en') => {
    const safePodcaster = podcaster || {};
    const report = reportData || {};

    const entityTypeMap = {
        ALBUM: 'album',
        TRACK: 'track',
        PODCASTER: 'profile'
    };

    const messages = {
        en: {
            subject: 'Your Content Has Been Reported',
            greeting: `Hi ${safePodcaster.name || 'Podcaster'},`,
            line1: `Your ${entityTypeMap[report.entityType] || 'content'} has been reported.`,
            line2: 'Details:',
            fields: {
                title: 'Title/Name: ',
                reason: 'Reason: ',
                customReason: 'Custom Reason: ',
            },
            line3: `Our team will review this.`,
            footer: 'No action required for now.',
        },
        fr: {
            subject: 'Votre contenu a été signalé',
            greeting: `Bonjour ${safePodcaster.name || 'Podcaster'},`,
            line1: `Votre contenu a été signalé.`,
            line2: 'Détails :',
            fields: {
                title: 'Titre/Nom : ',
                reason: 'Raison : ',
                customReason: 'Raison personnalisée : ',
            },
            line3: `Notre équipe va examiner cela.`,
            footer: `Aucune action requise pour le moment.`,
        },
    };

    const content = messages[lang] || messages.en;

    const reasonContent = REPORT_REASONS[lang]?.[report.reasonContent]?.title;

    const innerContent = `
        <p>${content.greeting}</p>

        <p style="line-height: 1.6;">${content.line1}</p>

        <strong style="line-height: 1.6;">${content.line2}</strong>
        <ul>
            <li><strong style="line-height: 1.6;">${content.fields.title}</strong> ${report.title || 'N/A'}</li>
            <li><strong style="line-height: 1.6;">${content.fields.reason}</strong> ${reasonContent || 'N/A'}</li>

            ${report.customReason ? `<li><strong style="line-height: 1.6;">${content.fields.customReason}</strong> ${report.customReason}</li>` : ''}
        </ul>

        <p style="line-height: 1.6;">${content.line3}</p>
        <p style="line-height: 1.6;">${content.footer}</p>
    `;

    return {
        subject: content.subject,
        html: emailLayout(innerContent, lang)
    };
};