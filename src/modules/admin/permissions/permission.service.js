import prisma from '../../../config/db.config.js';
import HttpError from '../../../common/errors/http.error.js';

class PermissionService {
   async index(dto) {
    try {
        const { page, limit, search } = dto;

        const permissionWhere = search
        ? {
            module: { contains: search, mode: 'insensitive' }
        }
        : {};

        const usePagination = page && limit;
        const skip = usePagination ? (page - 1) * limit : undefined;
        const take = usePagination ? limit : undefined;

        const modules = await prisma.permission.groupBy({
            by: ['module'],
            where: permissionWhere,
            orderBy: { module: 'asc' },
            skip,
            take,
        });

        const moduleNames = modules.map(m => m.module);

        const permissions = await prisma.permission.findMany({
            where: {
                module: { in: moduleNames }
            },
            orderBy: { id: 'desc' }
        });

        const groupedPermissions = {};

        for (const perm of permissions) {
            if (!groupedPermissions[perm.module]) {
                groupedPermissions[perm.module] = {
                    module: perm.module,
                    permissions: [],
                };
            }

            groupedPermissions[perm.module].permissions.push({
                id: perm.id,
                name: perm.action.trim(),
            });
        }

        const data = Object.values(groupedPermissions);

        const totalModules = await prisma.permission.groupBy({
            by: ['module'],
            where: permissionWhere,
        });

        const totalDocs = totalModules.length;

        return {
            records: data,
            pagination: {
                totalDocs,
                totalPages: usePagination
                    ? Math.ceil(totalDocs / limit)
                    : 1,
                page: usePagination ? page : 1,
                limit: usePagination ? limit : totalDocs,
            },
        };

    } catch (error) {
        throw new HttpError(
            401,
            'PERMISSION_LIST_FAILED',
            'permission_list_failed',
            'permission'
        );
    }
}



    async create(dto) {
        const { permissions } = dto;

        const data = permissions.flatMap(item =>
            item.actions.map(action => ({
                module: item.module.trim(),
                action: action.trim(),
                name: `${item.module.trim()}:${action.trim()}`,
            }))
        );

        // Check for existing permissions
        const existing = await prisma.permission.findMany({
            where: {
                name: { in: data.map(p => p.name) },
            },
            select: { name: true },
        });

        if (existing.length > 0) {
            throw new HttpError(
                409,
                'PERMISSION_ALREADY_EXISTS', 'permission_already_exists', 'permission',
                { names: existing.map(e => e.name) }
            );
        }

        // Create permissions
        try {
            await prisma.permission.createMany({
                data,
            });

            return { data };

        } catch (error) {
            throw new HttpError(401, 'PERMISSION_CREATE_FAILED', 'permission_create_failed', 'permission');
        }
    }


    async remove(id) {
        try {
            const permission = await prisma.permission.findUnique({
                where: { id },
            });

            if (!permission) {
                throw new HttpError(404, 'PERMISSION_NOT_FOUND', 'permission_not_found', 'permission');
            }

            //Check if permission is assigned to any role
            const assigned = await prisma.rolePermission.findFirst({
                where: { permissionId: id },
            });

            if (assigned) {
                throw new HttpError(401, 'PERMISSION_ASSIGNED', 'permission_assigned', 'permission');
            }

            const deleted = await prisma.permission.delete({
                where: { id },
            });

            return { data: deleted };

        } catch (error) {
            if (error instanceof HttpError) throw error;

            throw new HttpError(
                500,
                'PERMISSION_DELETE_FAILED',
                'permission_delete_failed',
                'permission'
            );
        }
    }


}

export default new PermissionService();
