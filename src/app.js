import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';

import setupSwagger from './config/swagger.js'; 

import adminRoutes from './modules/admin/admin.routes.js';
import mobileRoutes from './modules/mobile/mobile.routes.js';

import { i18nMiddleware } from './common/middlewares/i18n.middleware.js';
import { errorHandler } from './common/middlewares/error.middleware.js';

import path from 'path';
import paymentController from './modules/mobile/payment/payment.controller.js';
import { globalLimiter } from './common/middlewares/rateLimiter.middleware.js';

const app = express();

app.set('trust proxy', 1);
 
app.use(
  cors({
    origin: "*",
  })
);
app.use(helmet());
app.use(morgan('dev'));

app.use(globalLimiter);

app.post('/api/mobile/payment/webhook', express.raw({ type: 'application/json' }), paymentController.webhook);

app.use(express.json());
app.use(i18nMiddleware);

setupSwagger(app);

app.use(express.urlencoded({ extended: true }));

app.use(
  '/uploads',
  express.static(path.join(process.cwd(), 'uploads'))
);

app.use('/api/admin',adminRoutes);
app.use('/api/mobile',mobileRoutes);


app.use(errorHandler);



export default app;