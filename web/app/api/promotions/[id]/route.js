import { getUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const db = await getDb();

    const existing = db.prepare('SELECT * FROM promotions WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 });
    }

    // Quick toggle for isActive
    if (body.isActive !== undefined && Object.keys(body).length === 1) {
      db.prepare('UPDATE promotions SET isActive = ? WHERE id = ?').run(body.isActive ? 1 : 0, id);
      const updated = db.prepare('SELECT * FROM promotions WHERE id = ?').get(id);
      return NextResponse.json({ success: true, promotion: updated });
    }

    const {
      name = existing.name,
      discountType = existing.discountType,
      discountValue = existing.discountValue,
      targetType = existing.targetType,
      targetIds = existing.targetIds,
      startDate = existing.startDate,
      endDate = existing.endDate,
      isRecurring = existing.isRecurring,
      recurringDays = existing.recurringDays,
      gracePeriodMinutes = existing.gracePeriodMinutes,
      isActive = existing.isActive
    } = body;

    const targetIdsStr = typeof targetIds === 'string' ? targetIds : JSON.stringify(targetIds);
    const recurringDaysStr = typeof recurringDays === 'string' ? recurringDays : JSON.stringify(recurringDays);

    const stmt = db.prepare(`
      UPDATE promotions SET
        name = ?,
        discountType = ?,
        discountValue = ?,
        targetType = ?,
        targetIds = ?,
        startDate = ?,
        endDate = ?,
        isRecurring = ?,
        recurringDays = ?,
        gracePeriodMinutes = ?,
        isActive = ?
      WHERE id = ?
    `);

    stmt.run(
      name.trim(),
      discountType,
      parseFloat(discountValue),
      targetType,
      targetIdsStr,
      startDate,
      endDate,
      isRecurring ? 1 : 0,
      recurringDaysStr,
      Math.min(30, Math.max(0, parseInt(gracePeriodMinutes, 10) || 0)),
      isActive ? 1 : 0,
      id
    );

    const updated = db.prepare('SELECT * FROM promotions WHERE id = ?').get(id);
    return NextResponse.json({ success: true, promotion: updated });
  } catch (error) {
    console.error('Update promotion error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const db = await getDb();

    db.prepare('DELETE FROM promotions WHERE id = ?').run(id);
    return NextResponse.json({ success: true, message: 'Promotion deleted' });
  } catch (error) {
    console.error('Delete promotion error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

