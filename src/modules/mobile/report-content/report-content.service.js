import HttpError from '../../../common/errors/http.error.js';
import prisma from '../../../config/db.config.js';
import { REPORT_REASONS } from "../../../common/constants/reportReasons.js";
import { getAdminData } from '../../../common/utils/helper.js';
import emailService from '../../../common/services/email.service.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';
import { createNotification } from '../../../common/services/notifications/notificationService.js';

class ReportContentService {


    async getReportReasons(lang = "en") {
        return REPORT_REASONS[lang] || REPORT_REASONS.en;
    }

    async reportContent(customerId, body) {
        const { reasonContent, customReason, entityType, entityId } = body;

        if (!reasonContent) {
            throw new HttpError(400, "REASON_REQUIRED", "reason_required", "report");
        }

        if (reasonContent === "Other" && !customReason) {
            throw new HttpError(400, "CUSTOM_REASON_REQUIRED", "custom_reason_required", "report");
        }

        const alreadyReported = await prisma.contentReport.findFirst({
            where: { entityType, entityId, customerId }
        });

        if (alreadyReported) {
            throw new HttpError(400, "CONTENT_ALREADY_REPORTED", "content_already_reported", "report");
        }

        const reportContent = prisma.contentReport.create({
            data: { entityType, entityId, customerId, reasonContent, customReason }
        });

        const customer = await prisma.customer.findUnique({
            where: { id: customerId }
        });

        // Dynamic data based on entityType
        let title = '';
        let podcaster = null;

        if (entityType === 'ALBUM') {
            const album = await prisma.album.findUnique({
                where: { id: entityId },
                include: { podcaster: true }
            });
            title = album?.title;
            podcaster = album?.podcaster;
        }

        if (entityType === 'TRACK') {
            const track = await prisma.track.findUnique({
                where: { id: entityId },
                include: { album: { include: { podcaster: true } } }
            });
            title = `${track?.title} ( Album: ${track.album?.title} )`;
            podcaster = track?.album?.podcaster;
        }

        if (entityType === 'PODCASTER') {
            podcaster = await prisma.user.findUnique({ where: { id: entityId } });

            title = podcaster?.name;
        }

        // Prepare reportData for template
        const reportData = {
            entityType,
            title,
            podcasterName: podcaster?.name,
            reporterName: customer?.name,
            reasonContent,
            customReason,
            createdAt: reportContent.createdAt
        };

        // Send Mail to Admin and Podcaster
        const admin = await getAdminData();
        const adminLang = await getUserLanguage(admin?.languageId);

        // Send Notification to Admin
        await emailService.contentReportAdminMail(admin, reportData, adminLang);
        await sendNotification(adminLang, admin, reportContent, entityType, "ADMIN", {title, reporterName: customer.name || "Customer"}, customer);

        // Send Email to Podcaster (if exists)
        if (podcaster?.email) {
            const podcasterLang = await getUserLanguage(podcaster?.languageId);

            await emailService.contentReportPodcasterMail(podcaster, reportData, podcasterLang);

            if (entityType !== 'PODCASTER') {
                await sendNotification(podcasterLang, podcaster, reportContent, entityType, "PODCASTER", {title, reporterName: customer.name || "Customer"}, customer);
            }
        }       

        return reportContent;
    }
}

async function sendNotification(lang, admin, reportContent, entityType, receiverType, data, sender) {
    await createNotification({
        receiverId: admin.id,
        receiverType: 'USER',

        senderId: sender.id,

        notificationKey: "account_activity",        

        moduleType: "report-content",
        moduleId: reportContent.id,

        isClickable: true,
        clickAction: 'OPEN_URL',
        clickValue: "report-content-list",

        lang: lang || "fr",

        fcmToken: admin.fcmToken,

        data: {
            notificationkeyType: "REPORT_CONTENT",
            title: data.title,
            reporterName: data.reporterName,
            entityType: entityType,
            receiverType: receiverType,
            type: "account_activity",
            moduleType: "report-content",
            moduleId: reportContent.id,
            isClickable: true,
            clickAction: 'OPEN_URL',
            clickValue: "report-content-list"
        }
    });
}

export default new ReportContentService();