import { Router } from 'express';
import AdCampaignController from './ad-campaign.controller.js';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';
import upload from '../../../common/utils/globalUploader.js';
import { uploadMiddleware } from '../../../common/utils/globalUploader.js';

const router = Router();
router.use(i18nMiddleware);


router.post('/', AdCampaignController.create);

router.get('/', AdCampaignController.index);

router.get('/:id', AdCampaignController.show);

router.put('/:id', AdCampaignController.update);

router.delete('/:id', AdCampaignController.remove);

router.patch('/:id/change-status', AdCampaignController.changeStatus);

export default router;