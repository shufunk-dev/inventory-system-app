import { getGlobalDb } from '../../../../lib/db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createSession } from '../../../../lib/auth.js';
import { getSmtpConfig, sendEmail } from '../../../../lib/smtp.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { NextResponse } = require('next/server');

export async function POST(request) {
  try {
    const { email: rawEmail, password } = await request.json();

    if (!rawEmail || !password || password.length < 6) {
      return NextResponse.json({ error: 'Valid email and password (min 6 chars) required.' }, { status: 400 });
    }

    const email = rawEmail.toLowerCase().trim();
    const db = await getGlobalDb();
    
    // Check if this is the very first user in the database
    const totalUserCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const isFirstUser = totalUserCount === 0;

    const isDemoMode = process.env.DEMO_MODE === 'true';

    // Gate registration if this is not the first user
    if (!isFirstUser && !isDemoMode) {
      if (process.env.SAAS_MODE === 'true') {
        const smtpConfig = await getSmtpConfig();
        if (!smtpConfig.enabled) {
          return NextResponse.json(
            { error: 'Registration is currently disabled. Please contact your system administrator.' },
            { status: 403 }
          );
        }
      } else {
        // Local-first mode: subsequent users cannot register themselves.
        return NextResponse.json(
          { error: 'Registration is disabled in local mode. Please have your system administrator add your account.' },
          { status: 403 }
        );
      }
    }

    // Check if user exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return NextResponse.json({ error: 'Email already registered.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    const displayName = email.split('@')[0];

    if (isFirstUser) {
      // First user is active admin
      db.prepare(`
        INSERT INTO users (
          id, email, passwordHash, tier, activeTier, isAdmin, isRoot, role, status, displayName, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, email, passwordHash, 'premium', 'premium', 1, 1, 'admin', 'active', displayName, Date.now());

      await createSession(id);
      return NextResponse.json({ success: true, isFirstUser: true });
    } else {
      // If we are in Demo Mode, subsequent users are created directly as 'active' (no verification needed)
      if (isDemoMode) {
        db.prepare(`
          INSERT INTO users (
            id, email, passwordHash, tier, activeTier, isAdmin, isRoot, role, status, displayName, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, email, passwordHash, 'basic', 'basic', 0, 0, 'staff', 'active', displayName, Date.now());

        return NextResponse.json({
          success: true,
          pendingVerification: false,
          message: 'Account created successfully (Demo Mode - instantly active).'
        });
      }

      // Subsequent users must verify email (status pending)
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

      db.prepare(`
        INSERT INTO users (
          id, email, passwordHash, tier, activeTier, isAdmin, isRoot, role, status, displayName, verificationToken, verificationExpiresAt, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, email, passwordHash, 'basic', 'basic', 0, 0, 'staff', 'pending', displayName,
        verificationToken, verificationExpiresAt, Date.now()
      );

      // Send verification link
      const host = request.headers.get('host') || 'localhost:3000';
      const proto = request.headers.get('x-forwarded-proto') || 'http';
      const verifyUrl = `${proto}://${host}/api/auth/verify-email?token=${verificationToken}`;

      try {
        await sendEmail({
          to: email,
          subject: 'Verify your Inventory System account',
          text: `Welcome to the Inventory System! Please verify your account by clicking this link: ${verifyUrl}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: #7c3aed">Welcome to the Inventory System</h2>
              <p>Thank you for signing up. Please verify your email address to activate your account:</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="${verifyUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">Verify Account</a>
              </div>
              <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser: <br/> <a href="${verifyUrl}">${verifyUrl}</a></p>
              <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">This link will expire in 24 hours.</p>
            </div>
          `
        });
      } catch (mailError) {
        console.error('Failed to send verification email, but user is inserted:', mailError);
      }

      return NextResponse.json({
        success: true,
        pendingVerification: true,
        message: 'Please check your email to verify your account.'
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = await getGlobalDb();
    const totalUserCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const isFirstUser = totalUserCount === 0;
    
    // In local-first mode, if there are no root admins, setup is needed
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE isRoot = 1').get().count;
    const setupNeeded = adminCount === 0 && process.env.SAAS_MODE !== 'true';
    
    if (process.env.DEMO_MODE === 'true') {
      return NextResponse.json({ enabled: true, setupNeeded });
    }

    if (process.env.SAAS_MODE === 'true') {
      const smtpConfig = await getSmtpConfig();
      return NextResponse.json({ enabled: isFirstUser || smtpConfig.enabled, setupNeeded });
    } else {
      // Local mode: only the bootstrap admin registration is enabled publicly
      return NextResponse.json({ enabled: isFirstUser, setupNeeded });
    }
  } catch (e) {
    console.error('Registration status check failed:', e);
    return NextResponse.json({ enabled: false, setupNeeded: false });
  }
}
