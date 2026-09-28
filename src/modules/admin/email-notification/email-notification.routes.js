import { Router } from "express";
import emailController from "./email-notification.controller.js";
import { i18nMiddleware } from "../../../common/middlewares/i18n.middleware.js";
import { uploadMiddleware } from "../../../common/utils/globalUploader.js";

const router = Router();

router.use(i18nMiddleware);

router.post("/", uploadMiddleware.multiple("attachments", 5), emailController.create);

router.post("/send/:id", emailController.send);

router.get("/", emailController.list);

router.get("/:id", emailController.getById);

router.put("/:id", uploadMiddleware.multiple("attachments", 5), emailController.update);

router.delete('/:id', emailController.remove);

export default router;