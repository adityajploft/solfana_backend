import prisma from '../../../config/db.config.js';
import HttpError from '../../../common/errors/http.error.js';

class RoleService {
  // CREATE ROLE
  async create(dto) {
    const { roleName, permissionIds = [] } = dto;

    const existing = await prisma.role.findUnique({
      where: { name: roleName },
    });

    if (existing) {
      throw new HttpError(409, 'ROLE_EXISTS', 'role_exists', 'role');
    }

    if (permissionIds.length) {
      const permissions = await prisma.permission.findMany({
        where: {
          id: { in: permissionIds },
          isActive: true,
        },
      });

      if (permissions.length !== permissionIds.length) {
        throw new HttpError(400, 'INVALID_PERMISSIONS', 'invalid_permissions', 'role');
      }
    }

    const role = await prisma.role.create({
      data: { name: roleName },
    });

    if (permissionIds.length) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map(permissionId => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }

    return {
      data: {
        id: role.id,
        name: role.name,
      },
    };
  }

  // GET ALL ROLES
  async index(type) {
    let notInRoles = [1, 2];
    if(type == "dropdown"){
      notInRoles.push(4);
    }
    
    const roles = await prisma.role.findMany({
      where: {
        id: {
          notIn: notInRoles, 
        },
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
       orderBy: {
        id: 'desc',
      },
    });

    const data = roles.map(role => {
      const permissionsByModule = {};

      role.permissions.forEach(rp => {
        const { module, action } = rp.permission;

        if (!permissionsByModule[module]) {
          permissionsByModule[module] = [];
        }

        permissionsByModule[module].push(action);
      });

      return {
        id: role.id,
        name: role.name,
        permissionsByModule,
      };
    });

    return { data };
  }

  // GET ROLE BY ID
  async show(id) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: { permissions: true },
    });

    if (!role) {
      throw new HttpError(404, 'ROLE_NOT_FOUND', 'role_not_found', 'role');
    }

    return {
      data: {
        id: role.id,
        name: role.name,
        permissionIds: role.permissions.map(p => p.permissionId),
      },
    };
  }

  // UPDATE ROLE
  async update(id, dto) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new HttpError(404, 'ROLE_NOT_FOUND', 'role_not_found', 'role');

    if (dto.roleName) {
      const duplicate = await prisma.role.findFirst({
        where: { name: dto.roleName, NOT: { id } },
      });

      if (duplicate) {
        throw new HttpError(400, 'ROLE_EXISTS', 'role_exists', 'role');
      }

      await prisma.role.update({
        where: { id },
        data: { name: dto.roleName },
      });
    }

    if (dto.permissionIds?.length) {
      const permissions = await prisma.permission.findMany({
        where: { id: { in: dto.permissionIds } },
        select: { id: true },
      });

      const validIds = permissions.map(p => p.id);
      const invalidIds = dto.permissionIds.filter(
        id => !validIds.includes(id),
      );

      if (invalidIds.length) {
        throw new HttpError(400, 'INVALID_PERMISSIONS', 'invalid_permissions', 'role');
      }

      await prisma.rolePermission.deleteMany({
        where: { roleId: id },
      });

      await prisma.rolePermission.createMany({
        data: dto.permissionIds.map(permissionId => ({
          roleId: id,
          permissionId,
        })),
      });
    }

    return { data: true };
  }

  // DELETE ROLE
  async remove(id) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new HttpError(404, 'ROLE_NOT_FOUND', 'role_not_found', 'role');

    const userExists = await prisma.user.findFirst({
      where: { roleId: id },
      select: { id: true }
    });

    if (userExists) {
      throw new HttpError(400, 'ROLE_IN_USE', 'role_in_use', 'role');
    }

    await prisma.rolePermission.deleteMany({
      where: { roleId: id },
    });

    await prisma.role.delete({
      where: { id },
    });

    return { data: true };  
  }
}

export default new RoleService();
