import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { logBuffer } from '@/lib/logger';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getUser();
  if (!user || user.isAdmin !== 1) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // If we have items in the in-memory buffer, return them directly
  if (logBuffer.length > 0) {
    return NextResponse.json({ logs: logBuffer });
  }

  // Fallback: read the last 500 lines from app.log on disk
  const logFile = path.join(process.env.USER_DATA_PATH || process.cwd(), 'app.log');
  try {
    if (fs.existsSync(logFile)) {
      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.split('\n').filter(Boolean);
      return NextResponse.json({ logs: lines.slice(-500) });
    }
  } catch (err) {
    console.error('Failed to read log file:', err);
  }

  return NextResponse.json({ logs: ['[SYSTEM] No logs recorded yet.'] });
}
