'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Upload, 
  Layers, 
  FileArchive, 
  FileImage, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRightLeft, 
  Trash2, 
  Sparkles, 
  ArrowRight,
  FolderOpen,
  Settings2
} from 'lucide-react';

function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export default function BulkIntakePage() {
  const [mode, setMode] = useState('duplex'); // 'duplex' | 'single'
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  
  const [dragActive, setDragActive] = useState(false);
  const [zipFile, setZipFile] = useState(null);
  const [rawFiles, setRawFiles] = useState([]);
  const [pairsPreview, setPairsPreview] = useState([]); // [{ id, frontFile, backFile, frontUrl, backUrl }]
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const fileInputRef = useRef(null);
  const zipInputRef = useRef(null);

  // Fetch categories on mount
  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCategories(data);
        else if (data && Array.isArray(data.categories)) setCategories(data.categories);
      })
      .catch(err => console.error('Failed to fetch categories:', err));
  }, []);

  // Update pair previews when raw files or mode change
  useEffect(() => {
    if (zipFile) {
      setPairsPreview([]);
      return;
    }

    if (!rawFiles || rawFiles.length === 0) {
      setPairsPreview([]);
      return;
    }

    const validExts = /\.(jpg|jpeg|png|webp|gif|bmp|heic)$/i;
    const sorted = [...rawFiles]
      .filter(f => validExts.test(f.name))
      .sort((a, b) => naturalSort(a.name, b.name));

    const pairs = [];
    if (mode === 'duplex') {
      for (let i = 0; i < sorted.length; i += 2) {
        const front = sorted[i];
        const back = sorted[i + 1] || null;
        pairs.push({
          id: `pair_${i}`,
          frontFile: front,
          backFile: back,
          frontUrl: URL.createObjectURL(front),
          backUrl: back ? URL.createObjectURL(back) : null
        });
      }
    } else {
      for (let i = 0; i < sorted.length; i++) {
        const front = sorted[i];
        pairs.push({
          id: `pair_${i}`,
          frontFile: front,
          backFile: null,
          frontUrl: URL.createObjectURL(front),
          backUrl: null
        });
      }
    }

    setPairsPreview(pairs);

    // Cleanup object URLs on change
    return () => {
      pairs.forEach(p => {
        if (p.frontUrl) URL.revokeObjectURL(p.frontUrl);
        if (p.backUrl) URL.revokeObjectURL(p.backUrl);
      });
    };
  }, [rawFiles, mode, zipFile]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFileList = (fileList) => {
    setErrorMessage(null);
    setUploadResult(null);

    const filesArray = Array.from(fileList);
    const zip = filesArray.find(f => f.name.endsWith('.zip'));

    if (zip) {
      setZipFile(zip);
      setRawFiles([]);
    } else {
      setZipFile(null);
      setRawFiles(filesArray);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFileList(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFileList(e.target.files);
    }
  };

  const swapPair = (index) => {
    setPairsPreview(prev => {
      const next = [...prev];
      const p = next[index];
      if (!p || !p.backFile) return prev;

      const tempFile = p.frontFile;
      const tempUrl = p.frontUrl;

      next[index] = {
        ...p,
        frontFile: p.backFile,
        frontUrl: p.backUrl,
        backFile: tempFile,
        backUrl: tempUrl
      };
      return next;
    });
  };

  const removePair = (index) => {
    setPairsPreview(prev => prev.filter((_, i) => i !== index));
  };

  const clearSelection = () => {
    setZipFile(null);
    setRawFiles([]);
    setPairsPreview([]);
    setUploadResult(null);
    setErrorMessage(null);
  };

  const handleUploadSubmit = async () => {
    if (!zipFile && pairsPreview.length === 0) {
      setErrorMessage('Please select or drop image files or a ZIP archive to upload.');
      return;
    }

    setUploading(true);
    setUploadProgress(20);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('mode', mode);
      if (selectedCategory) {
        formData.append('categoryId', selectedCategory);
      }

      if (zipFile) {
        formData.append('zipFile', zipFile);
      } else {
        // Send files in order derived from current preview state
        pairsPreview.forEach(pair => {
          if (pair.frontFile) formData.append('files', pair.frontFile);
          if (pair.backFile) formData.append('files', pair.backFile);
        });
      }

      setUploadProgress(50);

      const res = await fetch('/api/upload/duplex', {
        method: 'POST',
        body: formData
      });

      setUploadProgress(85);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete duplex scan intake');
      }

      setUploadProgress(100);
      setUploadResult(data);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/20 rounded-2xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Layers className="w-6 h-6" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Duplex Bulk Card Intake
              </h1>
            </div>
            <p className="text-gray-400 text-sm max-w-xl">
              High-speed bulk scanner integration for Epson ADF duplex scanners & ZIP archives. Automatically pairs front/back image sequences and queues AI card recognition.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 bg-gray-900/80 hover:bg-gray-800 border border-gray-700 transition-all"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Control Panel: Scanning Mode & Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mode Selector */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 space-y-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-blue-400" />
            Scanner Feed Mode
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('duplex')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-medium transition-all ${
                mode === 'duplex'
                  ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                  : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              <span className="font-semibold text-base">Duplex Scan</span>
              <span className="text-xs text-gray-400 mt-1">Odd = Front, Even = Back</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-medium transition-all ${
                mode === 'single'
                  ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                  : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'
              }`}
            >
              <span className="font-semibold text-base">Single-Sided</span>
              <span className="text-xs text-gray-400 mt-1">1 File = 1 Item Front</span>
            </button>
          </div>
        </div>

        {/* Category Target */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 space-y-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-indigo-400" />
            Destination Category (Optional)
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-gray-950/80 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">Uncategorized / Default</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            Assigned category for newly created draft card records.
          </p>
        </div>
      </div>

      {/* Main Drag and Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-200 ${
          dragActive
            ? 'border-blue-500 bg-blue-950/20 shadow-[0_0_30px_rgba(59,130,246,0.15)] scale-[1.005]'
            : 'border-gray-800 bg-gray-900/40 hover:border-gray-700 hover:bg-gray-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-xl">
            <Upload className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">
              Drag & Drop Scan Folder, Images, or ZIP Archive
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Supports bulk JPEGs/PNGs from Epson Scan or compressed `.zip` scanner packages.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
            >
              <FileImage className="w-4 h-4" />
              Select Scan Files
            </button>

            <span className="text-gray-600 text-xs uppercase font-bold">OR</span>

            <button
              type="button"
              onClick={() => zipInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 font-medium text-sm transition-all flex items-center gap-2"
            >
              <FileArchive className="w-4 h-4 text-amber-400" />
              Select ZIP Archive
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ZIP Selection Summary */}
      {zipFile && (
        <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <FileArchive className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white">{zipFile.name}</h4>
              <p className="text-xs text-gray-400">
                {(zipFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for server-side duplex extraction
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={clearSelection}
            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
            title="Clear ZIP"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Pre-Upload Pair Preview Grid */}
      {pairsPreview.length > 0 && !zipFile && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              Scan Pairs Preview ({pairsPreview.length} {pairsPreview.length === 1 ? 'Card' : 'Cards'})
            </h3>

            <button
              type="button"
              onClick={clearSelection}
              className="text-xs font-semibold text-gray-400 hover:text-red-400 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pairsPreview.map((pair, idx) => (
              <div
                key={pair.id}
                className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 space-y-3 relative group"
              >
                <div className="flex items-center justify-between text-xs text-gray-400 font-semibold border-b border-gray-800/80 pb-2">
                  <span>Card #{idx + 1}</span>
                  <div className="flex items-center gap-2">
                    {mode === 'duplex' && pair.backFile && (
                      <button
                        type="button"
                        onClick={() => swapPair(idx)}
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px]"
                        title="Swap Front & Back photos"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        Swap
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removePair(idx)}
                      className="text-gray-500 hover:text-red-400"
                      title="Remove pair"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Front Photo */}
                  <div className="space-y-1">
                    <div className="aspect-[3/4] bg-gray-950 rounded-xl overflow-hidden border border-gray-800 relative">
                      <img
                        src={pair.frontUrl}
                        alt="Front"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1 left-1 bg-black/80 text-[10px] text-blue-400 px-1.5 py-0.5 rounded font-mono border border-blue-500/30">
                        FRONT
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 truncate" title={pair.frontFile.name}>
                      {pair.frontFile.name}
                    </p>
                  </div>

                  {/* Back Photo */}
                  <div className="space-y-1">
                    {pair.backUrl ? (
                      <>
                        <div className="aspect-[3/4] bg-gray-950 rounded-xl overflow-hidden border border-gray-800 relative">
                          <img
                            src={pair.backUrl}
                            alt="Back"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-1 left-1 bg-black/80 text-[10px] text-emerald-400 px-1.5 py-0.5 rounded font-mono border border-emerald-500/30">
                            BACK
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 truncate" title={pair.backFile.name}>
                          {pair.backFile.name}
                        </p>
                      </>
                    ) : (
                      <div className="aspect-[3/4] bg-gray-950/50 border border-dashed border-gray-800 rounded-xl flex items-center justify-center text-gray-600 text-xs">
                        No Back
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Bar */}
      {(zipFile || pairsPreview.length > 0) && !uploadResult && (
        <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 shadow-2xl backdrop-blur-xl z-20">
          <div className="text-sm text-gray-300">
            Ready to upload <span className="font-bold text-white">{zipFile ? zipFile.name : `${pairsPreview.length} card pair(s)`}</span> and trigger AI card identification.
          </div>

          <button
            type="button"
            disabled={uploading}
            onClick={handleUploadSubmit}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-550 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing Intake ({uploadProgress}%)...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Ingest & Run AI Identification
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Upload Success State */}
      {uploadResult && (
        <div className="bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 space-y-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                Intake Complete! ({uploadResult.count} {uploadResult.count === 1 ? 'Card' : 'Cards'})
              </h3>
              <p className="text-sm text-emerald-200/80">
                Created card items with Front & Back photos. AI identification worker has been triggered in the background.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              type="button"
              onClick={clearSelection}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-600/20"
            >
              Scan Another Batch
            </button>

            <Link
              href="/"
              className="px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700 hover:bg-gray-800 text-gray-200 text-sm font-medium transition-all"
            >
              View Inventory Catalog
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
