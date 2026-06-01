'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

export default function DeleteItemButton({ itemId }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    setIsDeleting(true);
    try {
      const res = await fetch('/api/item/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [itemId] })
      });

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to delete item');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button 
      onClick={handleDelete}
      disabled={isDeleting}
      className="flex items-center justify-center gap-2 w-full mt-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/30 px-6 py-3 rounded-2xl font-semibold transition-all disabled:opacity-50"
    >
      <Trash2 className="w-5 h-5" />
      {isDeleting ? 'Deleting...' : 'Delete Item'}
    </button>
  );
}
