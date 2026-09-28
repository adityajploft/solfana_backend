import prisma from '../../config/db.config.js';

export const i18nMiddleware = async (req, res, next) => {
  try {
    let lang = 'en';

    const headerLang = req.headers['accept-language'];

    if (headerLang) {
      lang = headerLang.split(',')[0].split('-')[0];
    }else{
      if (req.user?.languageId) {
        const l = await prisma.language.findUnique({
          where: { id: req.user.languageId },
        });
        
        if (l) {
          lang = l.lang;
        }
      }
    }
    
    req.lang = lang;
    next();
  } catch {
    req.lang = 'en';
    next();
  }
};
