import { Router } from 'express';
import controller from './static-page.controller.js';
import validateBecomePartner from './static-page.validator.js';
import { authenticate } from '../auth/authenticate.js';

const router = Router();


router.get('/settings', controller.getAllSettings);
router.get('/support-email', controller.getSupportEmail);

router.post('/become-podcaster',authenticate, validateBecomePartner,controller.set);

router.post('/delete-account',authenticate, controller.delete);

export default router;