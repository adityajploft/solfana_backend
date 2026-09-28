
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { resetPasswordTemplate } from '../emailTemplates/mobile/resetPasswordTemplate.js';
import { admniResetPasswordTemplate } from '../emailTemplates/admin/admniResetPasswordTemplate.js';
import { verifyOtpTemplate } from '../emailTemplates/mobile/verifyOtpTemplate.js';
import { welcomeEmailTemplate } from '../emailTemplates/mobile/welcomeEmailTemplate.js';
import { paymentSuccessUserMailTemplate } from '../emailTemplates/mobile/paymentSuccessUserMailTemplate.js';
import { paymentFailedUserMailTemplate } from '../emailTemplates/mobile/paymentFailedUserMailTemplate.js';
import { subscriptionReminderTemplate } from '../emailTemplates/mobile/subscriptionReminderTemplate.js';
import { subscriptionExpireTemplate } from '../emailTemplates/mobile/subscriptionExpireTemplate.js';
import { subscriptionPaymentLinkTemplate } from '../emailTemplates/mobile/subscriptionPaymentLinkTemplate.js';
import { becomePodcasterMailTemplate } from '../emailTemplates/mobile/becomePodcasterMailTemplate.js';
import { podcasterFollowMailTemplate } from '../emailTemplates/mobile/podcasterFollowMailTemplate.js';
import { newCustomerRegistrationAdminTemplate } from '../emailTemplates/mobile/newCustomerRegistrationAdminTemplate.js';
import { reportContentAdminTemplate } from '../emailTemplates/mobile/reportContentAdminTemplate.js';
import { reportContentPodcasterTemplate } from '../emailTemplates/mobile/reportContentPodcasterTemplate.js';
import { emailNotificationTemplate } from '../emailTemplates/admin/emailNotificationTemplate.js';

class EmailService {

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';

    if (this.isDevelopment) {
      this.transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT),
        secure: false,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASSWORD,
        },
      });
    } else {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
  }

  async sendMail(to, subject, html, attachments = []) {
    if (this.isDevelopment) {
      return await this.transporter.sendMail({
        from: process.env.MAIL_FROM, 
        to, 
        subject, 
        html, 
        attachments: attachments.map((url, index) => ({
          filename: url.split("/").pop()?.split("?")[0] || `attachment-${index + 1}`,
          path: url, // ✅ URL works directly
        })),
      });
    }

    return await this.resend.emails.send({
      from: process.env.MAIL_FROM, 
      to, 
      subject, 
      html,
      attachments: await Promise.all(
        attachments.map(async (url, index) => {
          const response = await fetch(url);
          const buffer = await response.arrayBuffer();

          return {
            filename: url.split("/").pop()?.split("?")[0] || `attachment-${index + 1}`,
            content: Buffer.from(buffer), // ✅ required by Resend
          };
        })
      ),
    });
  }

  async sendOtp(email, otp, lang = 'en') {
    const template = verifyOtpTemplate(otp, lang);

    return this.sendMail(email, template.subject, template.html);
  }

  async sendWelcomeEmail(email, name = null, lang = 'en') {
    const supportedLanguages = ['en', 'fr'];
    const language = supportedLanguages.includes(lang) ? lang : 'en';

    const template = welcomeEmailTemplate(name, language);
    return this.sendMail(email, template.subject, template.html);
  }

  async sendResetPasswordEmail(email, token, lang = 'en') {
    const template = admniResetPasswordTemplate(token, lang);

    return this.sendMail(email, template.subject, template.html);
  }

  async sendMobileResetPasswordEmail(email, otp, lang = 'en') {
    const template = resetPasswordTemplate(otp, lang);

    return this.sendMail(email, template.subject, template.html);
  }

  async sendMailOnSubscriptionPurchase(planData, userData, type, lang='en'){
    let template;
    if(type === 'user'){
      template = paymentSuccessUserMailTemplate(planData, userData, lang);
    }

    return this.sendMail(userData.email, template.subject, template.html);
  }

  async sendMailOnSubscriptionPaymentFailed(planData, userData, type, lang='en'){
    let template;
    if(type === 'user'){
      template = paymentFailedUserMailTemplate(planData, userData, lang);
    }

    return this.sendMail(userData.email, template.subject, template.html);
  }

  // Subscription reminder
  async sendSubscriptionReminder({user, plan, endDate, daysLeft}, lang){
    let template = subscriptionReminderTemplate(user, plan, endDate, daysLeft, lang);

    return this.sendMail(user.email, template.subject, template.html);
  }

  // Send Payment link
  async sendPaymentLink({user, plan, paymentUrl}, lang){
    let template = subscriptionPaymentLinkTemplate(user, plan, paymentUrl, lang);

    return this.sendMail(user.email, template.subject, template.html);
  }

  // Send Expire Mail
  async sendExpiredEmail({user, plan, endDate}, lang){
    let template = subscriptionExpireTemplate(user, plan, endDate, lang);

    return this.sendMail(user.email, template.subject, template.html);
  }

  // Send Become podcaster Mail
  async sendBecomePodcasterMail(admin, user, lang="en"){
    let template = becomePodcasterMailTemplate(admin, user, lang);

    return this.sendMail(admin.email, template.subject, template.html);
  }

  // Send Mail To Podcaster For Folow by Customer
  async sendMailToPodcasterFollow(podcaster, customer, lang="en"){
    let template = podcasterFollowMailTemplate(podcaster, customer, lang);

    return this.sendMail(podcaster.email, template.subject, template.html);
  }

  // Send Mail To Admin After Customer Register
  async newCustomerRegistrationAdminMail(admin, customer, lang="en"){
    let template = newCustomerRegistrationAdminTemplate(admin, customer, lang);

    return this.sendMail(admin.email, template.subject, template.html);
  }

  // Send Mail To Admin On Report Content
  async contentReportAdminMail(admin, report, lang="en"){
    let template = reportContentAdminTemplate(admin, report, lang);

    return this.sendMail(admin.email, template.subject, template.html);
  }

  // Send Mail To Podcaster On Report Content
  async contentReportPodcasterMail(podcaster, report, lang="en"){
    let template = reportContentPodcasterTemplate(podcaster, report, lang);

    return this.sendMail(podcaster.email, template.subject, template.html);
  }

  // Send Mail To Podcaster On Report Content
  async sendMailFromEmailNotification(to, subject, body, attachments = []){
    let template = emailNotificationTemplate(subject, body);

    return this.sendMail(to, template.subject, template.html, attachments);
  }
}

export default new EmailService();