import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUser } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    const adminUser = await getUser();
    
    // Strict security check
    if (!adminUser || adminUser.isAdmin !== 1) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { tier } = body;

    if (!['basic', 'premium'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier specified' }, { status: 400 });
    }

    const db = getDb();
    
    // Prevent an admin from demoting themselves or changing their own tier via this API
    if (id === adminUser.id) {
      return NextResponse.json({ error: 'Cannot modify your own tier from the admin panel' }, { status: 400 });
    }

    const info = db.prepare('UPDATE users SET tier = ?, activeTier = ? WHERE id = ?').run(tier, tier, id);

    if (info.changes === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, tier });
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
