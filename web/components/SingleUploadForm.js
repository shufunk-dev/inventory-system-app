'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2, X, Plus } from 'lucide-react';
import { buildCategoryTree } from '@/lib/categories';

export default function SingleUploadForm() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [itemType, setItemType] = useState('standard');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [categories, setCategories] = useState([]);
  
  const router = useRouter();

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => setCategories(buildCategoryTree(data)))
      .catch(console.error);
  }, [selectedFiles]); // Fetch categories when modal opens

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setSelectedFiles(files);
    setCategoryId('');
    setItemType('standard');
    setIsCreatingNew(false);
    setNewCategoryName('');
    e.target.value = null; // reset
  };

  const cancelUpload = () => {
    setSelectedFiles([]);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    let finalCategoryId = categoryId;

    try {
      // 1. Create Category if needed
      if (isCreatingNew && newCategoryName.trim() !== '') {
        const catRes = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newCategoryName.trim(), parentId: null })
        });
        
        if (!catRes.ok) throw new Error('Failed to create category');
        
        const newCat = await catRes.json();
        finalCategoryId = newCat.id;
      }

      // 2. Upload the Photos
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        if (finalCategoryId) {
          formData.append('categoryId', finalCategoryId);
        }
        formData.append('itemType', itemType);

        const uploadRes = await fetch('/api/upload/single', {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) {
          const data = await uploadRes.json();
          console.error('Upload failed for', file.name, data.error);
        }
      }

      // Success
      setSelectedFiles([]);
      router.refresh();
      
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="relative inline-block">
        <input
          type="file"
          id="single-image-upload"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isUploading}
          multiple
          className="hidden"
        />
        <label
          htmlFor="single-image-upload"
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-lg cursor-pointer transition-all ${
            isUploading 
              ? 'bg-emerald-400 cursor-not-allowed' 
              : 'bg-emerald-600 hover:bg-emerald-500 hover:-translate-y-0.5'
          }`}
        >
          {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
          {isUploading ? 'Uploading...' : 'Quick Photo'}
        </label>
      </div>

      {/* Configuration Modal */}
      {selectedFiles.length > 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-3xl p-8 max-w-lg w-full border border-gray-800 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-bold text-white mb-2">Configure Upload</h2>
            <p className="text-gray-400 mb-6 flex items-center gap-2">
              <Camera className="w-4 h-4" /> {selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} files selected`}
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Category</label>
              
              {!isCreatingNew ? (
                <div className="flex gap-2">
                  <select 
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 appearance-none"
                  >
                    <option value="">-- Uncategorized --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.displayName}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => setIsCreatingNew(true)}
                    className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 rounded-xl transition-colors"
                    title="Create New Category"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="New category name..."
                    className="flex-1 bg-gray-800 border border-emerald-500/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                  <button 
                    onClick={() => {
                      setIsCreatingNew(false);
                      setNewCategoryName('');
                    }}
                    className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white px-4 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Item Type</label>
              <select 
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 appearance-none"
              >
                <option value="standard">📷 Standard Photo</option>
                <option value="graded">🏆 Universal Graded Item</option>
                <option value="coin">🪙 Graded Coin</option>
                <option value="card">🃏 Trading Card</option>
                <option value="comic">🦸‍♂️ Comic Book</option>
                <option value="toy">🧸 Vintage Toy</option>
                <option value="game">🎮 Video Game</option>
                <option value="video">🎬 Movies and TV Shows</option>
              </select>
              {(itemType === 'coin' || itemType === 'card' || itemType === 'comic' || itemType === 'graded' || itemType === 'game' || itemType === 'video') && (
                <p className="text-sm text-emerald-400 mt-3 bg-emerald-900/30 p-3 rounded-lg border border-emerald-800/50">
                  <span className="font-bold">Tip:</span> Since you are manually uploading a single photo, make sure it is the <span className="font-bold">front side</span> that contains the grading label and barcode data.
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-8">
              <button 
                onClick={cancelUpload}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {isUploading ? 'Uploading...' : 'Confirm Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
