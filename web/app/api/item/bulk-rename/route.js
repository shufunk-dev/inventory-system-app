import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(request) {
  try {
    const { items } = await request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items selected' }, { status: 400 });
    }

    // Validate structure
    for (const item of items) {
      if (!item.id || typeof item.name !== 'string') {
        return NextResponse.json({ error: 'Invalid items format. Each item must have an id and a name string.' }, { status: 400 });
      }
    }

    const db = await getDb();
    
    // Run the updates in a database transaction for atomicity and high performance
    const updateStmt = db.prepare('UPDATE items SET name = ? WHERE id = ?');
    const bulkUpdate = db.transaction((itemsList) => {
      for (const item of itemsList) {
        updateStmt.run(item.name.trim(), item.id);
      }
    });

    bulkUpdate(items);

    return NextResponse.json({ success: true, count: items.length });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to bulk rename items: ' + error.message }, { status: 500 });
  }
}
