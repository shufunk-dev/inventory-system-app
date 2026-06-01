import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(request) {
  try {
    const { itemIds, categoryId } = await request.json();

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'No items selected' }, { status: 400 });
    }

    const db = getDb();
    
    // categoryId can be empty string/null for "Uncategorized"
    const catId = categoryId || null;

    const placeholders = itemIds.map(() => '?').join(',');
    const query = `UPDATE items SET categoryId = ? WHERE id IN (${placeholders})`;
    
    db.prepare(query).run(catId, ...itemIds);

    return NextResponse.json({ success: true, count: itemIds.length });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to bulk update categories: ' + error.message }, { status: 500 });
  }
}
