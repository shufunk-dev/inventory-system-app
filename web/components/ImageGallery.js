'use client';

import { useState } from 'react';
import { Package, X } from 'lucide-react';

export default function ImageGallery({ item }) {
  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <>
      <div className="flex gap-4">
        <div 
          onClick={() => item.imagePath && setSelectedImage(item.imagePath)}
          className={`aspect-square rounded-3xl overflow-hidden bg-gray-800 border-2 border-gray-700 relative ${item.imagePath ? 'cursor-pointer hover:border-gray-500 transition-colors' : ''} ${item.imagePathBack ? 'flex-1' : 'w-full'}`}
        >
          {item.imagePath ? (
            <img src={item.imagePath} alt="Front" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 p-6 text-center">
              <Package className="w-12 h-12 mb-4 opacity-50" />
              <span className="text-sm font-medium">No Image</span>
            </div>
          )}
          {item.imagePathBack && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-xs font-bold tracking-wider">
              FRONT
            </div>
          )}
        </div>
        
        {item.imagePathBack && (
          <div 
            onClick={() => setSelectedImage(item.imagePathBack)}
            className="aspect-square flex-1 rounded-3xl overflow-hidden bg-gray-800 border-2 border-gray-700 relative cursor-pointer hover:border-gray-500 transition-colors"
          >
            <img src={item.imagePathBack} alt="Back" className="w-full h-full object-cover" />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-xs font-bold tracking-wider">
              BACK
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-gray-400 hover:text-white bg-gray-900/50 p-2 rounded-full"
            onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
          >
            <X className="w-8 h-8" />
          </button>
          <img 
            src={selectedImage} 
            alt="Expanded view" 
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}
