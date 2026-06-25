import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    
    // Fetch all items
    const items = db.prepare(`
      SELECT 
        i.id, i.name, i.barcode, i.itemType, i.description, i.createdAt,
        c.name as categoryName
      FROM items i
      LEFT JOIN categories c ON i.categoryId = c.id
      ORDER BY i.createdAt DESC
    `).all();

    // CSV Header
    let csvStr = "ID,Name,Barcode,Item Type,Category,Description,Date Added\n";

    // Build CSV rows
    for (const item of items) {
      // Escape quotes and wrap in quotes to handle commas in text
      const escapeCsv = (str) => {
        if (!str) return '""';
        const stringified = String(str);
        return `"${stringified.replace(/"/g, '""')}"`;
      };

      const dateStr = new Date(item.createdAt).toLocaleString('en-US');

      const row = [
        escapeCsv(item.id),
        escapeCsv(item.name),
        escapeCsv(item.barcode),
        escapeCsv(item.itemType),
        escapeCsv(item.categoryName || 'Uncategorized'),
        escapeCsv(item.description),
        escapeCsv(dateStr)
      ].join(',');

      csvStr += row + "\n";
    }

    // Return as a downloadable file
    return new NextResponse(csvStr, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="inventory_export.csv"',
      },
    });

  } catch (error) {
    console.error('CSV Export Error:', error);
    return NextResponse.json({ error: 'Failed to generate CSV' }, { status: 500 });
  }
}
