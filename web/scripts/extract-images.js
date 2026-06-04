const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

async function extractImages(filename) {
  const filePath = path.resolve(__dirname, '../', filename);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  
  console.log(`Extracting page screenshots from ${filename}...`);
  const dataBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: dataBuffer });
  const result = await parser.getScreenshot({ scale: 2.0, imageDataUrl: true });
  
  const outputDir = path.resolve(__dirname, '../extracted_images', filename.replace('.pdf', ''));
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  let count = 0;
  for (const page of result.pages) {
    count++;
    const imgPath = path.join(outputDir, `page_${page.pageNumber}.png`);
    const base64Data = page.dataUrl.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync(imgPath, Buffer.from(base64Data, 'base64'));
    console.log(`Saved ${imgPath} (${page.width}x${page.height} @ scale ${page.scale})`);
  }
  console.log(`✅ Extracted ${count} pages from ${filename}`);
}

async function run() {
  await extractImages('report_inventory.pdf');
  await extractImages('all_bar.pdf');
}

run().catch(console.error);
