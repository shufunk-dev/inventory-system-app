import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { name, description, categoryId, toyBrand, toyYear, toyCondition, coinCondition, coinCertNumber, coinGradingAgency, cardCondition, cardCertNumber, cardGradingAgency, retailPrice } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const db = await getDb();
    
    // Check if condition is changing to reset valuation
    const currentItem = db.prepare('SELECT toyCondition, coinCondition, coinGradingAgency, cardCondition, cardGradingAgency FROM items WHERE id = ?').get(id);
    let resetValuation = false;
    if (toyCondition && currentItem && currentItem.toyCondition !== toyCondition) {
      resetValuation = true;
    }
    if (currentItem && (coinCondition !== undefined || coinGradingAgency !== undefined)) {
      if ((coinCondition && currentItem.coinCondition !== coinCondition) || 
          (coinGradingAgency && currentItem.coinGradingAgency !== coinGradingAgency)) {
        resetValuation = true;
      }
    }
    if (currentItem && (cardCondition !== undefined || cardGradingAgency !== undefined)) {
      if ((cardCondition && currentItem.cardCondition !== cardCondition) || 
          (cardGradingAgency && currentItem.cardGradingAgency !== cardGradingAgency)) {
        resetValuation = true;
      }
    }

    db.prepare(`
      UPDATE items 
      SET name = ?, description = ?, categoryId = ?, toyBrand = ?, toyYear = ?, toyCondition = ?, coinCondition = ?, coinCertNumber = ?, coinGradingAgency = ?, cardCondition = ?, cardCertNumber = ?, cardGradingAgency = ?, retailPrice = ?
      ${resetValuation ? ', valueLow = NULL, valueAvg = NULL, valueHigh = NULL' : ''}
      WHERE id = ?
    `).run(name, description, categoryId || null, toyBrand || null, toyYear || null, toyCondition || null, coinCondition || null, coinCertNumber || null, coinGradingAgency || null, cardCondition || null, cardCertNumber || null, cardGradingAgency || null, retailPrice !== undefined && retailPrice !== '' && retailPrice !== null ? parseFloat(retailPrice) : null, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Edit Error:', error);
    return NextResponse.json({ error: 'Failed to update item: ' + error.message }, { status: 500 });
  }
}
