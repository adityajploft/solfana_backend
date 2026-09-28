import { Router } from 'express';
import commonController from './common.controller.js';
import { authenticate } from '../auth/authenticate.js';

const router = Router();


router.get('/google-admob-settings', authenticate, commonController.getGoogleAdmobSettings);

router.get('/internal-audio-ads', authenticate, commonController.getInternalAudioAds);

router.get('/banner-ads', authenticate, commonController.getBanners);


export default router;