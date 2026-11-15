import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { getUser } from '@/lib/auth';

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { items, defaultCategoryId, defaultItemType } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items list is required.' }, { status: 400 });
    }

    // Filter items with valid non-empty names
    const validItems = items.filter(item => item && typeof item.name === 'string' && item.name.trim().length > 0);

    if (validItems.length === 0) {
      return NextResponse.json({ error: 'At least one item with a valid name is required.' }, { status: 400 });
    }

    const db = await getDb();
    const now = Date.now();
    const createdIds = [];

    const insertStmt = db.prepare(`
      INSERT INTO items (
        id, userId, categoryId, name, itemType, retailPrice, valueAvg, valueLow, valueHigh, syncStatus, createdAt
      ) VALUES (
        @id, @userId, @categoryId, @name, @itemType, @retailPrice, @valueAvg, @valueLow, @valueHigh, @syncStatus, @createdAt
      )
    `);

    const insertMany = db.transaction((itemList) => {
      for (const item of itemList) {
        const id = crypto.randomUUID();
        const trimmedName = item.name.trim();

        // Parse optional prices
        let retailPrice = null;
        if (item.retailPrice !== undefined && item.retailPrice !== null && item.retailPrice !== '') {
          const parsedRetail = parseFloat(item.retailPrice);
          if (!isNaN(parsedRetail) && parsedRetail >= 0) {
            retailPrice = parseFloat(parsedRetail.toFixed(2));
          }
        }

        let valueAvg = null;
        let valueLow = null;
        let valueHigh = null;
        if (item.marketPrice !== undefined && item.marketPrice !== null && item.marketPrice !== '') {
          const parsedMarket = parseFloat(item.marketPrice);
          if (!isNaN(parsedMarket) && parsedMarket >= 0) {
            valueAvg = parseFloat(parsedMarket.toFixed(2));
            valueLow = parseFloat((valueAvg * 0.8).toFixed(2));
            valueHigh = parseFloat((valueAvg * 1.2).toFixed(2));
          }
        }

        const categoryId = item.categoryId || defaultCategoryId || null;
        const itemType = item.itemType || defaultItemType || 'standard';

        insertStmt.run({
          id,
          userId: user.id,
          categoryId,
          name: trimmedName,
          itemType,
          retailPrice,
          valueAvg,
          valueLow,
          valueHigh,
          syncStatus: 'synced',
          createdAt: now
        });

        createdIds.push(id);
      }
    });

    insertMany(validItems);

    return NextResponse.json({
      success: true,
      count: validItems.length,
      createdIds
    });
  } catch (error) {
    console.error('Quick Add Items Error:', error);
    return NextResponse.json({ error: 'Failed to add items: ' + error.message }, { status: 500 });
  }
}
