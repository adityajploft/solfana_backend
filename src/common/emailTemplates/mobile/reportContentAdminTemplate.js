import { emailLayout } from "../emailLayout.js";
import { REPORT_REASONS } from "../../../common/constants/reportReasons.js";

export const reportContentAdminTemplate = (admin, reportData, lang = 'en') => {
    const safeAdmin = admin || {};
    const report = reportData || {};

    const entityTypeMap = {
        ALBUM: 'Album',
        TRACK: 'Track',
        PODCASTER: 'Podcaster'
    };



    const messages = {
        en: {
            subject: 'Content Reported 🚨',
            greeting: `Hi ${safeAdmin.name || 'Admin'},`,
            line1: `A ${entityTypeMap[report.entityType] || 'content'} has been reported.`,
            line2: 'Report Details:',
            fields: {
                type: 'Type: ',
                title: 'Title/Name: ',
                podcaster: 'Podcaster: ',
                reporter: 'Reported By: ',
                reason: 'Reason: ',
                customReason: 'Custom Reason: ',
                date: 'Reported At: '
            },
            footer: 'Please review this report in admin panel.',
        },
        fr: {
            subject: 'Contenu signalé 🚨',
            greeting: `Bonjour ${safeAdmin.name || 'Admin'},`,
            line1: `Un contenu (${entityTypeMap[report.entityType] || ''}) a été signalé.`,
            line2: 'Détails du signalement :',
            fields: {
                type: 'Type : ',
                title: 'Titre/Nom : ',
                podcaster: 'Podcasteur : ',
                reporter: 'Signalé par : ',
                reason: 'Raison : ',
                customReason: 'Raison personnalisée : ',
                date: 'Date : '
            },
            footer: `Veuillez examiner cela dans le panneau d'administration.`,
        },
    };

    const content = messages[lang] || messages.en;

    const reportedAt = report.createdAt ? new Date(report.createdAt).toLocaleString() : new Date().toLocaleString();

    const reasonContent = REPORT_REASONS[lang]?.[report.reasonContent]?.title;

    const innerContent = `
        <p>${content.greeting}</p>

        <p style="line-height: 1.6;">${content.line1}</p>

        <strong style="line-height: 1.6;">${content.line2}</strong>
        
        <ul>
            <li><strong style="line-height: 1.6;">${content.fields.type}</strong> ${report.entityType}</li>

            <li><strong style="line-height: 1.6;">${content.fields.title}</strong> ${report.title || 'N/A'}</li>

            <li><strong v>${content.fields.podcaster}</strong> ${report.podcasterName || 'N/A'}</li>

            <li><strong style="line-height: 1.6;">${content.fields.reporter}</strong> ${report.reporterName || 'Anonymous'}</li>

            <li><strong style="line-height: 1.6;">${content.fields.reason}</strong> ${reasonContent || 'N/A'}</li>

            ${report.customReason ? `<li><strong style="line-height: 1.6;">${content.fields.customReason}</strong> ${report.customReason}</li>` : ''}

            <li><strong style="line-height: 1.6;">${content.fields.date}</strong> ${reportedAt}</li>
        </ul>

        <p style="line-height: 1.6;">${content.footer}</p>`;

    return {
        subject: content.subject,
        html: emailLayout(innerContent, lang)
    };
};