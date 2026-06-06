import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';
import { getUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = await getDb();
    const categories = db.prepare('SELECT * FROM categories WHERE userId = ? ORDER BY name ASC').all(user.id);
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, parentId } = await request.json();
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const db = await getDb();
    
    // Check if category already exists for THIS user
    const existing = db.prepare('SELECT * FROM categories WHERE lower(name) = lower(?) AND userId = ?').get(name.trim(), user.id);
    if (existing) {
      return NextResponse.json(existing);
    }

    const id = crypto.randomUUID();
    db.prepare('INSERT INTO categories (id, name, parentId, createdAt, userId) VALUES (?, ?, ?, ?, ?)').run(
      id, name.trim(), parentId || null, Date.now(), user.id
    );

    const newCat = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    return NextResponse.json(newCat);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
