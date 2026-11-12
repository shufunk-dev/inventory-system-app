import { getUser } from '@/lib/auth';
import { getDb, getMasterDb, getStoreDb } from '@/lib/db';
import { isPromotionActive, getPromotionTimeStatus } from '@/lib/promotions';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeIdParam = searchParams.get('storeId');
    const statusFilter = searchParams.get('status') || 'all';

    const db = await getDb();
    
    // Check if table exists in current db
    try {
      db.prepare('SELECT 1 FROM promotions LIMIT 1').get();
    } catch (e) {
      // Table will be created by db initialization if not yet run
      return NextResponse.json({ promotions: [], stats: { active: 0, scheduled: 0, expired: 0, total: 0 } });
    }

    let promotions = [];
    if (storeIdParam && storeIdParam !== 'all') {
      promotions = db.prepare('SELECT * FROM promotions WHERE storeId = ? OR storeId IS NULL ORDER BY createdAt DESC').all(storeIdParam);
    } else {
      promotions = db.prepare('SELECT * FROM promotions ORDER BY createdAt DESC').all();
    }

    const now = new Date();
    let activeCount = 0;
    let scheduledCount = 0;
    let expiredCount = 0;

    const enriched = promotions.map(p => {
      const timeStatus = getPromotionTimeStatus(p, now);
      const isActiveNow = isPromotionActive(p, now);

      if (timeStatus.status === 'active' || timeStatus.status === 'grace_period') {
        activeCount++;
      } else if (timeStatus.status === 'scheduled') {
        scheduledCount++;
      } else {
        expiredCount++;
      }

      return {
        ...p,
        timeStatus,
        isActiveNow
      };
    });

    let filtered = enriched;
    if (statusFilter === 'active') {
      filtered = enriched.filter(p => p.isActiveNow);
    } else if (statusFilter === 'scheduled') {
      filtered = enriched.filter(p => p.timeStatus.status === 'scheduled');
    } else if (statusFilter === 'expired') {
      filtered = enriched.filter(p => p.timeStatus.status === 'expired');
    }

    return NextResponse.json({
      promotions: filtered,
      stats: {
        active: activeCount,
        scheduled: scheduledCount,
        expired: expiredCount,
        total: enriched.length
      }
    });
  } catch (error) {
    console.error('Fetch promotions error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      storeId = 'default',
      discountType = 'percentage',
      discountValue,
      targetType = 'booth',
      targetIds = [],
      startDate,
      endDate,
      isRecurring = 0,
      recurringDays = [],
      gracePeriodMinutes = 0
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Promotion name is required' }, { status: 400 });
    }

    const numDiscount = parseFloat(discountValue);
    if (isNaN(numDiscount) || numDiscount <= 0) {
      return NextResponse.json({ error: 'Valid discount value is required' }, { status: 400 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const createdAt = Date.now();
    const targetIdsStr = typeof targetIds === 'string' ? targetIds : JSON.stringify(targetIds);
    const recurringDaysStr = typeof recurringDays === 'string' ? recurringDays : JSON.stringify(recurringDays);

    const db = await getDb();
    
    // Ensure table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS promotions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        storeId TEXT,
        discountType TEXT NOT NULL DEFAULT 'percentage',
        discountValue REAL NOT NULL,
        targetType TEXT NOT NULL DEFAULT 'booth',
        targetIds TEXT,
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        isRecurring INTEGER DEFAULT 0,
        recurringDays TEXT,
        gracePeriodMinutes INTEGER DEFAULT 0,
        isActive INTEGER DEFAULT 1,
        createdAt INTEGER
      );
    `);

    const stmt = db.prepare(`
      INSERT INTO promotions (
        id, name, storeId, discountType, discountValue, targetType, targetIds,
        startDate, endDate, isRecurring, recurringDays, gracePeriodMinutes, isActive, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    stmt.run(
      id,
      name.trim(),
      storeId,
      discountType,
      numDiscount,
      targetType,
      targetIdsStr,
      startDate,
      endDate,
      isRecurring ? 1 : 0,
      recurringDaysStr,
      Math.min(30, Math.max(0, parseInt(gracePeriodMinutes, 10) || 0)),
      createdAt
    );

    const created = db.prepare('SELECT * FROM promotions WHERE id = ?').get(id);

    return NextResponse.json({ success: true, promotion: created });
  } catch (error) {
    console.error('Create promotion error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

