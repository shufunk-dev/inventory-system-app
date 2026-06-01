'use client';

import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';

export default function BarcodeDisplay({ internalId, qrUrl }) {
  return (
    <div className="flex flex-wrap gap-4 items-center justify-start mt-6">
      <div className="flex flex-col items-center bg-white p-3 rounded-xl shadow border border-gray-200">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Internal ID</h3>
        <Barcode value={internalId} format="CODE128" width={1.2} height={35} fontSize={12} margin={0} displayValue={true} background="#ffffff" lineColor="#000000" />
      </div>
      
      <div className="flex flex-col items-center bg-white p-3 rounded-xl shadow border border-gray-200">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Scan for details</h3>
        <QRCodeSVG value={qrUrl} size={70} level={"M"} />
      </div>
    </div>
  );
}
