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
    const gameSystem = body.gameSystem !== undefined ? body.gameSystem : currentItem.gameSystem;
    const movieFormat = body.movieFormat !== undefined ? body.movieFormat : currentItem.movieFormat;
    
    let retailPrice = currentItem.retailPrice;
    if (body.retailPrice !== undefined) {
      retailPrice = body.retailPrice !== '' && body.retailPrice !== null ? parseFloat(body.retailPrice) : null;
    }

    let purchasePrice = currentItem.purchasePrice;
    if (body.purchasePrice !== undefined) {
      purchasePrice = body.purchasePrice !== '' && body.purchasePrice !== null ? parseFloat(body.purchasePrice) : null;
    }

    // Check if name or condition is changing to reset valuation
    let resetValuation = false;
    if (body.name !== undefined && currentItem.name !== name) {
      resetValuation = true;
    }
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
    if (body.gameSystem !== undefined && currentItem.gameSystem !== gameSystem) {
      resetValuation = true;
    }
    if (body.movieFormat !== undefined && currentItem.movieFormat !== movieFormat) {
      resetValuation = true;
    }

    db.prepare(`
      UPDATE items 
      SET name = ?, description = ?, categoryId = ?, toyBrand = ?, toyYear = ?, toyCondition = ?, coinCondition = ?, coinCertNumber = ?, coinGradingAgency = ?, cardCondition = ?, cardCertNumber = ?, cardGradingAgency = ?, gameSystem = ?, movieFormat = ?, retailPrice = ?, purchasePrice = ?
      ${resetValuation ? ", valueLow = NULL, valueAvg = NULL, valueHigh = NULL, syncStatus = 'pending'" : ''}
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
      gameSystem || null,
      movieFormat || null,
      retailPrice,
      purchasePrice,
      id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Edit Error:', error);
    return NextResponse.json({ error: 'Failed to update item: ' + error.message }, { status: 500 });
  }
}
