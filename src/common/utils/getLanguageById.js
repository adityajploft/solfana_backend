import prisma from '../../config/db.config.js';

export async function getUserLanguage(languageId) {
  try {
    if (languageId) {
      const language = await prisma.language.findUnique({
        where: { id: Number(languageId) },
        select: { lang: true }
      });

      if (language?.lang) {
        return language.lang;
      }
    }

    const defaultLang = await prisma.language.findFirst({
      where: { isDefault: true },
      select: { lang: true }
    });

    return defaultLang?.lang || 'en';

  } catch (error) {
    console.error('getUserLanguage error:', error);
    return 'en';
  }
}
