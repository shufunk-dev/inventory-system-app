const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

async function parse(filename) {
  const filePath = path.resolve(__dirname, '../', filename);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  
  console.log(`Parsing ${filename}...`);
  const dataBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: dataBuffer });
  const data = await parser.getText();
  
  const textPath = filePath.replace('.pdf', '.txt');
  fs.writeFileSync(textPath, data.text);
  console.log(`✅ Saved text of ${filename} to ${textPath}`);
}

async function run() {
  await parse('report_inventory.pdf');
  await parse('all_bar.pdf');
  await parse('all_bar_2.pdf');
}

run().catch(console.error);

