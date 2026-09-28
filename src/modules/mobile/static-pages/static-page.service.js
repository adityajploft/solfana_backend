import prisma from '../../../config/db.config.js';
import emailService from '../../../common/services/email.service.js';
import { getUserLanguage } from '../../../common/utils/getLanguageById.js';
import { getAdminData } from '../../../common/utils/helper.js';

class StaticPageService {
  async getAllSettings(lang = 'en') {
    const settings = await prisma.setting.findMany({
      where: {
        deletedAt: null,
        status: true,
        key: {
          endsWith: `_${lang}`
        }
      },
      orderBy: {
        position: 'asc'
      }
    });

    const formatted = {};

    settings.forEach(setting => {
      let value = setting.value;
      if (setting.type === 'json' && setting.value) {
        try {
          value = JSON.parse(setting.value);
        } catch (e) { }
      }

      const key = setting.key.replace(`_${lang}`, '');

      formatted[key] = {
        value,
        type: setting.type,
        displayName: setting.displayName,
        group: setting.group,
        position: setting.position,
        updatedAt: setting.updatedAt
      };
    });

    return {
      settings: formatted,
      language: lang,
      count: settings.length,
      lastUpdated: settings.length > 0
        ? Math.max(...settings.map(s => s.updatedAt.getTime()))
        : null
    };
  }

  async getSupportSettings() {
    const email = await prisma.setting.findUnique({
      where: { key: 'support_email' }
    });

    const phone = await prisma.setting.findUnique({
      where: { key: 'support_contact' }
    });

    return {
      email: email?.value || null,
      phone: phone?.value || null,
      updatedAt: Math.max(
        email?.updatedAt?.getTime() || 0,
        phone?.updatedAt?.getTime() || 0
      )
    };
  }

  async delete(customer) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { deletedAt: new Date() },
    });

    return {};
  }

  async setStatus(customer, status, email) {

    const customerId = customer.id;

    const alreadyIntersetExist = await prisma.becomePodcasterInterest.findFirst({
      where: { customerId, email },
      select: { id: true }
    });

    if(!alreadyIntersetExist){
      // send mail to admin
      const admin = await getAdminData();
      
      customer.email = email;

      const lang = await getUserLanguage(admin?.languageId);
      await emailService.sendBecomePodcasterMail(admin, customer, lang);
    }


    return prisma.becomePodcasterInterest.upsert({
      where: { customerId, email },
      update: { status, email },
      create: { customerId, status, email }
    });
  }

}

export default new StaticPageService();