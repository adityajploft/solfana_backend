import { emailLayout } from "../emailLayout.js";

export const emailNotificationTemplate = (subject, body) => {
    return { subject: subject, html: emailLayout(body) };
};