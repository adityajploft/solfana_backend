import { Router } from 'express';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import { authenticate } from '../auth/authenticate.js';
import AlbumController from './album.controller.js';

const router = Router();

router.use(i18nMiddleware);
router.use(authenticate);

router.get('/:albumId/tracks',authenticate,AlbumController.getAlbumTracks);

router.get('/:albumId',authenticate,AlbumController.AlbumDetails);






export default router;
