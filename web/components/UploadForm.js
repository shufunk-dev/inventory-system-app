'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, X, Plus } from 'lucide-react';
import { buildCategoryTree } from '@/lib/categories';

export default function UploadForm() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileConfigs, setFileConfigs] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [categories, setCategories] = useState([]);
  
  const router = useRouter();

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => setCategories(buildCategoryTree(data)))
      .catch(console.error);
  }, []);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;
    
    setSelectedFiles(files);
    
    // Initialize config state for each file
    const initialConfigs = files.map(() => ({
      categoryId: '',
      itemType: 'standard',
      isCreatingNew: false,
      newCategoryName: ''
    }));
    setFileConfigs(initialConfigs);
    
    e.target.value = null; // reset
  };

  const cancelUpload = () => {
    setSelectedFiles([]);
    setFileConfigs([]);
    setUploadProgress('');
  };

  const updateFileConfig = (index, field, value) => {
    const newConfigs = [...fileConfigs];
    newConfigs[index][field] = value;
    setFileConfigs(newConfigs);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const config = fileConfigs[i];
      let finalCategoryId = config.categoryId;

      setUploadProgress(`Processing ${i + 1} of ${selectedFiles.length}...`);

      // 1. Create new category if needed for this specific file
      if (config.isCreatingNew && config.newCategoryName.trim()) {
        try {
          const catRes = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: config.newCategoryName })
          });
          const newCat = await catRes.json();
          if (newCat.error) {
            alert(`Category Error on ${file.name}: ${newCat.error}`);
            setIsUploading(false);
            return;
          }
          finalCategoryId = newCat.id;
        } catch (e) {
          alert(`Failed to create category for ${file.name}`);
          setIsUploading(false);
          return;
        }
      } else if (config.isCreatingNew && !config.newCategoryName.trim()) {
        // If they clicked "Create New" but left it blank, gracefully fallback to Uncategorized.
        finalCategoryId = '';
      }

      // 2. Upload the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('itemType', config.itemType || 'standard');
      if (finalCategoryId) {
        formData.append('categoryId', finalCategoryId);
      }

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          successCount += data.count;
        } else {
          alert(`Error uploading ${file.name}: ${data.error}`);
        }
      } catch (error) {
        alert(`Upload failed for ${file.name}`);
      }
    }

    alert(`Successfully imported ${successCount} items across ${selectedFiles.length} files!`);
    setIsUploading(false);
    cancelUpload();
    router.refresh(); 
  };

  return (
    <>
      <div className="relative inline-block">
        <input
          type="file"
          id="zip-upload"
          accept=".zip"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <label
          htmlFor="zip-upload"
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-lg cursor-pointer transition-all bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/50 hover:-translate-y-0.5"
        >
          <Upload className="w-5 h-5" />
          Import ZIP(s)
        </label>
      </div>

      {/* Category Selection Modal */}
      {selectedFiles.length > 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-3xl p-8 max-w-2xl w-full border border-gray-700 shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <h2 className="text-2xl font-bold text-white mb-2">Import {selectedFiles.length} Batch(es)</h2>
            <p className="text-gray-400 mb-6 text-sm">Select the correct category for each individual ZIP file below.</p>

            <div className="overflow-y-auto pr-2 space-y-6 flex-1 min-h-0 custom-scrollbar">
              {selectedFiles.map((file, i) => (
                <div key={i} className="bg-gray-800/50 border border-gray-800 p-4 rounded-2xl space-y-4">
                  <p className="text-white font-medium truncate flex items-center gap-2">
                    <span className="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded-md">Batch {i+1}</span>
                    {file.name}
                  </p>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Item Type</label>
                    <select 
                      value={fileConfigs[i]?.itemType || 'standard'}
                      onChange={(e) => updateFileConfig(i, 'itemType', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none"
                    >
                      <option value="standard">📷 Standard / Collectibles</option>
                      <option value="bottle">🍾 Bottles, Cans & Glassware</option>
                      <option value="graded">🏆 Universal Graded Item</option>
                      <option value="coin">🪙 Graded Coin</option>
                      <option value="card">🃏 Trading Card</option>
                      <option value="comic">🦸‍♂️ Comic Book</option>
                      <option value="toy">🧸 Vintage Toy</option>
                      <option value="game">🎮 Video Game</option>
                      <option value="video">🎬 Movies and TV Shows</option>
                      <option value="music">🎵 Music</option>
                      <option value="hardware">🖥️ Retro Tech</option>
                      <option value="tool">🔧 Tools & Workshop</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Category</label>
                    {!fileConfigs[i]?.isCreatingNew ? (
                      <div>
                        <select 
                          value={fileConfigs[i]?.categoryId || ''}
                          onChange={(e) => updateFileConfig(i, 'categoryId', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none"
                        >
                          <option value="">-- Uncategorized / Auto-Folder Tree --</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.displayName}</option>
                          ))}
                        </select>
                        <button 
                          onClick={() => updateFileConfig(i, 'isCreatingNew', true)}
                          className="mt-3 text-blue-400 text-sm hover:text-blue-300 flex items-center gap-1 font-medium"
                        >
                          <Plus className="w-4 h-4" /> Create New Category
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input 
                          type="text"
                          value={fileConfigs[i]?.newCategoryName || ''}
                          onChange={(e) => updateFileConfig(i, 'newCategoryName', e.target.value)}
                          placeholder="e.g. Action Figures, Rare Coins..."
                          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                          autoFocus
                        />
                        <button 
                          onClick={() => updateFileConfig(i, 'isCreatingNew', false)}
                          className="mt-3 text-gray-400 text-sm hover:text-gray-300 font-medium"
                        >
                          Cancel / Choose Existing
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
              <div className="text-sm font-medium text-blue-400">
                {uploadProgress}
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button 
                  onClick={cancelUpload}
                  disabled={isUploading}
                  className="px-4 py-2 w-full sm:w-auto rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button 
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="px-6 py-2 w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isUploading ? 'Processing...' : 'Confirm Uploads'}
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}
