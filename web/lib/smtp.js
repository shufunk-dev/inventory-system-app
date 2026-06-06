import { getGlobalDb } from './db.js';
import nodemailer from 'nodemailer';

export async function getSmtpConfig() {
  const db = await getGlobalDb();
  let dbConfig = null;
  try {
    const row = db.prepare("SELECT value FROM system_settings WHERE key = 'smtp_config'").get();
    if (row && row.value) {
      dbConfig = JSON.parse(row.value);
    }
  } catch (e) {
    console.error('Error fetching SMTP config from db:', e);
  }

  const host = dbConfig?.host || process.env.SMTP_HOST || '';
  const port = parseInt(dbConfig?.port || process.env.SMTP_PORT || '587', 10);
  const secure = dbConfig?.secure !== undefined ? dbConfig.secure : (process.env.SMTP_SECURE === 'true');
  const user = dbConfig?.user || process.env.SMTP_USER || '';
  const pass = dbConfig?.pass || process.env.SMTP_PASS || '';
  const from = dbConfig?.from || process.env.SMTP_FROM || '';

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    enabled: !!host
  };
}

export async function sendEmail({ to, subject, text, html }) {
  const config = await getSmtpConfig();
  
  if (!config.enabled) {
    console.warn('==================================================');
    console.warn('SMTP NOT CONFIGURING - EMAIL WOULD HAVE BEEN SENT:');
    console.warn(`TO:      ${to}`);
    console.warn(`SUBJECT: ${subject}`);
    console.warn(`TEXT:    ${text}`);
    console.warn('==================================================');
    return { success: true, loggedToConsole: true };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: config.from || `"Inventory System" <${config.user}>`,
      to,
      subject,
      text,
      html
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('SMTP sendMail error:', error);
    throw error;
  }
}
