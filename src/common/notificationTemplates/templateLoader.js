import { subscriptionAssignedNotificationTemplate } from './admin/subscriptionAssignedNotificationTemplate.js';
import { securityPolicyUpdateTemplate } from './admin/securityPolicyUpdateTemplate.js';
import { newReleaseTemplate } from './admin/newReleaseTemplate.js';
import { newCustomerNotificationTemplate } from './mobile/newCustomerNotificationTemplate.js';
import { reportContentNotificationTemplate } from './mobile/reportContentNotificationTemplate.js';

const TEMPLATE_MAP = {
  subscription_status: subscriptionAssignedNotificationTemplate,
  security_policy: securityPolicyUpdateTemplate,
  new_releases: newReleaseTemplate,

  // ✅ multiple templates under one key
  account_activity: [
    {
      type: 'NEW_CUSTOMER',
      template: newCustomerNotificationTemplate
    },
    {
      type: 'REPORT_CONTENT',
      template: reportContentNotificationTemplate
    }
  ],
};

export const getNotificationTemplate = (key, data, lang = 'fr') => {
  const entry = TEMPLATE_MAP[key];

  // ❌ no key found
  if (!entry) {
    return {
      title: 'Notification',
      description: '',
    };
  }

  // ✅ if multiple templates (array)
  if (Array.isArray(entry)) {
    const match = entry.find(item => item.type === data?.notificationkeyType);

    if (match) {
      return match.template(data, lang);
    }

    // fallback if no type matched
    return {
      title: 'Account Activity',
      description: '',
    };
  }

  // ✅ single template
  return entry(data, lang);
};