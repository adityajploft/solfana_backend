import bcrypt from 'bcrypt';

export async function seedUsers(prisma) {
  const hashedPassword = await bcrypt.hash('Superadmin@1234', 10);
  await prisma.user.upsert({
    where: { email: 'superadmin@solfana.com' },
    update: {},
    create: {
      email: 'superadmin@solfana.com',
      name: 'Super Admin',
      password: hashedPassword, // bcrypt hash
      roleId: 1, // Super Admin
      isActive: true,
      tokenVersion:0,
    },
  });

  await prisma.user.upsert({
    where: { email: 'developeradmin@solfana.com' },
    update: {},
    create: {
      email: 'developeradmin@solfana.com',
      name: 'Developer Admin',
      password: hashedPassword, // bcrypt hash
      roleId: 2, // Developer Admin
      isActive: true,
      tokenVersion:0,
    },
  });

  console.log('Users seeded');
}