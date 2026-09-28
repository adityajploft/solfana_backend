import { t } from '../../../common/services/i18n/i18n.service.js';
import { successResponse } from '../../../common/utils/apiResponse.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';
import mobileCategoryService from './category.service.js';

class MobileCategoryController {

  async search(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId);

      const result = await mobileCategoryService.search(req.query, req.user?.languageId);

      res.json(successResponse(
        t(lang, 'category', 'SEARCH_RESULTS_FETCHED'),
        result
      ));
    } catch (e) {
      next(e);
    }
  }

  async podcasts(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId);
      const userId = req.user?.id;
      const result = await mobileCategoryService.browseByType('PODCAST', req.query, userId, req.user?.languageId);

      res.json(successResponse(
        t(lang, 'category', 'PODCAST_CATEGORIES_FETCHED'),
        result
      ));
    } catch (e) {
      next(e);
    }
  }

  async audiobooks(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId);
      const userId = req.user?.id;
      const result = await mobileCategoryService.browseByType(
        'AUDIOBOOK',
        req.query,
        userId,
        req.user?.languageId
      );

      res.json(successResponse(
        t(lang, 'category', 'AUDIOBOOK_CATEGORIES_FETCHED'),
        result
      ));
    } catch (e) {
      next(e);
    }
  }

  async genres(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId);

      const result = await mobileCategoryService.genres(req.query, lang);

      res.json(successResponse(
        t(lang, 'category', 'GENRES_FETCHED'),
        result
      ));
    } catch (e) {
      next(e);
    }
  }

  async getChildren(req, res, next) {
    try {
      const { categoryId } = req.params;

      const lang = await getUserLanguage(req.user?.languageId);

      const result = await mobileCategoryService.getChildren(
        categoryId,
        req.query,
        lang
      );

      res.json(
        successResponse(
          t(lang, 'category', 'SUBCATEGORY_FETCHED'),
          result
        )
      );
    } catch (e) {
      next(e);
    }
  }

  async genreContent(req, res, next) {
    try {
      const lang = await getUserLanguage(req.user?.languageId);

      const result = await mobileCategoryService.genreContent(
        req.params.id,
        req.query,
        lang
      );

      res.json(successResponse(
        t(lang, 'category', 'GENRE_CONTENT_FETCHED'),
        result
      ));
    } catch (e) {
      next(e);
    }
  }

}

export default new MobileCategoryController();
