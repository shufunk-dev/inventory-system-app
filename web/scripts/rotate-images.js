const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

async function rotateImage(imgPath) {
  console.log(`Rotating ${imgPath}...`);
  const img = await loadImage(imgPath);
  
  // Create a canvas with swapped width and height for a 90-degree rotation
  const canvas = createCanvas(img.height, img.width);
  const ctx = canvas.getContext('2d');
  
  // Rotate 90 degrees clockwise
  ctx.translate(img.height / 2, img.width / 2);
  ctx.rotate(90 * Math.PI / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(imgPath, buffer);
  console.log(`✅ Rotated and saved ${imgPath}`);
}

async function run() {
  const dirPath = path.resolve(__dirname, '../extracted_images/all_bar');
  if (!fs.existsSync(dirPath)) {
    console.error(`Directory not found: ${dirPath}`);
    return;
  }
  
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.png') && !f.includes('_img_'));
  for (const file of files) {
    const imgPath = path.join(dirPath, file);
    await rotateImage(imgPath);
  }
  console.log('All all_bar images rotated successfully!');
}

run().catch(console.error);
