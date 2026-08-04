'use client';

import { Printer, Download, Check } from 'lucide-react';
import { useState } from 'react';

export default function PrintControls() {
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handlePrint}
        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow-lg hover:shadow-emerald-500/20 transition-all cursor-pointer"
        title="Print entire document or save as PDF"
      >
        <Printer className="w-4 h-4" />
        <span>Print Entire Journal (Ctrl+P)</span>
      </button>
    </div>
  );
}
