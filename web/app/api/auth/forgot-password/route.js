import { NextResponse } from 'next/server';
import { getGlobalDb } from '@/lib/db';
import crypto from 'crypto';
import { sendEmail } from '@/lib/smtp';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = await getGlobalDb();

    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);

    // To prevent account enumeration, return success even if user doesn't exist
    if (!user) {
      return NextResponse.json({ 
        success: true, 
        message: 'If the email is registered, a password reset link has been sent.' 
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

    db.prepare('UPDATE users SET resetPasswordToken = ?, resetPasswordExpiresAt = ? WHERE id = ?').run(
      resetToken, resetExpiresAt, user.id
    );

    const host = request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const resetUrl = `${proto}://${host}/login?token=${resetToken}`;

    try {
      await sendEmail({
        to: normalizedEmail,
        subject: 'Reset your Inventory System password',
        text: `You requested a password reset. Please reset your password using this link: ${resetUrl}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #7c3aed">Password Reset Request</h2>
            <p>We received a request to reset your password. If you made this request, please click the button below to set a new password:</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${resetUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser: <br/> <a href="${resetUrl}">${resetUrl}</a></p>
            <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">If you did not request a password reset, you can safely ignore this email.</p>
          </div>
        `
      });
    } catch (mailError) {
      console.error('Failed to send reset password email:', mailError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'If the email is registered, a password reset link has been sent.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
