'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2 } from 'lucide-react';

export default function UploadImageForm({ itemId }) {
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/item/${itemId}/image`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        router.refresh(); // Refresh Server Components to show new image
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert('Upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = null; // Reset input
    }
  };

  return (
    <div className="relative inline-block mt-4">
      <input
        type="file"
        id="image-upload"
        accept="image/*"
        onChange={handleFileChange}
        disabled={isUploading}
        className="hidden"
      />
      <label
        htmlFor="image-upload"
        className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white shadow-lg cursor-pointer transition-all ${
          isUploading 
            ? 'bg-blue-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-500 hover:-translate-y-0.5'
        }`}
      >
        {isUploading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Upload className="w-5 h-5" />
        )}
        {isUploading ? 'Uploading...' : 'Upload Manual Photo'}
      </label>
    </div>
  );
}
