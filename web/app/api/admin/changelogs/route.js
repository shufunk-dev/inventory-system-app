import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUser } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(req) {
  try {
    const user = await getUser();
    if (!user || user.isRoot !== 1) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { version, date, title, changes } = body;

    if (!version || !date || !title || !changes || !Array.isArray(changes)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getDb();
    
    const insertStmt = db.prepare('INSERT INTO changelogs (id, version, date, title, changes, createdAt) VALUES (?, ?, ?, ?, ?, ?)');
    insertStmt.run(
      crypto.randomUUID(),
      version,
      date,
      title,
      JSON.stringify(changes),
      Date.now()
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to create changelog:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
