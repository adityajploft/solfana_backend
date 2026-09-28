export async function seedLanguages(prisma) {
  const languages = [
    {
      lang: 'en',
      name: 'English',
      isActive: true,
      isDefault: false,
    },
    {
      lang: 'fr',
      name: 'French',
      isActive: true,
      isDefault: true,
    },
  ];

  for (const language of languages) {
    await prisma.language.upsert({
      where: { lang: language.lang }, // unique key (recommended)
      update: {
        name: language.name,
        isActive: language.isActive,
        isDefault: language.isDefault,
      },
      create: {
        lang: language.lang,
        name: language.name,
        isActive: language.isActive,
        isDefault: language.isDefault,
      },
    });
  }
  
  console.log('✅ languages seeded');
}