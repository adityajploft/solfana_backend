import prisma from '../../../config/db.config.js';
import HttpError from '../../../common/errors/http.error.js';
import { REPORT_REASONS } from "../../../common/constants/reportReasons.js";
import { includes } from 'zod';

class ContentReportService {

    async index({ page = 1, limit = 10, search }) {
        const skip = (page - 1) * limit;

        const total = await prisma.contentReport.count();

        const records = await prisma.contentReport.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        });

        const formattedRecords = await Promise.all(
            records.map(async (record) => {
                const reasonTitles = {
                    lang: {
                        en: REPORT_REASONS.en?.[record.reasonContent]?.title || "",
                        fr: REPORT_REASONS.fr?.[record.reasonContent]?.title || ""
                    }
                };

                const contentTitles = await ContentReportService.getEntityTitles(record.entityId, record.entityType);

                return {
                    id: record.id,
                    content_type: record.entityType,
                    content_id: record.entityId,
                    content_title: contentTitles,
                    content_reason: reasonTitles,
                    created_at: record.createdAt
                };
            })
        );

        return {
            records: formattedRecords,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async show(id, lang) {
        const contentReport = await prisma.contentReport.findUnique({
            where: { id }
        });

        if (!contentReport || contentReport.deletedAt) {
            throw new HttpError(404, 'CONTENT_NOT_FOUND', 'content_report_not_found', 'report');
        }

        const reasonTitles = {
            lang: {
                en: REPORT_REASONS.en?.[contentReport.reasonContent]?.title || "",
                fr: REPORT_REASONS.fr?.[contentReport.reasonContent]?.title || ""
            }
        };

        const contentTitles = await ContentReportService.getEntityTitles(contentReport.entityId, contentReport.entityType);

        return {
            id: contentReport.id,
            content_type: contentReport.entityType,
            content_id: contentReport.entityId,
            content_title: contentTitles,
            content_reason: reasonTitles,
            created_at: contentReport.createdAt
        };
    }

    // Get Entity Titles
    static async getEntityTitles(entityId, entityType){
        let contentTitles = { lang: { en: { title: "" }, fr: { title: "" } }};

        if (entityType === "TRACK") {
            const track = await prisma.track.findUnique({
                where: { id: entityId },
                select: { title: true }
            });

            if (track) {
                contentTitles.lang.en.title = track.title;
                contentTitles.lang.fr.title = track.title;
            }
        } else if (entityType === "ALBUM") {
            const album = await prisma.album.findUnique({
                where: { id: entityId },
                select: { title: true }
            });

            if (album) {
                contentTitles.lang.en.title = album.title;
                contentTitles.lang.fr.title = album.title;
            }
        } else if (entityType === "PODCASTER") {
            const podcaster = await prisma.user.findUnique({
                where: { id: entityId },
            });

            contentTitles = { lang: { en: { title: podcaster.name }, fr: { title: podcaster.name } }};
        }

        return contentTitles;
    }
}

export default new ContentReportService();