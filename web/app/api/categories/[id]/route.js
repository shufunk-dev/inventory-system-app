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
    
    // Recursively collect target category ID and all subcategory IDs descendant from it
    const getAllCategoryIds = (targetId) => {
      const ids = [targetId];
      const getChildren = (parentId) => {
        const children = db.prepare('SELECT id FROM categories WHERE parentId = ?').all(parentId);
        for (const child of children) {
          ids.push(child.id);
          getChildren(child.id);
        }
      };
      getChildren(targetId);
      return ids;
    };

    const allIds = getAllCategoryIds(id);
    const placeholders = allIds.map(() => '?').join(',');

    // Remove category association from all items in these categories
    db.prepare(`UPDATE items SET categoryId = NULL WHERE categoryId IN (${placeholders})`).run(...allIds);
    
    // Delete target category and all descendant subcategories
    db.prepare(`DELETE FROM categories WHERE id IN (${placeholders})`).run(...allIds);

    return NextResponse.json({ success: true, deletedCount: allIds.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
