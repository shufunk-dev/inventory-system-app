import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUser } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = await getDb();
    
    // Get all recipes, POS item details, and ingredients
    const recipes = db.prepare(`
      SELECT 
        r.id as recipeId,
        r.posItemNum,
        p.name as posItemName,
        p.price as posItemPrice,
        p.numSold as posItemNumSold
      FROM recipes r
      JOIN pos_items p ON r.posItemNum = p.itemNum
    `).all();

    const getIngredientsStmt = db.prepare(`
      SELECT 
        ri.id as ingredientId,
        ri.brandId,
        b.name as brandName,
        b.category as brandCategory,
        b.specificGravity,
        ri.pourSizeOz
      FROM recipe_ingredients ri
      JOIN liquor_brands b ON ri.brandId = b.id
      WHERE ri.recipeId = ?
    `);

    const result = recipes.map(r => {
      const ingredients = getIngredientsStmt.all(r.recipeId);
      return {
        ...r,
        ingredients
      };
    });

    // Also return list of POS items that DO NOT have recipes yet (for easy mapping)
    const unmappedPosItems = db.prepare(`
      SELECT itemNum, name, price, numSold
      FROM pos_items
      WHERE itemNum NOT IN (SELECT posItemNum FROM recipes)
      ORDER BY numSold DESC
    `).all();

    // Also return a list of all available liquor brands (to select from when mapping ingredients)
    const brands = db.prepare(`
      SELECT id, name, category, specificGravity
      FROM liquor_brands
      ORDER BY name ASC
    `).all();

    return NextResponse.json({
      recipes: result,
      unmappedPosItems,
      brands
    });

  } catch (error) {
    console.error('[Recipes GET Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const db = await getDb();

    if (body.action === 'add_brand') {
      const { brandName, brandCategory, specificGravity } = body;
      if (!brandName) {
        return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
      }

      // Check if brand already exists
      const existingBrand = db.prepare('SELECT id FROM liquor_brands WHERE lower(name) = lower(?)').get(brandName.trim());
      if (existingBrand) {
        return NextResponse.json({ error: 'Brand name already exists' }, { status: 400 });
      }

      const brandId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO liquor_brands (id, name, category, specificGravity, userId)
        VALUES (?, ?, ?, ?, ?)
      `).run(brandId, brandName.trim(), brandCategory || 'Spirits', specificGravity || 1.0, user.id);

      return NextResponse.json({ success: true, brandId, message: 'Brand added successfully!' });
    }

    const { posItemNum, ingredients } = body;
    if (!posItemNum || !Array.isArray(ingredients)) {
      return NextResponse.json({ error: 'Missing posItemNum or ingredients array' }, { status: 400 });
    }
    
    // Check if recipe already exists for this posItemNum
    let recipeId = null;
    const existing = db.prepare('SELECT id FROM recipes WHERE posItemNum = ?').get(posItemNum);
    
    const insertRecipeStmt = db.prepare('INSERT INTO recipes (id, posItemNum, userId) VALUES (?, ?, ?)');
    const deleteIngredientsStmt = db.prepare('DELETE FROM recipe_ingredients WHERE recipeId = ?');
    const insertIngredientStmt = db.prepare(`
      INSERT INTO recipe_ingredients (id, recipeId, brandId, pourSizeOz)
      VALUES (?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      if (existing) {
        recipeId = existing.id;
        // Clean old ingredients
        deleteIngredientsStmt.run(recipeId);
      } else {
        recipeId = crypto.randomUUID();
        insertRecipeStmt.run(recipeId, posItemNum, user.id);
      }

      // Insert new ingredients
      for (const ing of ingredients) {
        if (!ing.brandId || isNaN(ing.pourSizeOz) || ing.pourSizeOz <= 0) continue;
        insertIngredientStmt.run(crypto.randomUUID(), recipeId, ing.brandId, ing.pourSizeOz);
      }
    });

    transaction();

    return NextResponse.json({
      success: true,
      message: 'Recipe mapped successfully!',
      recipeId
    });

  } catch (error) {
    console.error('[Recipes POST Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const recipeId = searchParams.get('recipeId');

    if (!recipeId) {
      return NextResponse.json({ error: 'Missing recipeId' }, { status: 400 });
    }

    const db = await getDb();
    const result = db.prepare('DELETE FROM recipes WHERE id = ?').run(recipeId);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Recipe not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Recipe mapping deleted successfully!' });

  } catch (error) {
    console.error('[Recipes DELETE Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
