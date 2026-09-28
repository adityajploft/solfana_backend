import { Router } from "express";
import PushNotificationController from "./push-notification.controller.js";
import { i18nMiddleware } from "../../../common/middlewares/i18n.middleware.js";

const router = Router();

router.use(i18nMiddleware);

router.post("/", PushNotificationController.create);

router.post("/send/:id", PushNotificationController.send);

router.get("/", PushNotificationController.list);

router.get("/:id", PushNotificationController.getById);

router.put("/:id", PushNotificationController.update);

router.delete('/:id', PushNotificationController.remove);

export default router;