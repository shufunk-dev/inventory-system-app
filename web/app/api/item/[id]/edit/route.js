import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const db = await getDb();
    
    // Get the current item to use as a fallback for any undefined fields
    const currentItem = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    if (!currentItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const name = body.name !== undefined ? body.name : currentItem.name;
    const description = body.description !== undefined ? body.description : currentItem.description;
    const categoryId = body.categoryId !== undefined ? body.categoryId : currentItem.categoryId;
    const toyBrand = body.toyBrand !== undefined ? body.toyBrand : currentItem.toyBrand;
    const toyYear = body.toyYear !== undefined ? body.toyYear : currentItem.toyYear;
    const toyCondition = body.toyCondition !== undefined ? body.toyCondition : currentItem.toyCondition;
    const coinCondition = body.coinCondition !== undefined ? body.coinCondition : currentItem.coinCondition;
    const coinCertNumber = body.coinCertNumber !== undefined ? body.coinCertNumber : currentItem.coinCertNumber;
    const coinGradingAgency = body.coinGradingAgency !== undefined ? body.coinGradingAgency : currentItem.coinGradingAgency;
    const cardCondition = body.cardCondition !== undefined ? body.cardCondition : currentItem.cardCondition;
    const cardCertNumber = body.cardCertNumber !== undefined ? body.cardCertNumber : currentItem.cardCertNumber;
    const cardGradingAgency = body.cardGradingAgency !== undefined ? body.cardGradingAgency : currentItem.cardGradingAgency;
    
    let retailPrice = currentItem.retailPrice;
    if (body.retailPrice !== undefined) {
      retailPrice = body.retailPrice !== '' && body.retailPrice !== null ? parseFloat(body.retailPrice) : null;
    }

    // Check if condition is changing to reset valuation
    let resetValuation = false;
    if (body.toyCondition !== undefined && currentItem.toyCondition !== toyCondition) {
      resetValuation = true;
    }
    if ((body.coinCondition !== undefined && currentItem.coinCondition !== coinCondition) || 
        (body.coinGradingAgency !== undefined && currentItem.coinGradingAgency !== coinGradingAgency)) {
      resetValuation = true;
    }
    if ((body.cardCondition !== undefined && currentItem.cardCondition !== cardCondition) || 
        (body.cardGradingAgency !== undefined && currentItem.cardGradingAgency !== cardGradingAgency)) {
      resetValuation = true;
    }

    db.prepare(`
      UPDATE items 
      SET name = ?, description = ?, categoryId = ?, toyBrand = ?, toyYear = ?, toyCondition = ?, coinCondition = ?, coinCertNumber = ?, coinGradingAgency = ?, cardCondition = ?, cardCertNumber = ?, cardGradingAgency = ?, retailPrice = ?
      ${resetValuation ? ', valueLow = NULL, valueAvg = NULL, valueHigh = NULL' : ''}
      WHERE id = ?
    `).run(
      name,
      description,
      categoryId || null,
      toyBrand || null,
      toyYear || null,
      toyCondition || null,
      coinCondition || null,
      coinCertNumber || null,
      coinGradingAgency || null,
      cardCondition || null,
      cardCertNumber || null,
      cardGradingAgency || null,
      retailPrice,
      id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Edit Error:', error);
    return NextResponse.json({ error: 'Failed to update item: ' + error.message }, { status: 500 });
  }
}
