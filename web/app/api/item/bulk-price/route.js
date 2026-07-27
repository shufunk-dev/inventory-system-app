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
      if (!item.id) {
        return NextResponse.json({ error: 'Invalid items format. Each item must have an id.' }, { status: 400 });
      }
    }

    const db = await getDb();
    
    // Run the updates in a database transaction for performance and atomicity
    const updateStmt = db.prepare('UPDATE items SET retailPrice = ?, purchasePrice = ? WHERE id = ?');
    const bulkUpdate = db.transaction((itemsList) => {
      for (const item of itemsList) {
        const rp = (item.retailPrice === '' || item.retailPrice === null || item.retailPrice === undefined) ? null : parseFloat(item.retailPrice);
        const pp = (item.purchasePrice === '' || item.purchasePrice === null || item.purchasePrice === undefined) ? null : parseFloat(item.purchasePrice);
        updateStmt.run(rp, pp, item.id);
      }
    });

    bulkUpdate(items);

    return NextResponse.json({ success: true, count: items.length });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to bulk update prices: ' + error.message }, { status: 500 });
  }
}
