import { Router } from "express";
import NotificationCampaignController from "./notification-campaign.controller.js";
import { i18nMiddleware } from "../../../common/middlewares/i18n.middleware.js";

const router = Router();

router.use(i18nMiddleware);

router.post("/", NotificationCampaignController.create);

router.get("/", NotificationCampaignController.list);

router.get("/:id", NotificationCampaignController.show);

router.put("/:id", NotificationCampaignController.update);

router.delete('/:id', NotificationCampaignController.remove);

router.patch('/:id/change-status', NotificationCampaignController.changeStatus);

export default router;