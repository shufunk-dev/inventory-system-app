'use client';

import { Edit2 } from 'lucide-react';

export default function QuickEditButton() {
  return (
    <button 
      onClick={() => {
        const btn = document.getElementById('main-edit-button');
        if (btn) {
          btn.click();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }}
      className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-full transition-colors text-sm font-medium border border-gray-700"
    >
      <Edit2 className="w-4 h-4" />
      Quick Edit
    </button>
  );
}
