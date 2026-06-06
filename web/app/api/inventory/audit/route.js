import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    let startCountId = searchParams.get('startCountId');
    let endCountId = searchParams.get('endCountId');

    const db = await getDb();

    // Query active POS sales range
    let posStartDate = null;
    let posEndDate = null;
    try {
      const startRow = db.prepare("SELECT value FROM system_settings WHERE key = 'pos_start_date'").get();
      const endRow = db.prepare("SELECT value FROM system_settings WHERE key = 'pos_end_date'").get();
      if (startRow) posStartDate = startRow.value;
      if (endRow) posEndDate = endRow.value;
    } catch (e) {
      console.error('[Audit API Date Load Error]:', e.message);
    }

    // Get all completed physical counts to let user select them
    const countSessions = db.prepare(`
      SELECT id, countDate, status
      FROM physical_counts
      WHERE userId = ?
      ORDER BY countDate ASC
    `).all(user.id);

    const mode = searchParams.get('mode');
    if (mode === 'history') {
      const historyList = [];
      for (const session of countSessions) {
        // Load counted items for this count session
        const sessionItems = db.prepare(`
          SELECT 
            pci.brandId,
            b.name as brandName,
            b.category as brandCategory,
            pci.qtyCalculatedOz,
            pci.qtyRaw,
            lv.cost,
            lv.sizeMl
          FROM physical_count_items pci
          JOIN liquor_brands b ON pci.brandId = b.id
          LEFT JOIN liquor_variants lv ON pci.variantId = lv.id
          WHERE pci.countId = ?
        `).all(session.id);

        let totalAssetValue = 0;
        let totalOz = 0;
        const itemsMap = {};

        sessionItems.forEach(item => {
          const cost = item.cost || 0;
          const sizeMl = item.sizeMl || 750;
          const ozPerBottle = sizeMl / 29.5735;
          const costPerOz = ozPerBottle > 0 ? cost / ozPerBottle : 0;
          const itemValue = item.qtyCalculatedOz * costPerOz;

          totalAssetValue += itemValue;
          totalOz += item.qtyCalculatedOz;

          itemsMap[item.brandId] = {
            qtyRaw: item.qtyRaw,
            qtyOz: item.qtyCalculatedOz,
            value: itemValue
          };
        });

        historyList.push({
          sessionId: session.id,
          countDate: session.countDate,
          totalAssetValue: parseFloat(totalAssetValue.toFixed(2)),
          totalOz: parseFloat(totalOz.toFixed(2)),
          items: itemsMap
        });
      }

      // Get full list of unique brands for user
      const allBrands = db.prepare(`
        SELECT id, name, category FROM liquor_brands WHERE userId = ? ORDER BY name ASC
      `).all(user.id);

      return NextResponse.json({
        posStartDate,
        posEndDate,
        countSessions,
        history: historyList,
        brands: allBrands
      });
    }

    if (countSessions.length === 0) {
      return NextResponse.json({
        warning: 'You need at least one physical count session to run inventory valuation.',
        countSessions,
        posStartDate,
        posEndDate,
        audit: []
      });
    }

    // Default to oldest as starting count, newest as ending count if not specified
    if (countSessions.length === 1) {
      startCountId = null;
      endCountId = countSessions[0].id;
    } else if (countSessions.length >= 2) {
      if (!startCountId) {
        startCountId = countSessions[0].id;
      }
      if (!endCountId) {
        endCountId = countSessions[countSessions.length - 1].id;
      }
    }

    // Load items for starting count
    const startingItems = startCountId ? db.prepare(`
      SELECT 
        pci.brandId,
        b.name as brandName,
        b.category as brandCategory,
        pci.qtyCalculatedOz,
        pci.qtyRaw
      FROM physical_count_items pci
      JOIN liquor_brands b ON pci.brandId = b.id
      WHERE pci.countId = ?
    `).all(startCountId) : [];

    // Load items for ending count
    const endingItems = endCountId ? db.prepare(`
      SELECT 
        pci.brandId,
        pci.qtyCalculatedOz,
        pci.qtyRaw
      FROM physical_count_items pci
      WHERE pci.countId = ?
    `).all(endCountId) : [];


    // Group starting stock
    const startingMap = new Map();
    startingItems.forEach(item => {
      startingMap.set(item.brandId, {
        qtyOz: item.qtyCalculatedOz,
        qtyRaw: item.qtyRaw,
        brandName: item.brandName,
        brandCategory: item.brandCategory
      });
    });

    // Group ending stock
    const endingMap = new Map();
    endingItems.forEach(item => {
      endingMap.set(item.brandId, {
        qtyOz: item.qtyCalculatedOz,
        qtyRaw: item.qtyRaw
      });
    });

    // Resolve unit cost per ounce for each brand
    // We'll average the cost per ounce of active variants for a brand
    const costMap = new Map();
    const variants = db.prepare(`
      SELECT lv.brandId, lv.sizeMl, lv.cost
      FROM liquor_variants lv
      JOIN liquor_brands lb ON lv.brandId = lb.id
      WHERE lb.userId = ?
    `).all(user.id);

    variants.forEach(v => {
      if (v.cost > 0 && v.sizeMl > 0) {
        const oz = v.sizeMl / 29.5735;
        const costPerOz = v.cost / oz;
        costMap.set(v.brandId, costPerOz);
      }
    });

    // Load all sales and theoretical recipe deductions for this tenant
    // Find how many ounces of each brand should have been poured based on recipes mapped
    const salesItems = db.prepare(`
      SELECT 
        ri.brandId,
        SUM(p.numSold * ri.pourSizeOz) as theoreticalOz
      FROM recipe_ingredients ri
      JOIN recipes r ON ri.recipeId = r.id
      JOIN pos_items p ON r.posItemNum = p.itemNum
      WHERE r.userId = ?
      GROUP BY ri.brandId
    `).all(user.id);

    const theoreticalMap = new Map();
    salesItems.forEach(item => {
      theoreticalMap.set(item.brandId, item.theoreticalOz);
    });

    // Compile audit data for all brands present in either count session or sales
    const allBrandIds = new Set([
      ...startingMap.keys(),
      ...endingMap.keys(),
      ...theoreticalMap.keys()
    ]);

    const auditList = [];
    let grandTotalPhysicalOz = 0;
    let grandTotalTheoreticalOz = 0;
    let grandTotalVarianceOz = 0;
    let grandTotalVarianceCost = 0;

    allBrandIds.forEach(brandId => {
      const start = startingMap.get(brandId) || { qtyOz: 0, qtyRaw: 0 };
      const end = endingMap.get(brandId) || { qtyOz: 0, qtyRaw: 0 };
      
      // Look up brand info
      let brandName = start.brandName;
      let brandCategory = start.brandCategory;
      if (!brandName) {
        const bRow = db.prepare('SELECT name, category FROM liquor_brands WHERE id = ?').get(brandId);
        if (bRow) {
          brandName = bRow.name;
          brandCategory = bRow.category;
        } else {
          brandName = 'Unknown Brand';
          brandCategory = 'UNKNOWN';
        }
      }

      // Theoretical sold (from recipes)
      const soldOz = theoreticalMap.get(brandId) || 0;

      // Restock (Invoiced receipts) - future implementation, default to 0
      const restockOz = 0;

      // Depletion (Physical usage) = (Start + Restock) - End
      // Math check: if they started with 10 oz, had 0 restock, and ended with 2 oz, they depleted 8 oz.
      const physicalDepletionOz = Math.max(0, (start.qtyOz + restockOz) - end.qtyOz);

      // Variance = Physical depletion - Theoretical sold
      // If we depleted 8 oz but only sold 5 oz, variance is +3 oz (loss/shrinkage).
      const varianceOz = physicalDepletionOz - soldOz;

      // Financial loss cost
      const costPerOz = costMap.get(brandId) || 0;
      const varianceCost = varianceOz * costPerOz;

      grandTotalPhysicalOz += physicalDepletionOz;
      grandTotalTheoreticalOz += soldOz;
      grandTotalVarianceOz += varianceOz;
      grandTotalVarianceCost += varianceCost;

      auditList.push({
        brandId,
        brandName,
        brandCategory,
        startingOz: parseFloat(start.qtyOz.toFixed(2)),
        startingQtyRaw: start.qtyRaw,
        endingOz: parseFloat(end.qtyOz.toFixed(2)),
        endingQtyRaw: end.qtyRaw,
        depletionOz: parseFloat(physicalDepletionOz.toFixed(2)),
        soldOz: parseFloat(soldOz.toFixed(2)),
        varianceOz: parseFloat(varianceOz.toFixed(2)),
        varianceCost: parseFloat(varianceCost.toFixed(2)),
        costPerOz: parseFloat(costPerOz.toFixed(4)),
        unitCost: costPerOz > 0 ? parseFloat((costPerOz * (750 / 29.5735)).toFixed(2)) : 0 // approx 750ml cost
      });
    });

    return NextResponse.json({
      posStartDate,
      posEndDate,
      startCountSession: countSessions.find(s => s.id === startCountId),
      endCountSession: countSessions.find(s => s.id === endCountId),
      countSessions,
      totals: {
        physicalDepletionOz: parseFloat(grandTotalPhysicalOz.toFixed(2)),
        theoreticalSoldOz: parseFloat(grandTotalTheoreticalOz.toFixed(2)),
        varianceOz: parseFloat(grandTotalVarianceOz.toFixed(2)),
        varianceCost: parseFloat(grandTotalVarianceCost.toFixed(2))
      },
      audit: auditList
    });

  } catch (error) {
    console.error('[Audit API GET Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
