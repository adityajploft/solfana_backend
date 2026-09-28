import prisma from "../../config/db.config.js";

const formatPermissions = (rolePermissions) => {
  const permissions = {};

  rolePermissions.forEach((rp) => {
    const module = rp.permission.module;
    const action = rp.permission.action;

    if (!permissions[module]) {
      permissions[module] = {};
    }

    permissions[module][action] = true;
  });

  return permissions;
};


const checkPermission = (module, action="read") => {
    return async (req, res, next) => {
        try {
            const { fetchType } = req.query || {};
            
            if (fetchType === "dropdown") {
                return next();
            }
            
            const userId = req?.user?.id;

            if (!userId) {
                return res.status(401).json({
                message: "Unauthorized",
                });
            }

            const user = await prisma.user.findFirst({
                where: { id: userId },
                include: {
                    role: {
                        include: {
                            permissions: {
                                include: {
                                    permission: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!user) {
                return res.status(401).json({
                message: "User not found",
                });
            }

            const permissions = formatPermissions(user.role.permissions);
            // console.log(permissions?.[module]?.[action]);
            if (!permissions?.[module]?.[action]) {
                return res.status(403).json({
                    message: "Forbidden: Insufficient permission",
                    permissions: permissions,
                });
            }

            return next();
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                message: "Internal server error",
            });
        }
    }
}

export default checkPermission;