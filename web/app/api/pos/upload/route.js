import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    let fileText = '';
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (file.name.endsWith('.pdf')) {
      // 1. Try to extract digital text directly first (much faster and highly accurate for digital PDFs)
      const pdf = require('pdf-parse');
      let isDigital = false;
      try {
        const data = await pdf(buffer);
        if (data && data.text && data.text.trim().length > 100) {
          const tempLines = data.text.split('\n');
          let matchCount = 0;
          const testRegex = /^(\d+)\s+(\S+)\s+(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/;
          for (const line of tempLines) {
            if (line.match(testRegex)) matchCount++;
            if (matchCount >= 2) break;
          }
          if (matchCount >= 2) {
            console.log(`[POS Upload] Successfully extracted digital text from PDF directly! (Skipping OCR)`);
            fileText = data.text;
            isDigital = true;
          }
        }
      } catch (e) {
        console.warn(`[POS Upload] Direct digital text extraction skipped:`, e.message);
      }

      // 2. Fall back to OCR if digital text is empty or unstructured (e.g. scanned paper PDF)
      if (!isDigital) {
        console.log(`[POS Upload] PDF is scanned or lacks digital text. Running OCR fallback...`);
        const canvasModule = require('@napi-rs/canvas');
        global.DOMMatrix = canvasModule.DOMMatrix;
        global.ImageData = canvasModule.ImageData;
        global.Path2D = canvasModule.Path2D;
        global.DOMPoint = canvasModule.DOMPoint;
        global.DOMRect = canvasModule.DOMRect;
        global.Image = canvasModule.Image;

        const { PDFParse } = require('pdf-parse');
        const { createWorker } = require('tesseract.js');
        const { createCanvas, loadImage } = canvasModule;

        const parser = new PDFParse({ data: buffer });
        const result = await parser.getScreenshot({ scale: 2.0, imageDataUrl: true });

        const worker = await createWorker('eng');
        await worker.setParameters({
          tessedit_pageseg_mode: '6',
        });

        // Attempt 1: Standard OCR (upright / unrotated)
        let ocrTextStandard = '';
        for (const page of result.pages) {
          const pageBuffer = Buffer.from(page.dataUrl.replace(/^data:image\/png;base64,/, ""), 'base64');
          const { data: { text } } = await worker.recognize(pageBuffer);
          ocrTextStandard += `\n--- PAGE page_${page.pageNumber}.png ---\n` + text + '\n';
        }

        const tempLines = ocrTextStandard.split('\n');
        let matchCount = 0;
        const testRegex = /^(\d+)\s+(\S+)\s+(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/;
        for (const line of tempLines) {
          if (line.match(testRegex)) matchCount++;
          if (matchCount >= 2) break;
        }

        if (matchCount >= 2) {
          console.log(`[POS Upload] Scanned PDF parsed successfully using Standard OCR (Unrotated).`);
          fileText = ocrTextStandard;
        } else {
          // Attempt 2: 90-degree rotated OCR (for landscape sheets scanned sideways)
          console.log(`[POS Upload] Standard OCR returned no items. Attempting 90-degree rotated OCR fallback...`);
          let ocrTextRotated = '';
          for (const page of result.pages) {
            const img = await loadImage(Buffer.from(page.dataUrl.replace(/^data:image\/png;base64,/, ""), 'base64'));
            const canvas = createCanvas(img.height, img.width);
            const ctx = canvas.getContext('2d');
            ctx.translate(img.height / 2, img.width / 2);
            ctx.rotate(90 * Math.PI / 180);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);

            const rotatedBuffer = canvas.toBuffer('image/png');
            const { data: { text } } = await worker.recognize(rotatedBuffer);
            ocrTextRotated += `\n--- PAGE page_${page.pageNumber}.png ---\n` + text + '\n';
          }
          fileText = ocrTextRotated;
        }

        await worker.terminate();
      }
    } else {
      fileText = buffer.toString('utf8');
    }
    // Now parse the fileText
    const lines = fileText.split('\n');
    
    // Parse date range (e.g. 04/01/2026 - 04/30/2026) from the headers
    let startDate = null;
    let endDate = null;
    const dateRangeRegex = /(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:-|\s+to\s+)\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/;
    for (const line of lines) {
      const matchDate = line.match(dateRangeRegex);
      if (matchDate) {
        startDate = matchDate[1];
        endDate = matchDate[2];
        break; // Use the first matching range found (usually the period header)
      }
    }

    const items = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const clean = trimmed.replace(/~/g, '').replace(/_/g, '').trim();
      // Columns: Rank ItemNum ItemName NumSold Price SoldAmount Cost Profit FoodCost% %Sales
      const match = clean.match(/^(\d+)\s+(\S+)\s+(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+([\d,]+\.\d+)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)(?:\s+.*)?$/);

      if (match) {
        items.push({
          rank: parseInt(match[1]),
          itemNum: match[2].trim(),
          name: match[3].trim(),
          numSold: parseFloat(match[4]),
          price: parseFloat(match[5]),
          amount: parseFloat(match[6].replace(/,/g, '')),
          cost: parseFloat(match[7].replace(/,/g, '')),
          profit: parseFloat(match[8].replace(/,/g, '')),
          foodCostPct: parseFloat(match[9]),
          salesPct: parseFloat(match[10])
        });
      }
    }

    if (items.length === 0) {
      return NextResponse.json({ error: 'Could not parse any POS sales rows from the file.' }, { status: 400 });
    }

    // Save POS items in database
    const db = await getDb();

    // Save sales period if parsed
    if (startDate && endDate) {
      db.prepare(`
        INSERT INTO system_settings (key, value)
        VALUES ('pos_start_date', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(startDate);
      
      db.prepare(`
        INSERT INTO system_settings (key, value)
        VALUES ('pos_end_date', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(endDate);
    }

    const insertStmt = db.prepare(`
      INSERT INTO pos_items (itemNum, name, price, amount, numSold, userId)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(itemNum) DO UPDATE SET
        name = excluded.name,
        price = excluded.price,
        amount = excluded.amount,
        numSold = excluded.numSold,
        userId = excluded.userId
    `);

    const transaction = db.transaction((rows) => {
      for (const row of rows) {
        insertStmt.run(row.itemNum, row.name, row.price, row.amount, row.numSold, user.id);
      }
    });

    transaction(items);

    return NextResponse.json({
      success: true,
      message: `Successfully parsed and synced ${items.length} POS sales items.`,
      itemsCount: items.length,
      items: items.slice(0, 10) // Return first 10 for review
    });

  } catch (error) {
    console.error('[POS Upload Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
