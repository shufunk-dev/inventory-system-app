import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ user });
}

export async function PUT(request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { activeTier } = await request.json();
    const db = getDb();
    
    // Validation: Only allow setting activeTier to premium if their subscription role is premium
    if (activeTier === 'premium' && user.tier !== 'premium') {
      return NextResponse.json({ error: 'You do not have a premium subscription' }, { status: 403 });
    }

    db.prepare('UPDATE users SET activeTier = ? WHERE id = ?').run(
      activeTier || user.activeTier || 'basic', 
      user.id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
