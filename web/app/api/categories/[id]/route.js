import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { name, parentId } = await request.json();

    if (!id || !name || name.trim() === '') {
      return NextResponse.json({ error: 'ID and name are required' }, { status: 400 });
    }

    if (id === parentId) {
      return NextResponse.json({ error: 'Category cannot be its own parent.' }, { status: 400 });
    }

    const db = await getDb();
    
    // Check if another category already has this name under the same parent? No, just unique globally for simplicity.
    const existing = db.prepare('SELECT * FROM categories WHERE lower(name) = lower(?) AND id != ?').get(name.trim(), id);
    if (existing) {
      return NextResponse.json({ error: 'A category with this name already exists.' }, { status: 409 });
    }

    db.prepare('UPDATE categories SET name = ?, parentId = ? WHERE id = ?').run(name.trim(), parentId || null, id);

    return NextResponse.json({ success: true, id, name: name.trim(), parentId: parentId || null });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const db = await getDb();
    
    // Remove category from all items
    db.prepare('UPDATE items SET categoryId = NULL WHERE categoryId = ?').run(id);
    
    // Delete the category
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
