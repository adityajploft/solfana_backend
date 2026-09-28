export async function seedRoles(prisma) {
  const roles = ['Super Admin',"Developer Admin", 'Admin', 'Podcaster'];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role },
      update: {},
      create: { name: role },
    });
  }

  console.log('Roles seeded');
}