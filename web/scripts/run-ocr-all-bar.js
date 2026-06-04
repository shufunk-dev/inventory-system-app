const { createWorker } = require('tesseract.js');
const fs = require('fs');
const path = require('path');

async function processAllBar() {
  const dirPath = path.resolve(__dirname, '../extracted_images/all_bar');
  if (!fs.existsSync(dirPath)) {
    console.error(`Directory not found: ${dirPath}`);
    return;
  }
  
  console.log(`Starting OCR for all_bar rotated pages...`);
  // Only select page_1.png, page_2.png, ..., page_11.png. Exclude page_X_img_Y.png.
  const files = fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.png') && !f.includes('_img'))
    .sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, ''), 10);
      const numB = parseInt(b.replace(/[^0-9]/g, ''), 10);
      return numA - numB;
    });

  console.log(`Found ${files.length} clean page screenshots to process.`);
  
  const worker = await createWorker('eng');
  
  // Set parameters to optimize layout recognition for tables
  await worker.setParameters({
    tessedit_pageseg_mode: '6', // Assume a single uniform block of text
  });

  let fullText = '';
  
  for (const file of files) {
    const imgPath = path.join(dirPath, file);
    console.log(`Processing rotated ${file}...`);
    const { data: { text } } = await worker.recognize(imgPath);
    fullText += `\n--- PAGE ${file} ---\n` + text + '\n';
  }
  
  await worker.terminate();
  
  const outputPath = path.resolve(__dirname, '../all_bar_ocr.txt');
  fs.writeFileSync(outputPath, fullText);
  console.log(`✅ Saved all clean OCR text to ${outputPath}`);
}

processAllBar().catch(console.error);
