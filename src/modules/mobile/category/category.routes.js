import { Router } from 'express';
import MobileCategoryController from './category.controller.js';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import { authenticate } from '../auth/authenticate.js';
import validateRootCategory from './category.validator.js';

const router = Router();

router.use(i18nMiddleware);
router.use(authenticate);

router.get('/search', MobileCategoryController.search);

// browse lists
router.get('/audiobooks', MobileCategoryController.audiobooks);
router.get('/podcasts', MobileCategoryController.podcasts);

// genre listing
router.get('/genres', MobileCategoryController.genres);
router.get('/genres-children/:categoryId',validateRootCategory,MobileCategoryController.getChildren);

// genre content
router.get('/genres/content/:id', MobileCategoryController.genreContent);

export default router;
