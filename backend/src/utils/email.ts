import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface ContactEmailData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const sendContactEmail = async (data: ContactEmailData) => {
  const adminEmail = process.env.CONTACT_EMAIL_TO; 

  if (!adminEmail) {
    console.warn('CONTACT_EMAIL_TO is not defined. Email will not be sent.');
    return;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || `"CFS Kenya Website" <${process.env.SMTP_USER}>`,
    to: adminEmail,
    replyTo: data.email, 
    subject: `[New Contact] ${data.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Contact Message</h2>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px;">
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
          <p><strong>Subject:</strong> ${data.subject}</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${data.message}</p>
        </div>
        <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
          This message was sent from the Computer for Schools Kenya website contact form.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Contact email sent successfully to ${adminEmail}`);
  } catch (error) {
    console.error('Error sending contact email:', error);
     
  }
};