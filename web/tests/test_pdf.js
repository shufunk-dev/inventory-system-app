import { createRequire } from 'module';
const require = createRequire(import.meta.url);

try {
  const pdfParseModule = require('pdf-parse');
  console.log('pdf-parse keys:', Object.keys(pdfParseModule));
  console.log('pdf-parse default export:', typeof pdfParseModule);
} catch (e) {
  console.error('Error importing pdf-parse:', e.message);
}
