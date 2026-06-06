import { NextResponse } from 'next/server';
import { getUser } from '../../../../../lib/auth.js';
import { getGlobalDb } from '../../../../../lib/db.js';
import nodemailer from 'nodemailer';

async function checkAdmin() {
  const user = await getUser();
  return user && (user.isAdmin || user.isRoot);
}

export async function POST(request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const config = await request.json();
    
    if (!config.host || !config.port) {
      return NextResponse.json({ error: 'Host and port are required.' }, { status: 400 });
    }

    let pass = config.pass;
    if (pass === '••••••••') {
      const db = await getGlobalDb();
      try {
        const existingRow = db.prepare("SELECT value FROM system_settings WHERE key = 'smtp_config'").get();
        if (existingRow && existingRow.value) {
          const existingParsed = JSON.parse(existingRow.value);
          pass = existingParsed.pass || '';
        }
      } catch (e) {}
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: parseInt(config.port, 10),
      secure: config.secure === true,
      auth: {
        user: config.user,
        pass: pass,
      },
      connectionTimeout: 5000
    });

    await transporter.verify();

    return NextResponse.json({ success: true, message: 'SMTP connection verified successfully!' });
  } catch (error) {
    console.error('SMTP test error:', error);
    return NextResponse.json({ error: error.message || 'SMTP connection failed' }, { status: 500 });
  }
}
