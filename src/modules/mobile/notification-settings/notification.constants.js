export const NOTIFICATION_CATEGORIES = {
  LISTENING_CONTENT: {
    id: 'listening_content',
    translationKey: 'CATEGORY_LISTENING_CONTENT',
    notifications: [
      {
        key: 'new_releases',
        labelKey: 'NOTIFICATION_NEW_RELEASES',
        descriptionKey: 'DESC_NEW_RELEASES',
        category: 'listening_content'
      },
      {
        key: 'editorial_picks',
        labelKey: 'NOTIFICATION_EDITORIAL_PICKS',
        descriptionKey: 'DESC_EDITORIAL_PICKS',
        category: 'listening_content'
      }
    ]
  },
  PERSONALIZED: {
    id: 'personalized',
    translationKey: 'CATEGORY_PERSONALIZED',
    notifications: [
      {
        key: 'recommended_for_you',
        labelKey: 'NOTIFICATION_RECOMMENDED',
        descriptionKey: 'DESC_RECOMMENDED',
        category: 'personalized'
      },
      {
        key: 'continue_listening',
        labelKey: 'NOTIFICATION_CONTINUE_LISTENING',
        descriptionKey: 'DESC_CONTINUE_LISTENING',
        category: 'personalized'
      }
    ]
  },
  ACTIVITY_LIBRARY: {
    id: 'activity_library',
    translationKey: 'CATEGORY_ACTIVITY_LIBRARY',
    notifications: [
      {
        key: 'favorites_updates',
        labelKey: 'NOTIFICATION_FAVORITES',
        descriptionKey: 'DESC_FAVORITES',
        category: 'activity_library'
      },
      {
        key: 'playlist_activity',
        labelKey: 'NOTIFICATION_PLAYLIST',
        descriptionKey: 'DESC_PLAYLIST',
        category: 'activity_library'
      }
    ]
  },
  SUBSCRIPTION_ACCOUNT: {
    id: 'subscription_account',
    translationKey: 'CATEGORY_SUBSCRIPTION',
    notifications: [
      {
        key: 'subscription_status',
        labelKey: 'NOTIFICATION_SUBSCRIPTION_STATUS',
        descriptionKey: 'DESC_SUBSCRIPTION_STATUS',
        category: 'subscription_account'
      },
      {
        key: 'payment_billing',
        labelKey: 'NOTIFICATION_PAYMENT',
        descriptionKey: 'DESC_PAYMENT',
        category: 'subscription_account'
      },
      {
        key: 'account_activity',
        labelKey: 'NOTIFICATION_ACCOUNT',
        descriptionKey: 'DESC_ACCOUNT',
        category: 'subscription_account'
      }
    ]
  },
  DOWNLOADS: {
    id: 'downloads',
    translationKey: 'CATEGORY_DOWNLOADS',
    notifications: [
      {
        key: 'download_completed',
        labelKey: 'NOTIFICATION_DOWNLOAD_COMPLETED',
        descriptionKey: 'DESC_DOWNLOAD_COMPLETED',
        category: 'downloads'
      },
      {
        key: 'download_failed',
        labelKey: 'NOTIFICATION_DOWNLOAD_FAILED',
        descriptionKey: 'DESC_DOWNLOAD_FAILED',
        category: 'downloads'
      }
    ]
  },
  SYSTEM_UPDATES: {
    id: 'system_updates',
    translationKey: 'CATEGORY_SYSTEM_UPDATES',
    notifications: [
      {
        key: 'app_updates',
        labelKey: 'NOTIFICATION_APP_UPDATES',
        descriptionKey: 'DESC_APP_UPDATES',
        category: 'system_updates'
      },
      {
        key: 'security_policy',
        labelKey: 'NOTIFICATION_SECURITY_POLICY',
        descriptionKey: 'DESC_SECURITY_POLICY',
        category: 'system_updates'
      }
    ]
  }
};

export const ALL_NOTIFICATION_KEYS = [
  'new_releases',
  'editorial_picks',
  'recommended_for_you',
  'continue_listening',
  'favorites_updates',
  'playlist_activity',
  'subscription_status',
  'payment_billing',
  'account_activity',
  'download_completed',
  'download_failed',
  'app_updates',
  'security_policy'
];