import { NextResponse } from 'next/server';
import { getGlobalDb } from '@/lib/db';
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
    const { tier, storeId, role } = body;

    const db = await getGlobalDb();
    
    // Check permissions for non-root admins
    if (adminUser.isRoot !== 1) {
      const targetUser = db.prepare('SELECT storeId, isRoot FROM users WHERE id = ?').get(id);
      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      if (targetUser.isRoot === 1) {
        return NextResponse.json({ error: 'Forbidden: You cannot modify a root administrator.' }, { status: 403 });
      }
      
      const adminStoreIds = adminUser.storeId ? adminUser.storeId.split(',').map(s => s.trim()).filter(Boolean) : [];
      const targetStoreIds = targetUser.storeId ? targetUser.storeId.split(',').map(s => s.trim()).filter(Boolean) : [];
      const hasOverlap = targetStoreIds.some(sid => adminStoreIds.includes(sid));
      
      if (!hasOverlap) {
        return NextResponse.json({ error: 'Forbidden: You do not have permission to manage this user.' }, { status: 403 });
      }
      
      if (storeId !== undefined) {
        if (!storeId || storeId === 'default') {
          return NextResponse.json({ error: 'Forbidden: You can only assign users to your own store catalog.' }, { status: 403 });
        }
        const requestedIds = storeId.split(',').map(s => s.trim()).filter(Boolean);
        const hasInvalidStore = requestedIds.some(sid => !adminStoreIds.includes(sid));
        if (hasInvalidStore) {
          return NextResponse.json({ error: 'Forbidden: You can only assign users to your own store catalog.' }, { status: 403 });
        }
      }
    }

    // Prevent an admin from demoting themselves or changing their own settings via this API
    if (id === adminUser.id) {
      return NextResponse.json({ error: 'Cannot modify your own settings from the admin panel' }, { status: 400 });
    }

    const updates = [];
    const values = [];

    if (tier !== undefined) {
      if (!['basic', 'premium'].includes(tier)) {
        return NextResponse.json({ error: 'Invalid tier specified' }, { status: 400 });
      }
      updates.push('tier = ?');
      updates.push('activeTier = ?');
      values.push(tier);
      values.push(tier);
    }

    if (storeId !== undefined) {
      updates.push('storeId = ?');
      values.push(storeId === 'default' || !storeId ? null : storeId);
    }

    if (role !== undefined) {
      if (!['admin', 'staff'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
      }
      updates.push('role = ?');
      updates.push('isAdmin = ?');
      values.push(role);
      values.push(role === 'admin' ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No update parameters provided' }, { status: 400 });
    }

    values.push(id);
    const info = db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    if (info.changes === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
