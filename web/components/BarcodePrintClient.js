'use client';

import { useState } from 'react';
import Barcode from 'react-barcode';
import { Printer, RotateCcw, Plus, Minus, Settings, ToggleLeft, ToggleRight, Check, Eye } from 'lucide-react';

export default function BarcodePrintClient({ 
  initialItems, 
  centralStoreName, 
  defaultBoothName 
}) {
  const [template, setTemplate] = useState('avery_5160');
  const [offset, setOffset] = useState(0);
  const [copies, setCopies] = useState(
    initialItems.reduce((acc, item) => ({ ...acc, [item.id]: 1 }), {})
  );
  
  // Toggles
  const [showStoreName, setShowStoreName] = useState(true);
  const [showItemName, setShowItemName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);

  // Avery Templates Specifications
  const templates = {
    avery_5160: {
      name: 'Avery 5160 / 8160',
      type: 'sheet',
      cols: 3,
      rows: 10,
      labelsPerPage: 30,
      width: '2.625in',
      height: '1.0in',
      pageWidth: '8.5in',
      pageHeight: '11in',
      paddingTop: '0.5in',
      paddingLeft: '0.219in',
      colGap: '0.136in',
      rowGap: '0in'
    },
    avery_5167: {
      name: 'Avery 5167 / 8167',
      type: 'sheet',
      cols: 4,
      rows: 20,
      labelsPerPage: 80,
      width: '1.75in',
      height: '0.5in',
      pageWidth: '8.5in',
      pageHeight: '11in',
      paddingTop: '0.5in',
      paddingLeft: '0.3in',
      colGap: '0.3in',
      rowGap: '0in'
    },
    avery_5161: {
      name: 'Avery 5161 / 8161',
      type: 'sheet',
      cols: 2,
      rows: 10,
      labelsPerPage: 20,
      width: '4.0in',
      height: '1.0in',
      pageWidth: '8.5in',
      pageHeight: '11in',
      paddingTop: '0.5in',
      paddingLeft: '0.156in',
      colGap: '0.188in',
      rowGap: '0in'
    },
    thermal_2x1: {
      name: 'Thermal Roll 2" x 1"',
      type: 'roll',
      cols: 1,
      rows: 1,
      labelsPerPage: 1,
      width: '2.0in',
      height: '1.0in',
      pageWidth: '2.0in',
      pageHeight: '1.0in',
      paddingTop: '0.05in',
      paddingLeft: '0.05in',
      colGap: '0in',
      rowGap: '0in'
    },
    thermal_15x1: {
      name: 'Thermal Roll 1.5" x 1"',
      type: 'roll',
      cols: 1,
      rows: 1,
      labelsPerPage: 1,
      width: '1.5in',
      height: '1.0in',
      pageWidth: '1.5in',
      pageHeight: '1.0in',
      paddingTop: '0.05in',
      paddingLeft: '0.05in',
      colGap: '0in',
      rowGap: '0in'
    },
    continuous_tag: {
      name: 'Continuous Tag Label',
      type: 'roll',
      cols: 1,
      rows: 1,
      labelsPerPage: 1,
      width: '2.5in',
      height: '1.6in',
      pageWidth: '2.5in',
      pageHeight: '1.6in',
      paddingTop: '0.1in',
      paddingLeft: '0.1in',
      colGap: '0in',
      rowGap: '0in'
    }
  };

  const spec = templates[template];

  const handleCopyChange = (itemId, change) => {
    setCopies(prev => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + change);
      return { ...prev, [itemId]: next };
    });
  };

  const handleResetCopies = () => {
    setCopies(
      initialItems.reduce((acc, item) => ({ ...acc, [item.id]: 1 }), {})
    );
  };

  // Generate the full array of labels to render (including offsets/blanks)
  const totalLabels = [];
  
  // Only apply starting offset to sheets (Letter paper), not roll labels
  const startOffset = spec.type === 'sheet' ? offset : 0;

  for (let i = 0; i < startOffset; i++) {
    totalLabels.push({ isOffset: true });
  }

  initialItems.forEach(item => {
    const count = copies[item.id] || 0;
    for (let c = 0; c < count; c++) {
      totalLabels.push({
        isOffset: false,
        item
      });
    }
  });

  // Calculate pages for sheets
  const pages = [];
  if (spec.type === 'sheet') {
    const perPage = spec.labelsPerPage;
    for (let i = 0; i < totalLabels.length; i += perPage) {
      pages.push(totalLabels.slice(i, i + perPage));
    }
    // Ensure at least one page is shown even if empty
    if (pages.length === 0) pages.push([]);
  } else {
    // Rolls print sequentially, each label acts as a page
    pages.push(totalLabels);
  }

  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col md:flex-row">
      {/* 1. Left Side: Configuration Panel (Hidden in print) */}
      <aside className="w-full md:w-96 bg-gray-900 border-b md:border-b-0 md:border-r border-gray-800 p-6 flex flex-col gap-6 no-print overflow-y-auto max-h-screen">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-white">
            <Printer className="w-5 h-5 text-emerald-500" />
            Barcode Printer
          </h1>
          <p className="text-xs text-gray-400 mt-1">Configure layout, copies, and print options</p>
        </div>

        <hr className="border-gray-850" />

        {/* Template Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" /> Paper/Label Preset
          </label>
          <select 
            value={template}
            onChange={(e) => {
              setTemplate(e.target.value);
              // Reset offset if moving to rolls
              if (templates[e.target.value].type === 'roll') setOffset(0);
            }}
            className="w-full bg-gray-850 border border-gray-700 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-blue-500"
          >
            {Object.entries(templates).map(([key, val]) => (
              <option key={key} value={key}>{val.name}</option>
            ))}
          </select>
        </div>

        {/* Sheet Starting Offset (Only shown for sheets) */}
        {spec.type === 'sheet' && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Starting Offset: <span className="text-emerald-400 font-mono font-bold">{offset}</span>
            </label>
            <p className="text-[10px] text-gray-400">Skip slots to print on partially used sheets</p>
            <div className="grid grid-cols-6 gap-1 bg-gray-850 p-2 rounded-xl border border-gray-750 max-h-36 overflow-y-auto">
              {Array.from({ length: spec.labelsPerPage }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setOffset(idx)}
                  className={`aspect-square rounded text-[10px] font-bold transition-all border ${
                    offset === idx 
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/20' 
                      : idx < offset 
                        ? 'bg-gray-800 border-gray-750 text-gray-500' 
                        : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-650'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            {offset > 0 && (
              <button 
                onClick={() => setOffset(0)}
                className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1.5 mt-1 transition-colors self-start"
              >
                <RotateCcw className="w-3 h-3" /> Clear offset
              </button>
            )}
          </div>
        )}

        <hr className="border-gray-850" />

        {/* Content Toggles */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Label Contents</label>
          
          <div className="flex items-center justify-between bg-gray-850 px-4 py-2.5 rounded-xl border border-gray-750">
            <span className="text-sm font-medium text-gray-200">Show Store Name</span>
            <button 
              onClick={() => setShowStoreName(!showStoreName)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {showStoreName ? <ToggleRight className="w-7 h-7 text-emerald-500" /> : <ToggleLeft className="w-7 h-7 text-gray-600" />}
            </button>
          </div>

          <div className="flex items-center justify-between bg-gray-850 px-4 py-2.5 rounded-xl border border-gray-750">
            <span className="text-sm font-medium text-gray-200">Show Item Title</span>
            <button 
              onClick={() => setShowItemName(!showItemName)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {showItemName ? <ToggleRight className="w-7 h-7 text-emerald-500" /> : <ToggleLeft className="w-7 h-7 text-gray-600" />}
            </button>
          </div>

          <div className="flex items-center justify-between bg-gray-850 px-4 py-2.5 rounded-xl border border-gray-750">
            <span className="text-sm font-medium text-gray-200">Show Retail Price</span>
            <button 
              onClick={() => setShowPrice(!showPrice)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {showPrice ? <ToggleRight className="w-7 h-7 text-emerald-500" /> : <ToggleLeft className="w-7 h-7 text-gray-600" />}
            </button>
          </div>
        </div>

        <hr className="border-gray-850" />

        {/* Selected Items Copy Counts */}
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Item Print List</label>
            <button 
              onClick={handleResetCopies}
              className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset copies
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {initialItems.map(item => (
              <div 
                key={item.id} 
                className={`flex items-center justify-between bg-gray-850 p-3 rounded-xl border transition-all ${
                  copies[item.id] > 0 ? 'border-gray-700' : 'border-gray-800 opacity-40'
                }`}
              >
                <div className="flex flex-col gap-0.5 flex-1 min-w-0 pr-3">
                  <span className="text-xs font-bold text-gray-100 truncate">{item.name || 'Unnamed'}</span>
                  <span className="text-[10px] text-gray-500 font-mono truncate">{item.id}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleCopyChange(item.id, -1)}
                    className="p-1 hover:bg-gray-750 rounded text-gray-400 hover:text-white transition-colors border border-gray-700"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-extrabold font-mono w-6 text-center text-white">
                    {copies[item.id] || 0}
                  </span>
                  <button 
                    onClick={() => handleCopyChange(item.id, 1)}
                    className="p-1 hover:bg-gray-750 rounded text-gray-400 hover:text-white transition-colors border border-gray-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={triggerPrint}
          className="mt-auto w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all duration-300 flex items-center justify-center gap-2"
        >
          <Printer className="w-5 h-5" />
          Print Labels
        </button>

        <div className="bg-gray-850 border border-gray-700/50 p-3.5 rounded-xl text-[11px] text-gray-400 mt-2 flex flex-col gap-1">
          <span className="font-bold text-gray-300">💡 Saving for later?</span>
          <span>In the print dialog, change the Destination to <strong>"Save as PDF"</strong> to download a master copy of these label sheets.</span>
        </div>
      </aside>

      {/* 2. Right Side: Sheet Preview (Styled to look like sheets) */}
      <main className="flex-1 bg-gray-950 flex flex-col items-center p-8 overflow-y-auto max-h-screen selection:bg-blue-500/20 relative">
        <div className="no-print absolute top-4 left-6 flex items-center gap-2 text-gray-400 text-xs">
          <Eye className="w-4 h-4 text-blue-500 animate-pulse" />
          <span>Interactive Sheet Preview (Dotted borders show print guides; they won't print)</span>
        </div>

        {/* CSS rules for exact Avery/Thermal printing dimensions */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: ${spec.type === 'sheet' ? 'letter portrait' : `${spec.pageWidth} ${spec.pageHeight}`};
              margin: 0 !important;
            }
            html, body {
              background: white !important;
              color: black !important;
              margin: 0 !important;
              padding: 0 !important;
              width: ${spec.pageWidth} !important;
              height: ${spec.type === 'sheet' ? '11in' : 'auto'} !important;
            }
            .no-print {
              display: none !important;
            }
            .print-page {
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
              padding-top: ${spec.paddingTop} !important;
              padding-left: ${spec.paddingLeft} !important;
              width: ${spec.pageWidth} !important;
              height: ${spec.pageHeight} !important;
              page-break-after: always !important;
              break-after: page !important;
              background: white !important;
              box-sizing: border-box !important;
            }
            .label-slot {
              border: none !important;
              box-shadow: none !important;
            }
          }
        `}} />

        <div className="flex flex-col gap-8 w-full items-center my-6">
          {spec.type === 'sheet' ? (
            // Sheets Layout (Letters Pages)
            pages.map((pageLabels, pageIdx) => (
              <div 
                key={pageIdx}
                className="print-page bg-white shadow-2xl rounded-sm border border-gray-300/20 box-sizing-border text-black select-none"
                style={{
                  width: spec.pageWidth,
                  height: spec.pageHeight,
                  paddingTop: spec.paddingTop,
                  paddingLeft: spec.paddingLeft,
                }}
              >
                <div 
                  className="grid h-full w-full"
                  style={{
                    gridTemplateColumns: `repeat(${spec.cols}, ${spec.width})`,
                    gridTemplateRows: `repeat(${spec.rows}, ${spec.height})`,
                    columnGap: spec.colGap,
                    rowGap: spec.rowGap,
                  }}
                >
                  {pageLabels.map((lbl, lblIdx) => (
                    <div 
                      key={lblIdx}
                      className={`label-slot border border-dashed border-gray-300 flex flex-col items-center justify-between text-center overflow-hidden box-sizing-border`}
                      style={{
                        width: spec.width,
                        height: spec.height,
                        padding: template === 'avery_5167' ? '0.02in 0.05in' : '0.05in 0.1in',
                      }}
                    >
                      {lbl.isOffset ? (
                        // Empty slot
                        <div className="no-print w-full h-full bg-gray-50 flex items-center justify-center text-[9px] text-gray-300 font-bold">
                          Offset Skip
                        </div>
                      ) : (
                        // Active label
                        <>
                          {/* Store Name */}
                          {showStoreName && (
                            <div className="w-full uppercase text-gray-800 leading-none truncate" style={{ fontSize: template === 'avery_5167' ? '6px' : '9px', fontWeight: 800 }}>
                              {centralStoreName}
                            </div>
                          )}

                          {/* Item Title */}
                          {showItemName && (
                            <div className="w-full text-black font-extrabold leading-none truncate" style={{ fontSize: template === 'avery_5167' ? '6.5px' : '9.5px', marginTop: '0.02in' }}>
                              {lbl.item.name || 'Unnamed'}
                            </div>
                          )}

                          {/* Barcode svg */}
                          <div className="w-full flex justify-center overflow-hidden leading-none [&>svg]:max-w-full [&>svg]:h-auto my-0.5">
                            <Barcode 
                              value={lbl.item.id} 
                              format="CODE128" 
                              width={template === 'avery_5167' ? 0.75 : 1.0} 
                              height={template === 'avery_5167' ? 12 : 22} 
                              fontSize={template === 'avery_5167' ? 5.5 : 7}
                              margin={0} 
                              displayValue={template !== 'avery_5167'} 
                              background="#ffffff" 
                              lineColor="#000000" 
                            />
                          </div>

                          {/* Price */}
                          {showPrice && lbl.item.retailPrice !== null && lbl.item.retailPrice !== undefined && (
                            <div className="w-full border-t border-dashed border-gray-300 leading-none pt-0.5" style={{ fontSize: template === 'avery_5167' ? '6.5px' : '9.5px' }}>
                              <span className="font-bold text-gray-500 mr-0.5" style={{ fontSize: template === 'avery_5167' ? '5.5px' : '7.5px' }}>PRICE:</span>
                              <span className="font-extrabold font-mono">${parseFloat(lbl.item.retailPrice).toFixed(2)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Rolls Layout (Sequential pages)
            <div className="flex flex-col gap-6 items-center w-full">
              {pages[0].map((lbl, lblIdx) => {
                if (lbl.isOffset) return null; // No offsets printed on thermal rolls
                return (
                  <div 
                    key={lblIdx}
                    className="print-page bg-white shadow-2xl rounded-sm border border-gray-300 text-black flex flex-col items-center justify-between text-center overflow-hidden select-none box-sizing-border"
                    style={{
                      width: spec.width,
                      height: spec.height,
                      paddingTop: spec.paddingTop,
                      paddingLeft: spec.paddingLeft,
                      padding: '0.05in 0.1in',
                    }}
                  >
                    {/* Store Name */}
                    {showStoreName && (
                      <div className="w-full uppercase text-gray-800 leading-none truncate text-[8.5px] font-extrabold">
                        {centralStoreName}
                      </div>
                    )}

                    {/* Item Title */}
                    {showItemName && (
                      <div className="w-full text-black font-black leading-none truncate text-[9.5px] mt-1">
                        {lbl.item.name || 'Unnamed'}
                      </div>
                    )}

                    {/* Barcode svg */}
                    <div className="w-full flex justify-center overflow-hidden leading-none [&>svg]:max-w-full [&>svg]:h-auto my-1">
                      <Barcode 
                        value={lbl.item.id} 
                        format="CODE128" 
                        width={template === 'thermal_15x1' ? 0.85 : 1.1} 
                        height={24} 
                        fontSize={8} 
                        margin={0} 
                        displayValue={true} 
                        background="#ffffff" 
                        lineColor="#000000" 
                      />
                    </div>

                    {/* Price */}
                    {showPrice && lbl.item.retailPrice !== null && lbl.item.retailPrice !== undefined && (
                      <div className="w-full border-t border-dashed border-gray-300 leading-none pt-1 text-[9.5px]">
                        <span className="font-bold text-gray-500 mr-0.5 text-[7.5px]">PRICE:</span>
                        <span className="font-extrabold font-mono">${parseFloat(lbl.item.retailPrice).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {pages[0].length === 0 && (
                <div className="text-gray-500 italic p-12">No barcodes selected to print. Make sure to set copies &gt; 0.</div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
