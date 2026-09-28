import { Router } from "express";
import permissionController from "./permission.controller.js";

import { validate } from "../../../common/middlewares/zod.middleware.js";
import { CreatePermissionSchema } from "./permission.validator.js";
import { i18nMiddleware } from "../../../common/middlewares/i18n.middleware.js";
import checkPermission from "../../../common/middlewares/permissions.middleware.js";

const router = Router();
router.use(i18nMiddleware);

router.get('/', /* checkPermission('permission','read'), */ permissionController.index);
router.post('/', checkPermission('permission','create'), validate(CreatePermissionSchema), permissionController.create);
router.delete('/:id', checkPermission('permission','delete'), permissionController.remove);

export default router;