export async function seedRolePermissions(prisma) {
  const rolePermissionsConfig = {
    'Developer Admin': {
      type: 'all', // Gets all permissions
    },

    'Super Admin': {
      type: 'all', // Gets all permissions
      excludeModule: ['permission']
    },
    
    'Admin': {
      type: 'explicit', // Explicitly list permissions
      permissions: [
        // Dashboard
        'dashboard.view',

        // Profile
        'profile.view',
        'profile.update',
        'profile.change_password',
        
        // Categories
        'category.create',
        'category.read',
        'category.update',
        'category.delete',

        // Sub Categories
        'subCategory.create',
        'subCategory.read',
        'subCategory.update',
        'subCategory.delete',
        
        // Users
        'user.create',
        'user.read',
        'user.update',
        'user.delete',

        // Podcaster
        'podcaster.create',
        'podcaster.read',
        'podcaster.update',
        'podcaster.delete',
        
         // Own Podcasts
        'album.create',
        'album.read',
        'album.update',
        'album.delete', // only own
        'album.publishRequests',
        'album.acceptPublishRequest',
        'album.rejectPublishRequest',
        
        // Own Episodes
        'track.create',
        'track.read',
        'track.update',
        'track.delete', // only own

        // Own audio library
        'audioLibrary.create',
        'audioLibrary.read',
        'audioLibrary.delete',
        
        // Settings
        'settings.view',
        'settings.update',
      ],
    },
    
    'Podcaster': {
      type: 'explicit',
      permissions: [
        // Dashboard
        'dashboard.view',

        // Profile
        'profile.view',
        'profile.update',
        'profile.change_password',
        
        // Own Podcasts
        'album.create',
        'album.read',
        'album.update',
        'album.delete', // only own
        'album.publishRequests', // only own
        
        // Own Episodes
        'track.create',
        'track.read',
        'track.update',
        'track.delete', // only own

        // Own audio library
        'audioLibrary.create',
        'audioLibrary.read',
        'audioLibrary.delete',
      ],
    },
  };

  const roles = await prisma.role.findMany();
  const allPermissions = await prisma.permission.findMany();

  // Create a map for quick lookup
  const permissionMap = new Map();
  allPermissions.forEach(p => {
    permissionMap.set(`${p.module}.${p.action}`, p);
  });

  const rolePermissionsToCreate = [];

  for (const role of roles) {
    const config = rolePermissionsConfig[role.name];

    if (!config) {
      console.log(`No config for role: ${role.name}`);
      continue;
    }

    let permissionsToAssign = [];

    if (config.type === 'all') {
      // Super Admin gets everything
      permissionsToAssign = allPermissions.filter(
        (perm) => !config.excludeModule?.includes(perm.module)
      );
      console.log(`${role.name}: ALL permissions (${permissionsToAssign.length})`);
    } else if (config.type === 'explicit') {
      // Specific permissions
      for (const permName of config.permissions) {
        const permission = permissionMap.get(permName);
        if (permission) {
          permissionsToAssign.push(permission);
        } else {
          console.log(`Permission not found: ${permName}`);
        }
      }
      console.log(`${role.name}: ${permissionsToAssign.length} permissions`);
    }

    // Prepare for batch insert
    for (const perm of permissionsToAssign) {
      rolePermissionsToCreate.push({
        roleId: role.id,
        permissionId: perm.id,
      });
    }
  }

  // Batch insert
  await prisma.rolePermission.createMany({
    data: rolePermissionsToCreate,
    skipDuplicates: true,
  });

  console.log(`\n${rolePermissionsToCreate.length} role-permission assignments created`);
}