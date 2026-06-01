'use client';

import { useState } from 'react';
import { BookOpen, Plus, Trash2, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminChangelogsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [version, setVersion] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
  const [title, setTitle] = useState('');
  const [changes, setChanges] = useState([{ type: 'web', text: '' }]);

  const handleAddChange = () => {
    setChanges([...changes, { type: 'web', text: '' }]);
  };

  const handleRemoveChange = (index) => {
    const newChanges = [...changes];
    newChanges.splice(index, 1);
    setChanges(newChanges);
  };

  const handleChangeUpdate = (index, field, value) => {
    const newChanges = [...changes];
    newChanges[index][field] = value;
    setChanges(newChanges);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Filter out empty changes
    const validChanges = changes.filter(c => c.text.trim() !== '');

    try {
      const res = await fetch('/api/admin/changelogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, date, title, changes: validChanges })
      });

      if (!res.ok) throw new Error('Failed to publish changelog');
      
      // Reset form
      setVersion('');
      setTitle('');
      setChanges([{ type: 'web', text: '' }]);
      
      alert('Changelog published successfully!');
      router.push('/changelog');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-emerald-500/20 p-4 rounded-2xl text-emerald-400">
          <BookOpen className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Publish Changelog</h1>
          <p className="text-gray-400">Push an update to the public timeline.</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-xl overflow-hidden p-8 max-w-3xl">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Version Name</label>
              <input
                type="text"
                required
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. Beta 1.1"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Display Date</label>
              <input
                type="text"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="e.g. May 30, 2026"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Update Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Performance Boosts & Fixes"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-400">Changelog Items</label>
              <button
                type="button"
                onClick={handleAddChange}
                className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>

            <div className="space-y-3">
              {changes.map((change, index) => (
                <div key={index} className="flex items-center gap-3">
                  <select
                    value={change.type}
                    onChange={(e) => handleChangeUpdate(index, 'type', e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-28 shrink-0"
                  >
                    <option value="web">Web</option>
                    <option value="mobile">Mobile</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={change.text}
                    onChange={(e) => handleChangeUpdate(index, 'text', e.target.value)}
                    placeholder="Describe the change..."
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveChange(index)}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
              {loading ? 'Publishing...' : 'Publish Update'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
