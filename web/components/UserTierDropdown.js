'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UserTierDropdown({ user }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleTierChange = async (e) => {
    const newTier = e.target.value;
    setIsUpdating(true);
    
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: newTier })
      });
      
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(`Failed to update user: ${data.error}`);
        // Reset the dropdown visually by refreshing
        router.refresh();
      }
    } catch (error) {
      alert('Network error while updating user tier.');
      router.refresh();
    } finally {
      setIsUpdating(false);
    }
  };

  if (user.isAdmin) {
    return (
      <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs px-3 py-1.5 rounded-full uppercase tracking-wider font-bold">
        Admin (Locked)
      </span>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <select
        value={user.tier || 'basic'}
        onChange={handleTierChange}
        disabled={isUpdating}
        className={`appearance-none bg-gray-800 border border-gray-700 hover:border-gray-500 text-sm rounded-xl px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 ${
          user.tier === 'premium' ? 'text-purple-400 font-bold' : 'text-gray-300'
        }`}
      >
        <option value="basic">Basic</option>
        <option value="premium">Premium</option>
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
        {isUpdating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
        )}
      </div>
    </div>
  );
}
