import { seedPermissions } from './permission.seed.js';
import { seedRoles } from './role.seed.js';
import { seedRolePermissions } from './role-permission.seed.js';
import { seedUsers } from './user.seed.js';
import { seedLanguages } from './language.seed.js';
import { categorySeed } from './category.seed.js';
import {subscriptionPlanSeed} from './subscriptionPlan.seed.js';

export async function runSeeds(prisma) {
  await seedLanguages(prisma);
  await seedPermissions(prisma);
  await seedRoles(prisma);
  await seedRolePermissions(prisma);
  await seedUsers(prisma);
  // await categorySeed(prisma);
  await subscriptionPlanSeed(prisma);

}