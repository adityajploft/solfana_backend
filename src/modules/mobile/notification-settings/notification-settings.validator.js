import { body } from 'express-validator';
import { ALL_NOTIFICATION_KEYS } from './notification.constants.js';

export const updateSettingsValidator = [
  body().custom((value) => {
    if (!value || typeof value !== 'object') {
      throw new Error('INVALID_REQUEST_BODY');
    }
    return true;
  }),
  body().custom((value) => {
    const keys = Object.keys(value);
    const invalidKeys = keys.filter(key => !ALL_NOTIFICATION_KEYS.includes(key));
    if (invalidKeys.length > 0) {
      throw new Error(`INVALID_NOTIFICATION_KEYS: ${invalidKeys.join(', ')}`);
    }
    return true;
  }),
  body('*').isBoolean().withMessage('VALUE_MUST_BE_BOOLEAN')
];