import prisma from '../../../config/db.config.js';
import HttpError from '../../../common/errors/http.error.js';
import { notificationQueue } from '../../../common/queues/notification.queue.js';

const SETTINGS_MAP = {
  'about-us': {
    en: 'about_en',
    fr: 'about_fr',
    defaultEnTitle: 'About Us',
    defaultFrTitle: 'À propos de nous',
    posEn: 1,
    posFr: 2,
  },

  'terms-condition': {
    en: 'terms_conditions_en',
    fr: 'terms_conditions_fr',
    defaultEnTitle: 'Terms & Conditions',
    defaultFrTitle: "Conditions d'utilisation",
    posEn: 3,
    posFr: 4,
  },

  'privacy-policy': {
    en: 'privacy_policy_en',
    fr: 'privacy_policy_fr',
    defaultEnTitle: 'Privacy Policy',
    defaultFrTitle: 'Politique de confidentialité',
    posEn: 5,
    posFr: 6,
  }
};

const allowedTargeting = {
  "NONE" : "None",
  'ALL_USERS' : "All Users",
  'FREE_USERS_ONLY' : "Free Users Only",
  'PREMIUM_USERS_ONLY' : "Premium Users Only",
};

class SettingsService {

  async getByType(type) {
    const map = SETTINGS_MAP[type];
    if (!map) throw new HttpError('INVALID_CONTENT_KEY');

    const en = await prisma.setting.findUnique({
      where: { key: map.en }
    });

    const fr = await prisma.setting.findUnique({
      where: { key: map.fr }
    });

    return {
      en: en ? JSON.parse(en.value || '{}') : {
        title: map.defaultEnTitle,
        content: ''
      },
      fr: fr ? JSON.parse(fr.value || '{}') : {
        title: map.defaultFrTitle,
        content: ''
      },
      updatedAt: Math.max(
        en?.updatedAt?.getTime() || 0,
        fr?.updatedAt?.getTime() || 0
      )
    };
  }

  async updateByType(type, data) {
    const map = SETTINGS_MAP[type];
    if (!map) throw new HttpError('INVALID_CONTENT_KEY');

    const updates = [];

    if (data.en) {
      const value = JSON.stringify({
        title: data.en.title || map.defaultEnTitle,
        content: data.en.content || '',
        updatedAt: new Date().toISOString()
      });

      updates.push(
        prisma.setting.upsert({
          where: { key: map.en },
          update: { value, updatedAt: new Date() },
          create: {
            key: map.en,
            value,
            type: 'text',
            displayName: `${map.defaultEnTitle} (English)`,
            group: 'content',
            status: true,
            position: map.posEn,
          }
        })
      );
    }

    if (data.fr) {
      const value = JSON.stringify({
        title: data.fr.title || map.defaultFrTitle,
        content: data.fr.content || '',
        updatedAt: new Date().toISOString()
      });

      updates.push(
        prisma.setting.upsert({
          where: { key: map.fr },
          update: { value, updatedAt: new Date() },
          create: {
            key: map.fr,
            value,
            type: 'text',
            displayName: `${map.defaultEnTitle} (French)`,
            group: 'content',
            status: true,
            position: map.posFr,
          }
        })
      );
    }

    if (!updates.length) {
      throw new HttpError('VALIDATION_ERROR');
    }

    await prisma.$transaction(updates);

    // ✅ Send notification ONLY for specific types
    if (['privacy-policy', 'terms-condition'].includes(type)) {
      const notifyUser = data.notify_user || "false";
      
      if(notifyUser === "true"){
        await notificationQueue.add('policy-update', { type, });
      }
    }

    return this.getByType(type);
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


  async upsertSupportSettings(data) {
    const updates = [];

    if (data.email) {
      updates.push(
        prisma.setting.upsert({
          where: { key: 'support_email' },
          update: {
            value: data.email,
            updatedAt: new Date()
          },
          create: {
            key: 'support_email',
            value: data.email,
            type: 'text',
            displayName: 'Support Email',
            group: 'support',
            status: true,
            position: 1
          }
        })
      );
    }

    if (data.phone) {
      updates.push(
        prisma.setting.upsert({
          where: { key: 'support_contact' },
          update: {
            value: data.phone,
            updatedAt: new Date()
          },
          create: {
            key: 'support_contact',
            value: data.phone,
            type: 'text',
            displayName: 'Support Phone',
            group: 'support',
            status: true,
            position: 2
          }
        })
      );
    }

    if (!updates.length) {
      throw new HttpError('VALIDATION_ERROR');
    }

    await prisma.$transaction(updates);

    return this.getSupportSettings();
  }


  async getgoogleAdMobSettings() {    
    const settings = await prisma.setting.findMany({
      where: { group: 'google-admob', status: true },
      select: { key: true, value: true, type: true }
    });

    const response = {
      target_options : allowedTargeting,
      admob_enabled: true,
      admob_user_targeting: "FREE_USERS_ONLY",
    };

    for (const s of settings) {
      let parsedValue = s.value;
      if (s.type === 'boolean') {
        parsedValue = s.value === 'true';
      }

      response[s.key] = parsedValue || null;
    }

    return response;
  }

  async upsertgoogleAdMobSettings(data) {
    const settingMap = [
      {
        key: 'admob_enabled',
        value: data.admob_enabled,
        type: 'boolean',
        displayName: 'Enable AdMob Ads',
        position: 1,
        transform: (v) => String(v) // store as "true"/"false"
      },
      {
        key: 'admob_user_targeting',
        value: data.admob_user_targeting,
        type: 'dropdown',
        displayName: 'AdMob User Targeting',
        position: 2
      }
    ];

    if (!Object.keys(allowedTargeting).includes(data.admob_user_targeting)) {
      throw new HttpError('INVALID_TARGETING');
    }
    
    const updates = settingMap.filter(s => s.value !== undefined).map(s =>
      prisma.setting.upsert({
        where: { key: s.key },
        update: {
          value: s.transform ? s.transform(s.value) : s.value,
          updatedAt: new Date()
        },
        create: {
          key: s.key,
          value: s.transform ? s.transform(s.value) : s.value,
          type: s.type,
          displayName: s.displayName,
          group: 'google-admob',
          status: true,
          position: s.position
        }
      })
    );

    if (!updates.length) {
      throw new HttpError('VALIDATION_ERROR');
    }

    await prisma.$transaction(updates);

    return this.getgoogleAdMobSettings();
  }
}

export default new SettingsService();
