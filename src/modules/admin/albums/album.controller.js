import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import albumService from './album.service.js';
import uploadsService from '../../../common/services/uploads.service.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';
import HttpError from '../../../common/errors/http.error.js';

class AlbumController {


  create = async (req, res, next) => {
    try {
      const lang = (await getUserLanguage(req.user?.languageId)) || req.lang || 'en';

      const userId = req.user?.id;

      const result = await albumService.create({
        body: req.body,
        file: req.file,
        userId
      });

      return res.status(201).json(
        successResponse(
          t(lang, 'album', 'ALBUM_CREATED'),
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

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';

      const result = await albumService.index(lang, { page, limit, search, currentUser: req.user });

      res.json(
        successResponse(
          t(lang, 'album', 'ALBUM_LIST'),
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

      const result = await albumService.show(req.params.id, lang);

      res.json(
        successResponse(
          t(lang, 'album', 'ALBUM_DETAIL'),
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

      const userId = req.user?.id;

      const result = await albumService.update(
        req.params.id,
        req.body,
        userId
      );

      if (req.file) {
        const upload = await uploadsService.saveUpload({
          file: req.file,
          uploadType: 'COVER_IMAGE',
          entityType: 'ALBUM',
          entityId: result.id,
        });

        await albumService.attachCoverImage(result.id, upload.id);
      }

      res.json(
        successResponse(
          t(lang, 'album', 'ALBUM_UPDATED'),
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

      await albumService.remove(req.params.id);

      res.json(
        successResponse(
          t(lang, 'album', 'ALBUM_DELETED')
        )
      );
    } catch (error) {
      next(error);
    }
  };

  showBySlug = async (req, res, next) => {
    try {
      const lang =
        await getUserLanguage(req.user?.languageId) ||
        req.lang ||
        "en";

      const result = await albumService.showBySlug(
        req.params.slug,
        lang
      );

      res.json(
        successResponse(
          t(lang, "album", "ALBUM_DETAIL"),
          result
        )
      );
    } catch (error) {
      next(error);
    }
  };

  /* PODCASTER */

  async publishAlbum(req, res, next) {
    try {

      const lang = (await getUserLanguage(req.user?.languageId)) || req.lang || "en";

      const { id } = req.params;
      const userId = req.user.id;

      const result = await albumService.publishAlbum(id, req.user);

      let messageKey = "ALBUM_PUBLISHED_SUCCESS";

      if (result.status === "PENDING") {
        messageKey = "PUBLISH_REQUEST_SENT_TO_ADMIN";
      }

      res.json(
        successResponse(
          t(req.lang, "album", messageKey),
          result
        )
      );

    } catch (error) {
      next(error);
    }
  }

  async scheduleAlbum(req, res, next) {
    try {

      const lang = (await getUserLanguage(req.user?.languageId)) || req.lang || "en";

      const { id } = req.params;
      const { publishAt } = req.body;
      const userId = req.user.id;

      const result = await albumService.scheduleAlbum(id, publishAt, req.user);

      res.json(
        successResponse(
          t(lang, "album", "ALBUM_SCHEDULED_SUCCESS"),
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

      const result = await albumService.deleteSchedule(id);

      res.json(
        successResponse(
          t(lang, "album", "ALBUM_SCHEDULE_DELETED"),
          result
        )
      );

    } catch (error) {
      next(error);
    }
  }


  /* ================= ADMIN ================= */

  async getPublishRequests(req, res, next) {
    try {
      const lang = (await getUserLanguage(req.user?.languageId)) || req.lang || "en";

      if (req.user.roleId !== 1) {
        throw new HttpError(403, "UNAUTHORIZED", "unauthorized", "album");
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || "";
      const type = req.query.type || "";

      const result = await albumService.getPublishRequests(lang, {
        page,
        limit,
        search,
        type
      });

      res.json(
        successResponse(
          t(lang, "album", "PUBLISH_REQUEST_LIST"),
          result
        )
      );

    } catch (error) {
      next(error);
    }
  }

  async publishRequestAction(req, res, next) {
    try {

      const lang = (await getUserLanguage(req.user?.languageId)) || req.lang || "en";

      if (req.user.roleId !== 1) {
        throw new HttpError(403, 'UNAUTHORIZED', 'unauthorized', 'album');
      }

      const { requestId } = req.params;
      const { action } = req.body;

      const result = await albumService.publishRequestAction(
        requestId,
        action,
        req.user.id
      );

      res.json(
        successResponse(
          t(lang, "album", "PUBLISH_REQUEST_ACTION_DONE"),
          result
        )
      );

    } catch (error) {
      next(error);
    }
  }

  async bulkPublishRequestAction(req, res, next) {
    try {

      const lang = (await getUserLanguage(req.user?.languageId)) || req.lang || "en";

      if (req.user.roleId !== 1) {
        throw new HttpError(403, 'UNAUTHORIZED', 'unauthorized', 'album');
      }

      const { requestIds, action } = req.body;

      const result = await albumService.bulkPublishRequestAction(
        requestIds,
        action,
        req.user.id
      );

      res.json(
        successResponse(
          t(lang, "album", "BULK_REQUEST_ACTION_DONE"),
          result
        )
      );

    } catch (error) {
      next(error);
    }
  }
}

export default new AlbumController();