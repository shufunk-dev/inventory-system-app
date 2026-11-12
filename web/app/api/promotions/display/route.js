import { getUser } from '@/lib/auth';
import { getDb, getMasterDb, getStoreDb } from '@/lib/db';
import { isPromotionActive, getPromotionTimeStatus, evaluateItemPromotion } from '@/lib/promotions';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeIdParam = searchParams.get('storeId') || 'default';

    // Retrieve promotions for store
    let db;
    if (storeIdParam && storeIdParam !== 'default') {
      try {
        db = getStoreDb(storeIdParam);
      } catch (e) {
        db = await getDb();
      }
    } else {
      db = await getDb();
    }

    let promotions = [];
    try {
      promotions = db.prepare('SELECT * FROM promotions WHERE isActive = 1 ORDER BY createdAt DESC').all();
    } catch (e) {
      promotions = [];
    }

    const now = new Date();
    const activePromotions = promotions.filter(p => isPromotionActive(p, now));

    if (activePromotions.length === 0) {
      return NextResponse.json({
        activePromotions: [],
        saleItems: [],
        storeName: storeIdParam
      });
    }

    // Get catalog items that have a price
    let items = [];
    try {
      items = db.prepare(`
        SELECT i.id, i.name, i.description, i.barcode, i.retailPrice, i.categoryId, 
               i.imagePath, i.imagePathBack, i.tag, i.colorTag, c.name as categoryName
        FROM items i
        LEFT JOIN categories c ON i.categoryId = c.id
        WHERE i.retailPrice IS NOT NULL AND i.retailPrice > 0
        ORDER BY i.name ASC
      `).all();
    } catch (e) {
      items = [];
    }

    // Evaluate each item against active promotions
    const saleItems = [];
    for (const item of items) {
      const evaluation = evaluateItemPromotion({
        ...item,
        storeId: storeIdParam
      }, activePromotions, now);

      if (evaluation.hasSale) {
        saleItems.push({
          id: item.id,
          name: item.name,
          description: item.description,
          barcode: item.barcode,
          categoryName: item.categoryName,
          imagePath: item.imagePath,
          tag: item.tag,
          colorTag: item.colorTag,
          originalPrice: evaluation.originalPrice,
          salePrice: evaluation.salePrice,
          discountAmount: evaluation.discountAmount,
          savingsPercent: evaluation.savingsPercent,
          promotionName: evaluation.promotionName,
          endDate: evaluation.endDate,
          inGracePeriod: evaluation.inGracePeriod
        });
      }
    }

    // Sort by largest discount percentage first
    saleItems.sort((a, b) => b.savingsPercent - a.savingsPercent);

    return NextResponse.json({
      activePromotions: activePromotions.map(p => ({
        ...p,
        timeStatus: getPromotionTimeStatus(p, now)
      })),
      saleItems,
      totalSaleItems: saleItems.length
    });
  } catch (error) {
    console.error('Fetch promotions display error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

