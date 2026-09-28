import { Router } from 'express';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import { authenticate } from '../auth/authenticate.js';
import playlistController from './playlist.controller.js';

const router = Router();

router.use(i18nMiddleware);
router.use(authenticate);

router.post('/', playlistController.create);
router.get('/', playlistController.list);
router.delete('/:playlistId', playlistController.delete);
router.post('/:playlistId/tracks', playlistController.addTracks);
router.delete('/tracks/:trackId', playlistController.removeTrack);
router.get('/:playlistId', playlistController.details);
router.get('/:playlistId/tracks', playlistController.getPlaylistTracks);






export default router;
