import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(request) {
  try {
    const body = await request.json();
    const { itemIds, gameSystem } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'Item IDs are required' }, { status: 400 });
    }

    const db = await getDb();

    // Updating gameSystem also automatically sets itemType to 'game' and triggers re-sync
    const updateStmt = db.prepare(`
      UPDATE items 
      SET gameSystem = ?, 
          itemType = 'game', 
          valueLow = NULL, 
          valueAvg = NULL, 
          valueHigh = NULL, 
          syncStatus = 'pending' 
      WHERE id = ?
    `);

    const updateTransaction = db.transaction((ids, system) => {
      for (const id of ids) {
        updateStmt.run(system || null, id);
      }
    });

    updateTransaction(itemIds, gameSystem);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bulk System Update Error:', error);
    return NextResponse.json({ error: 'Failed to update system: ' + error.message }, { status: 500 });
  }
}
