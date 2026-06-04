const { createWorker } = require('tesseract.js');
const fs = require('fs');
const path = require('path');

async function processDirectory(dirName, outputFileName) {
  const dirPath = path.resolve(__dirname, '../extracted_images', dirName);
  if (!fs.existsSync(dirPath)) {
    console.error(`Directory not found: ${dirPath}`);
    return;
  }
  
  console.log(`Starting OCR for directory: ${dirName}`);
  const files = fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.png'))
    .sort((a, b) => {
      // Sort page_1, page_2, etc. numerically
      const numA = parseInt(a.replace(/[^0-9]/g, ''), 10);
      const numB = parseInt(b.replace(/[^0-9]/g, ''), 10);
      return numA - numB;
    });

  const worker = await createWorker('eng');
  let fullText = '';
  
  for (const file of files) {
    const imgPath = path.join(dirPath, file);
    console.log(`Processing ${file}...`);
    const { data: { text } } = await worker.recognize(imgPath);
    fullText += `\n--- PAGE ${file} ---\n` + text + '\n';
  }
  
  await worker.terminate();
  
  const outputPath = path.resolve(__dirname, '../', outputFileName);
  fs.writeFileSync(outputPath, fullText);
  console.log(`✅ Saved all OCR text to ${outputPath}`);
}

async function run() {
  await processDirectory('report_inventory', 'report_inventory_ocr.txt');
  await processDirectory('all_bar', 'all_bar_ocr.txt');
}

run().catch(console.error);
