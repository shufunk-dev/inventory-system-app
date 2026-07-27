/**
 * ESC/POS Binary Command Encoder Utility
 * Compiles receipt objects into direct byte arrays for thermal POS receipt printers.
 */

// Basic control bytes
const ESC = '\x1b';
const GS = '\x1d';

const COMMANDS = {
  INIT: `${ESC}@`,                      // Initialize printer
  ALIGN_LEFT: `${ESC}a\x00`,            // Left alignment
  ALIGN_CENTER: `${ESC}a\x01`,          // Center alignment
  ALIGN_RIGHT: `${ESC}a\x02`,           // Right alignment
  FONT_NORMAL: `${GS}!\x00`,            // Normal font size
  FONT_DOUBLE: `${GS}!\x11`,            // Double height & width font
  DRAWER_KICK: `${ESC}p\x00\x19\xfa`,   // Cash drawer kick (Pin 2, 25ms pulse)
  PAPER_CUT: `${GS}V\x42\x00`           // Cut paper (Feed paper and partial cut)
};

/**
 * Helper to right-pad a string with spaces
 */
function padRight(str, len) {
  if (str.length >= len) return str.substring(0, len);
  return str + ' '.repeat(len - str.length);
}

/**
 * Helper to left-pad a string with spaces
 */
function padLeft(str, len) {
  if (str.length >= len) return str.substring(0, len);
  return ' '.repeat(len - str.length) + str;
}

/**
 * Compiles receipt details into an ESC/POS binary Buffer.
 * Supports standard 42-column layout (standard for 80mm rolls).
 */
export function compileEscposReceipt(receipt, config = {}) {
  const {
    mallName = 'Antique Mall',
    mallAddress = '',
    mallPhone = '',
    receiptNo = 'R-000000',
    customerName = 'Walk-in Customer',
    receiptItems = [],
    subtotal = 0,
    taxRate = 7.0,
    taxAmount = 0,
    total = 0,
    receiptFooter = '',
    paymentMethod = '',
    cardDetails = '',
    cashTendered = null,
    changeDue = null
  } = receipt;

  const width = config.paperWidth === '58mm' ? 32 : 42; // Standard 42 columns for 80mm, 32 for 58mm
  let raw = '';

  // 1. Initialize
  raw += COMMANDS.INIT;

  // 2. Mall Header
  raw += COMMANDS.ALIGN_CENTER;
  raw += COMMANDS.FONT_DOUBLE;
  raw += `${mallName.toUpperCase()}\n`;
  raw += COMMANDS.FONT_NORMAL;
  if (mallAddress) raw += `${mallAddress}\n`;
  if (mallPhone) raw += `${mallPhone}\n`;
  
  // Divider
  raw += `${'-'.repeat(width)}\n`;

  // 3. Receipt Metadata
  raw += COMMANDS.ALIGN_LEFT;
  raw += `RECEIPT: ${receiptNo}\n`;
  raw += `DATE   : ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
  raw += `CLIENT : ${(customerName || 'Walk-in Customer').toUpperCase()}\n`;
  
  // Divider
  raw += `${'-'.repeat(width)}\n`;

  // 4. Line Items Table
  raw += 'QTY ITEM                       PRICE\n';
  receiptItems.forEach(item => {
    // Row 1: "1x Item Name" and line total
    const qtyText = `${item.qty}x `;
    const priceText = `$${(item.price * item.qty).toFixed(2)}`;
    
    // Remaining space for item name
    const maxNameLen = width - qtyText.length - priceText.length - 2;
    const nameText = item.name.slice(0, maxNameLen);
    
    const spacing = width - qtyText.length - nameText.length - priceText.length;
    raw += `${qtyText}${nameText}${' '.repeat(Math.max(1, spacing))}${priceText}\n`;
    
    // Row 2: attribution details
    raw += `  > Booth: ${item.storeName.slice(0, width - 15)} ($${item.price.toFixed(2)} ea)\n`;
  });

  // Divider
  raw += `${'-'.repeat(width)}\n`;

  // 5. Billing Totals (Right Aligned)
  raw += COMMANDS.ALIGN_RIGHT;
  raw += `SUBTOTAL: $${subtotal.toFixed(2)}\n`;
  raw += `TAX (${taxRate.toFixed(1)}%): $${taxAmount.toFixed(2)}\n`;
  raw += `TOTAL: $${total.toFixed(2)}\n`;

  if (paymentMethod) {
    raw += `${'-'.repeat(width)}\n`;
    raw += `PAYMENT METHOD: ${paymentMethod.toUpperCase()}\n`;
    if (cardDetails) {
      raw += `CARD DETAILS  : ${cardDetails.toUpperCase()}\n`;
    }
    if (cashTendered !== null && cashTendered !== undefined && cashTendered !== '') {
      const tenderedNum = typeof cashTendered === 'number' ? cashTendered : parseFloat(cashTendered || 0);
      const changeNum = typeof changeDue === 'number' ? changeDue : parseFloat(changeDue || 0);
      raw += `CASH TENDERED : $${tenderedNum.toFixed(2)}\n`;
      raw += `CHANGE GIVEN  : $${changeNum.toFixed(2)}\n`;
    }
  }

  // Divider
  raw += COMMANDS.ALIGN_CENTER;
  raw += `${'-'.repeat(width)}\n`;

  // 6. Thank you footer
  if (receiptFooter) {
    // Replace CRLF/LF with simple newlines and append
    raw += `${receiptFooter.replace(/\r\n/g, '\n')}\n`;
  } else {
    raw += 'THANK YOU FOR SHOPPING WITH US!\n';
    raw += 'ALL SALES FINAL ON ANTIQUES\n';
  }
  
  // Feed lines
  raw += '\n\n\n';

  // 7. Hardware triggers
  if (config.cashDrawerKick) {
    raw += COMMANDS.DRAWER_KICK;
  }
  if (config.paperCut) {
    raw += COMMANDS.PAPER_CUT;
  }

  // Convert raw string characters directly into a node binary Buffer using Latin1 encoding
  return Buffer.from(raw, 'binary');
}
