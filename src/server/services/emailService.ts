import nodemailer from 'nodemailer';
import { db } from '../db/database.js';

export function getSmtpConfig() {
  const getSetting = (key: string) => {
    const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? row.value : '';
  };

  const host = getSetting('smtp_host') || process.env.SMTP_HOST || '';
  const port = parseInt(getSetting('smtp_port') || process.env.SMTP_PORT || '587', 10);
  const secure = (getSetting('smtp_secure') || process.env.SMTP_SECURE || 'false') === 'true';
  const user = getSetting('smtp_user') || process.env.SMTP_USER || '';
  const pass = getSetting('smtp_pass') || process.env.SMTP_PASS || '';
  const fromEmail = getSetting('smtp_from_email') || process.env.SMTP_FROM_EMAIL || 'meals@familymeals.local';
  const fromName = getSetting('smtp_from_name') || process.env.SMTP_FROM_NAME || 'FamilyMeals Kitchen';

  return {
    isConfigured: Boolean(host && user),
    host,
    port,
    secure,
    user,
    pass,
    fromEmail,
    fromName
  };
}

export function createTransporter() {
  const config = getSmtpConfig();
  if (!config.isConfigured) {
    return null;
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });
}

export async function testSmtpConnection(targetEmail: string): Promise<{ success: boolean; message: string }> {
  const config = getSmtpConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      message: 'SMTP is not configured yet. Please enter Host, User, and Password.'
    };
  }

  const transporter = createTransporter();
  if (!transporter) {
    return { success: false, message: 'Could not create email transporter.' };
  }

  try {
    await transporter.verify();
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: targetEmail,
      subject: 'FamilyMeals - SMTP Configuration Test',
      text: 'Congratulations! Your FamilyMeals SMTP email settings are working correctly.',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333; background: #faf7f2; border-radius: 8px;">
          <h2 style="color: #c2593f;">FamilyMeals SMTP Test</h2>
          <p>Your SMTP mail server has been successfully configured and verified.</p>
          <p style="font-size: 13px; color: #666;">Timestamp: ${new Date().toLocaleString()}</p>
        </div>
      `
    });

    return { success: true, message: `Test email successfully sent to ${targetEmail}!` };
  } catch (err: any) {
    return {
      success: false,
      message: `SMTP test failed: ${err.message || 'Unknown error'}`
    };
  }
}

export async function sendMealPlanEmail(
  recipients: string[],
  planName: string,
  shareUrl: string,
  senderName: string
): Promise<{ success: boolean; message: string }> {
  const config = getSmtpConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      message: 'SMTP email server is not configured in Administrator Settings. Please contact admin or copy the short-link directly.'
    };
  }

  const transporter = createTransporter();
  if (!transporter) {
    return { success: false, message: 'Could not initialize email transporter.' };
  }

  try {
    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: recipients.join(', '),
      subject: `Family Meal Plan: ${planName}`,
      text: `Hello!\n\n${senderName} has shared a family meal plan with you: "${planName}".\n\nView it here: ${shareUrl}\n\nHappy cooking!`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #faf7f2; padding: 24px; border-radius: 12px; border: 1px solid #e5dec9;">
          <h2 style="color: #c2593f; margin-top: 0;">FamilyMeals Kitchen Plan</h2>
          <p style="font-size: 16px; color: #3d3b36;">
            <strong>${senderName}</strong> has shared a wholesome meal plan with you:
          </p>
          <div style="background: #ffffff; padding: 18px; border-radius: 8px; border-left: 4px solid #4a6b57; margin: 20px 0;">
            <h3 style="margin: 0 0 8px 0; color: #2e382e;">${planName}</h3>
            <p style="margin: 0; color: #6e6b63; font-size: 14px;">Includes scheduled daily meals, recipes, and macronutrient targets.</p>
          </div>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${shareUrl}" style="background-color: #c2593f; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
              View Family Meal Plan
            </a>
          </p>
          <p style="font-size: 13px; color: #8c887e; text-align: center; margin-top: 30px;">
            Link: <a href="${shareUrl}" style="color: #4a6b57;">${shareUrl}</a>
          </p>
        </div>
      `
    });

    return { success: true, message: `Meal plan link emailed to ${recipients.length} recipient(s)!` };
  } catch (err: any) {
    return { success: false, message: `Failed to send email: ${err.message}` };
  }
}

