import { Router } from 'express';
import controller from './settings.controller.js';
import { authenticate } from '../../../common/middlewares/auth.middleware.js';
import { validate } from '../../../common/middlewares/zod.middleware.js';
import { supportValidator, updateContentValidator } from './settings.validator.js';
import checkPermission from '../../../common/middlewares/permissions.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/',checkPermission('settings','view'), controller.getByType);
router.patch('/',checkPermission('settings','update'), validate(updateContentValidator), controller.updateByType);

router.get('/support-email',checkPermission('settings','view'), controller.show);
router.post('/support-email',checkPermission('settings','update'), validate(supportValidator),controller.create);

router.get('/google-admob',checkPermission('settings','view'), controller.googleAdMob);
router.post('/google-admob',checkPermission('settings','update'), controller.createGoogleAdMob);

export default router;
