const { createWorker } = require('tesseract.js');
const path = require('path');

async function run() {
  const worker = await createWorker('eng');
  const imgPath = path.resolve(__dirname, '../extracted_images/all_bar/page_1.png');
  
  // Test PSM 6: Assume a single uniform block of text (bypasses column detection)
  console.log('Testing PSM 6...');
  await worker.setParameters({
    tessedit_pageseg_mode: '6',
  });
  
  const { data: { text } } = await worker.recognize(imgPath);
  console.log('--- PSM 6 Result (first 500 chars) ---');
  console.log(text.substring(0, 800));
  console.log('-------------------------------------');
  
  await worker.terminate();
}

run().catch(console.error);
