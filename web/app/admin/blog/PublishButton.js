'use client';

import { useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PublishButton({ filename }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePublish = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // prevent opening the details element
    
    if (!confirm('Are you sure you want to publish this to WordPress?')) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blog/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(`Successfully published to WordPress!\n\nLink: ${data.link}`);
        router.refresh();
      } else {
        alert(`Failed to publish: ${data.error}`);
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handlePublish}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
    >
      <UploadCloud className="w-4 h-4" />
      {loading ? 'Uploading...' : 'Publish to WordPress'}
    </button>
  );
}
