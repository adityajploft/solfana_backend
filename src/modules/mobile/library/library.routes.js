import { Router } from 'express';
import LibraryController from './library.controller.js';
import { authenticate } from '../auth/authenticate.js';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';

const router = Router();

router.use(i18nMiddleware);
router.use(authenticate);

router.get('/', LibraryController.index);
router.post('/', LibraryController.toggleLibrary);


router.post('/favorite', LibraryController.toggleFavorite);
router.post('/like', LibraryController.toggleLike);

router.get('/favorites', LibraryController.seeAllFavorites);
router.get('/likes', LibraryController.seeAllLikes);


export default router;