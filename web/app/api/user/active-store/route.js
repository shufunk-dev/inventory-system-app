import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { getGlobalDb } from '@/lib/db';
import { cookies } from 'next/headers';

export async function PUT(request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { storeId } = await request.json();

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required.' }, { status: 400 });
    }

    if (storeId !== 'default') {
      const db = await getGlobalDb();
      const existing = db.prepare('SELECT id FROM store_profiles WHERE id = ?').get(storeId);
      if (!existing) {
        return NextResponse.json({ error: 'Store profile not found.' }, { status: 404 });
      }
    }

    const isAdminOrRoot = user.isAdmin === 1 || user.isRoot === 1;
    if (user.storeId && user.storeId !== 'default' && !isAdminOrRoot) {
      const allowedIds = user.storeId.split(',').map(s => s.trim()).filter(Boolean);
      if (!allowedIds.includes(storeId)) {
        return NextResponse.json({ error: 'You are not assigned to this store profile.' }, { status: 403 });
      }
    }

    const cookieStore = await cookies();
    cookieStore.set('active_store_id', storeId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && process.env.SECURE_COOKIES !== 'false',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      sameSite: 'lax',
      path: '/',
    });

    return NextResponse.json({ success: true, storeId });
  } catch (error) {
    console.error('Switch store error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
