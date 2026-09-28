import { Router } from 'express';
import controller from './dashboard.controller.js';
import { authenticate } from '../auth/authenticate.js';

const router = Router();

router.get(
  '/',
  authenticate,
  controller.getDashboard
);

// See All Endpoints with Pagination
router.get(
  '/podcasters/all',
  authenticate,
  controller.getPodcasters
);

router.get(
  '/best-podcasts/all',
  authenticate,
  controller.getBestPodcasts
);

router.get(
  '/audiobooks/all',
  authenticate,
  controller.getAudiobooks
);

router.get(
  '/recommended-for-you/all',
  authenticate,
  controller.getRecommendedForYou
);

router.get(
  '/genres/all',
  authenticate,
  controller.getGenres
);

router.get(
  '/recently-played/all',
  authenticate,
  controller.getRecentlyPlayed
);

router.get(
  '/explore/:type/all',
  authenticate,
  controller.getExploreTrackAll
);

export default router;
