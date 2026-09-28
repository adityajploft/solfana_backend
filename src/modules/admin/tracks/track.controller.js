import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import HttpError from '../../../common/errors/http.error.js';
import trackService from './track.service.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';
import audioLibrariesService from '../audio-libraries/audio-libraries.service.js';
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { uploadToCDN } from '../../../common/utils/globalUploader.js';

class TrackController {

    create = async (req, res, next) => {
        try {
            const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

            // handle simple vs library upload
            if (req.body.uploadType === 'simple_upload') {
                const fileArr = (req.files?.audio || req.files?.file) ?? [];
                const file = fileArr[0];

                if (!file) {
                    throw new HttpError(400, 'MP3_FILE_REQUIRED', 'mp3_file_required', 'track');
                }

                // validate mimetype & extension & size (20MB limit as in audio-library)
                if (
                    file.mimetype !== 'audio/mpeg' ||
                    path.extname(file.originalname).toLowerCase() !== '.mp3'
                ) {
                    throw new HttpError(400, 'ONLY_MP3_ALLOWED', 'only_mp3_allowed', 'track');
                }

                if (file.size > 150 * 1024 * 1024) {
                    throw new HttpError(400, 'FILE_TOO_LARGE', 'file_too_large', 'track');
                }

                const buffer = file.buffer || (file.path ? fs.readFileSync(file.path) : Buffer.alloc(0));
                const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

                let audioRecord = await audioLibrariesService.findByHash(fileHash);

                if (audioRecord) {
                } else {
                    // upload to CDN and create new audio-library entry
                    const uniqueName = crypto.randomBytes(16).toString('hex') + '.mp3';
                    const fileForUpload = { ...file, originalname: uniqueName };

                    const cdnUpload = await uploadToCDN(
                        fileForUpload,
                        'audio-library',
                        'audio',
                        { optimize: false, deleteLocal: true }
                    );

                    if (!cdnUpload?.success) {
                        throw new HttpError(500, 'CDN_UPLOAD_FAILED', 'cdn_upload_failed', 'track');
                    }

                    const created = await audioLibrariesService.create({
                        audios: [
                            {
                                original_file_name: file.originalname,
                                cdn_file_name: uniqueName,
                                cdn_path: cdnUpload.storagePath,
                                cdn_url: cdnUpload.cdnUrl,
                                file_hash: fileHash,
                            },
                        ],
                        createdById: req.user.id,
                    });

                    audioRecord = created[0];
                }

                req.body.audioLibraryId = audioRecord.id;
            }

            // handle cover image upload
            if (req.files?.coverImage && req.files.coverImage[0]) {
                const coverImageFile = req.files.coverImage[0];

                // validate image mimetype
                const allowedImageMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                if (!allowedImageMimes.includes(coverImageFile.mimetype)) {
                    throw new HttpError(400, 'INVALID_IMAGE_FORMAT', 'invalid_image_format', 'track');
                }

                // validate image size (5MB limit)
                if (coverImageFile.size > 5 * 1024 * 1024) {
                    throw new HttpError(400, 'IMAGE_TOO_LARGE', 'image_too_large', 'track');
                }

                const uniqueImageName = crypto.randomBytes(16).toString('hex') + path.extname(coverImageFile.originalname);
                const fileForUpload = { ...coverImageFile, originalname: uniqueImageName };

                const cdnUpload = await uploadToCDN(
                    fileForUpload,
                    'TRACK',
                    'COVER_IMAGE',
                    { optimize: true, deleteLocal: true }
                );

                if (!cdnUpload?.success) {
                    throw new HttpError(500, 'CDN_UPLOAD_FAILED', 'cdn_upload_failed', 'track');
                }

                req.body.coverImage = cdnUpload.cdnUrl;
            }
            const userId = req.user.id;
            const result = await trackService.create(req.body, userId);

            res.status(201).json(
                successResponse(
                    t(lang, 'track', 'TRACK_CREATED'),
                    result
                )
            );
        } catch (error) {
            next(error);
        }
    };

    index = async (req, res, next) => {
        try {
            const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

            const { page = 1, limit = 10, search = '' } = req.query;

            const result = await trackService.index(
                req.params.albumId,
                lang,
                Number(page),
                Number(limit),
                search
            );

            res.json(
                successResponse(
                    t(lang, 'track', 'TRACK_LIST'),
                    result
                )
            );
        } catch (error) {
            next(error);
        }
    };

    show = async (req, res, next) => {
        try {
            const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';
            const result = await trackService.show(req.params.id, lang);

            res.json(
                successResponse(
                    t(lang, 'track', 'TRACK_DETAIL'),
                    result
                )
            );
        } catch (error) {
            next(error);
        }
    };

    update = async (req, res, next) => {
        try {
            const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

            // handle cover image upload
            if (req.files?.coverImage && req.files.coverImage[0]) {
                const coverImageFile = req.files.coverImage[0];

                // validate image mimetype
                const allowedImageMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                if (!allowedImageMimes.includes(coverImageFile.mimetype)) {
                    throw new HttpError(400, 'INVALID_IMAGE_FORMAT', 'invalid_image_format', 'track');
                }

                // validate image size (5MB limit)
                if (coverImageFile.size > 5 * 1024 * 1024) {
                    throw new HttpError(400, 'IMAGE_TOO_LARGE', 'image_too_large', 'track');
                }

                const uniqueImageName = crypto.randomBytes(16).toString('hex') + path.extname(coverImageFile.originalname);
                const fileForUpload = { ...coverImageFile, originalname: uniqueImageName };

                const cdnUpload = await uploadToCDN(
                    fileForUpload,
                    'TRACK',
                    'COVER_IMAGE',
                    { optimize: true, deleteLocal: true }
                );

                if (!cdnUpload?.success) {
                    throw new HttpError(500, 'CDN_UPLOAD_FAILED', 'cdn_upload_failed', 'track');
                }

                req.body.coverImage = cdnUpload.cdnUrl;
            }
            const userId = req.user.id;
            const result = await trackService.update(req.params.id, req.body, userId);

            res.json(
                successResponse(
                    t(lang, 'track', 'TRACK_UPDATED'),
                    result
                )
            );
        } catch (error) {
            next(error);
        }
    };

    remove = async (req, res, next) => {
        try {
            const lang = await getUserLanguage(req.user?.languageId) || req.lang || 'en';

            await trackService.remove(req.params.id);

            res.json(
                successResponse(
                    t(lang, 'track', 'TRACK_DELETED')
                )
            );
        } catch (error) {
            next(error);
        }
    };

    /* CREATOR */

    /* ================= ADMIN ================= */
    
    // async getPublishRequests(req, res, next) {
    //     try {
    //       const lang = (await getUserLanguage(req.user?.languageId)) || req.lang || "en";
    
    //       if (req.user.roleId !== 1) {
    //         throw new HttpError(403, "UNAUTHORIZED", "unauthorized", "album");
    //       }
    
    //       const page = parseInt(req.query.page) || 1;
    //       const limit = parseInt(req.query.limit) || 10;
    //       const search = req.query.search || "";
    
    //       const result = await trackService.getPublishRequests(lang, { page, limit, search });
    
    //       res.json(
    //         successResponse(
    //           t(lang, "album", "PUBLISH_REQUEST_LIST"),
    //           result
    //         )
    //       );
    
    //     } catch (error) {
    //       next(error);
    //     }
    // }

    async publishTrack(req, res, next) {
        try {
            const lang = (await getUserLanguage(req.user?.languageId)) || req.lang || "en";

            const { id } = req.params;
            const userId = req.user.id;

            const result = await trackService.publishTrack(id, req.user);

            let messageKey = "TRACK_PUBLISHED_SUCCESS";

            if (result.status === "PENDING") {
                messageKey = "PUBLISH_REQUEST_SENT_TO_ADMIN";
            }

            res.json(
                successResponse(
                    t(lang, "track", messageKey),
                    result
                )
            );


        } catch (error) {
            next(error);
        }
    }

    async scheduleTrack(req, res, next) {
        try {
            const lang = (await getUserLanguage(req.user?.languageId)) || req.lang || "en";

            const { id } = req.params;
            const { publishAt } = req.body;
            const userId = req.user.id;

            const result = await trackService.scheduleTrack(id, publishAt, userId);

            res.json(
                successResponse(
                    t(lang, "track", "TRACK_SCHEDULED_SUCCESS"),
                    result
                )
            );

        } catch (error) {
            next(error);
        }
    }

    async deleteSchedule(req, res, next) {
        try {
            const lang = (await getUserLanguage(req.user?.languageId)) || req.lang || "en";

            const { id } = req.params;

            const result = await trackService.deleteSchedule(id);

            res.json(
                successResponse(
                    t(lang, "track", "TRACK_SCHEDULE_DELETED"),
                    result
                )
            );

        } catch (error) {
            next(error);
        }
    }
}

export default new TrackController();