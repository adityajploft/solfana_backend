import { Router } from 'express';
import controller from './notification-settings.controller.js';
import validate from '../../../common/middlewares/validate.js';
import { authenticate } from '../auth/authenticate.js';
import { updateSettingsValidator } from './notification-settings.validator.js';
import { i18nMiddleware } from '../../../common/middlewares/i18n.middleware.js';

const router = Router();
router.use(i18nMiddleware);
router.use(authenticate);

router.get('/', controller.getSettings);
router.put('/', updateSettingsValidator, validate, controller.updateSettings);

export default router;