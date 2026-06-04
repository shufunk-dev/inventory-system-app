const { createWorker } = require('tesseract.js');
const path = require('path');

async function test() {
  console.log('Initializing tesseract worker...');
  const worker = await createWorker('eng');
  
  const imgPath = path.resolve(__dirname, '../extracted_images/report_inventory/page_1.png');
  console.log(`Running OCR on ${imgPath}...`);
  
  const { data: { text } } = await worker.recognize(imgPath);
  console.log('--- OCR Result ---');
  console.log(text);
  console.log('------------------');
  
  await worker.terminate();
}

test().catch(console.error);
