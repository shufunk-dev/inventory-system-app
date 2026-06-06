'use client';

import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';

export default function BarcodeDisplay({ 
  internalId, 
  qrUrl,
  centralStoreName = 'Antique Mall',
  boothName = 'Central',
  itemName = '',
  retailPrice = null
}) {
  const shortName = itemName.length > 20 ? itemName.slice(0, 20) + '...' : itemName;

  const printLabelOnly = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    
    const priceHtml = retailPrice !== null && retailPrice !== undefined 
      ? `<div class="price">PRICE: $${parseFloat(retailPrice).toFixed(2)}</div>` 
      : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Label - ${shortName}</title>
          <style>
            @page {
              margin: 0;
            }
            body {
              margin: 0;
              padding: 15px;
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              background: white;
            }
            .label {
              border: 1px solid #000;
              padding: 15px;
              width: 260px;
              text-align: center;
              box-sizing: border-box;
            }
            .store {
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
              margin: 0;
              border-bottom: 1px dashed #000;
              padding-bottom: 5px;
              margin-bottom: 5px;
            }
            .booth {
              font-size: 9px;
              color: #555;
              margin: 2px 0 0 0;
            }
            .name {
              font-size: 13px;
              font-weight: bold;
              margin: 8px 0;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .barcode-container {
              margin: 10px 0;
              display: flex;
              justify-content: center;
            }
            .price {
              font-size: 14px;
              font-weight: bold;
              border-top: 1px dashed #000;
              padding-top: 5px;
              margin-top: 5px;
            }
            @media print {
              body {
                padding: 0;
              }
              .label {
                border: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="label">
            ${boothName && boothName !== 'Central' && boothName !== 'default' ? `
              <div class="store">
                ${centralStoreName}
                <div class="booth">Booth: ${boothName}</div>
              </div>
            ` : ''}
            <div class="name">${shortName}</div>
            <div class="barcode-container" id="bc-target"></div>
            ${priceHtml}
          </div>
          <script>
            // Clone the SVG of the barcode from the parent window
            const originalHtml = window.opener.document.getElementById('barcode-tag-render').innerHTML;
            document.getElementById('bc-target').innerHTML = originalHtml;
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-wrap gap-6 items-center justify-start mt-6 no-print">
      {/* Barcode Label Container (styled like a real sticky price tag) */}
      <div className="flex flex-col items-center bg-white p-4 rounded-lg shadow-md border border-gray-300 w-[240px] text-gray-900 select-none">
        {/* Mall / Store Name & Booth (Only if not default/Central) */}
        {boothName && boothName !== 'Central' && boothName !== 'default' && (
          <div className="text-center w-full border-b border-dashed border-gray-300 pb-1.5 mb-2">
            <p className="text-[10px] font-extrabold uppercase tracking-tight text-gray-800 line-clamp-1">
              {centralStoreName}
            </p>
            <p className="text-[9px] font-medium text-gray-500 line-clamp-1">
              Booth: {boothName}
            </p>
          </div>
        )}

        {/* Shortened Item Name */}
        <p className="text-xs font-bold text-center text-gray-900 mb-2 line-clamp-1 h-4">
          {shortName}
        </p>

        {/* The Barcode Image */}
        <div className="my-1.5" id="barcode-tag-render">
          <Barcode 
            value={internalId} 
            format="CODE128" 
            width={1.1} 
            height={40} 
            fontSize={9} 
            margin={0} 
            displayValue={true} 
            background="#ffffff" 
            lineColor="#000000" 
          />
        </div>

        {/* Price (if configured) */}
        {retailPrice !== null && retailPrice !== undefined && (
          <div className="mt-2 text-center w-full border-t border-dashed border-gray-300 pt-1.5">
            <span className="text-xs font-bold text-gray-500 mr-1">PRICE:</span>
            <span className="text-sm font-extrabold text-gray-900 font-mono">
              ${parseFloat(retailPrice).toFixed(2)}
            </span>
          </div>
        )}

        <button 
          onClick={printLabelOnly}
          className="mt-3 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 border border-gray-300 w-full justify-center"
        >
          <Printer className="w-3.5 h-3.5 text-gray-500" /> Print Price Tag Label
        </button>
      </div>

      {/* QR Code Container (Optional Detail page scanner) */}
      <div className="flex flex-col items-center bg-white p-4 rounded-lg shadow-md border border-gray-300 w-[120px] text-gray-900">
        <h3 className="text-[9px] font-extrabold text-gray-500 uppercase tracking-wider mb-3 text-center">Scan Info</h3>
        <div className="p-1 border border-gray-200 rounded-md">
          <QRCodeSVG value={qrUrl} size={76} level={"M"} />
        </div>
      </div>
    </div>
  );
}
