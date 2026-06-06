import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { getGlobalDb, getStoreDb } from '@/lib/db';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

async function checkAdmin() {
  const user = await getUser();
  return user && (user.isAdmin || user.isRoot);
}

export async function GET() {
  const currentUser = await getUser();
  if (!currentUser || !(currentUser.isAdmin || currentUser.isRoot)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getGlobalDb();
    const stores = db.prepare('SELECT * FROM store_profiles ORDER BY createdAt DESC').all();
    
    if (currentUser.isRoot === 1) {
      return NextResponse.json({ stores });
    } else {
      const adminStoreIds = currentUser.storeId ? currentUser.storeId.split(',').map(s => s.trim()).filter(Boolean) : [];
      const filteredStores = stores.filter(s => adminStoreIds.includes(s.id));
      return NextResponse.json({ stores: filteredStores });
    }
  } catch (error) {
    console.error('List stores error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.isRoot !== 1) {
    return NextResponse.json({ error: 'Forbidden: Only root administrator can manage stores.' }, { status: 403 });
  }

  try {
    const { name } = await request.json();
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Store name is required.' }, { status: 400 });
    }

    const db = await getGlobalDb();
    
    // Check if name is unique
    const existing = db.prepare('SELECT id FROM store_profiles WHERE name = ?').get(name.trim());
    if (existing) {
      return NextResponse.json({ error: 'A store with this name already exists.' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    db.prepare('INSERT INTO store_profiles (id, name, createdAt) VALUES (?, ?, ?)')
      .run(id, name.trim(), Date.now());

    // Initialize the sqlite database file and schema
    getStoreDb(id);

    return NextResponse.json({ success: true, store: { id, name: name.trim() } });
  } catch (error) {
    console.error('Create store error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const currentUser = await getUser();
  if (!currentUser || currentUser.isRoot !== 1) {
    return NextResponse.json({ error: 'Forbidden: Only root administrator can manage stores.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Store ID is required.' }, { status: 400 });
    }

    const db = await getGlobalDb();
    const info = db.prepare('DELETE FROM store_profiles WHERE id = ?').run(id);

    if (info.changes === 0) {
      return NextResponse.json({ error: 'Store not found.' }, { status: 404 });
    }

    // Try to delete the database file to keep it clean
    try {
      const dataPath = process.env.USER_DATA_PATH || process.cwd();
      const filePath = path.resolve(dataPath, `store_${id}.sqlite`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileErr) {
      console.error('Failed to delete store sqlite file:', fileErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete store error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
