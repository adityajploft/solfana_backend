import { reminderCron } from './subscription-crons/reminder.cron.js';
import { endDateCron } from './subscription-crons/endDate.cron.js';
import { expireCron } from './subscription-crons/expire.cron.js';

export const subscriptionCrons = () => {

    reminderCron();
    endDateCron();
    expireCron();

    console.log("All crons initialized ✅");
};