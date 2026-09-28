import { emailLayout } from "../emailLayout.js";

export const newCustomerRegistrationAdminTemplate = (admin, customer, lang = 'en') => {
    const messages = {
        en: {
            subject: 'New Customer Registration 🚀',
            greeting: `Hi ${admin.name || 'Admin'},`,
            line1: `A new customer has successfully registered on the mobile app/platform.`,
            line2: 'Customer Details:',
            line2_a: 'Name: ',
            line2_b: 'Email: ',
            line2_c: 'Registered At: ',
            footer: 'Please review the user details in the admin panel if needed.',
        },
        fr: {
            subject: 'Nouvelle inscription client 🚀',
            greeting: `Bonjour ${admin.name || 'Admin'},`,
            line1: `Un nouveau client s'est inscrit sur l'application mobile/la plateforme.`,
            line2: 'Détails du client :',
            line2_a: 'Nom : ',
            line2_b: 'Email : ',
            line2_c: "Date d'inscription : ",
            footer: `Veuillez vérifier les détails dans le panneau d'administration si nécessaire.`,
        },
    };

    const content = messages[lang] || messages.en;

    const registeredAt = customer.createdAt ? new Date(customer.createdAt).toLocaleString() : new Date().toLocaleString();

    const innerContent = `
        <p style="">${content.greeting}</p>

        <p style="line-height: 1.6;">${content.line1}</p>

        <strong style="line-height: 1.6;">${content.line2}</strong>
        
        <ul>
            <li><strong style="line-height: 1.6;">${content.line2_a}</strong> <span>${customer.name || ""}</span></li>
            <li><strong style="line-height: 1.6;">${content.line2_b}</strong> <span>${customer.email}</span></li>
            <li><strong style="line-height: 1.6;">${content.line2_c}</strong> <span>${registeredAt}</span></li>
        </ul>
                
        <p style="line-height: 1.6;">${content.footer}</p>`;

    return {
        subject: content.subject,
        html: emailLayout(innerContent, lang)
    };
};