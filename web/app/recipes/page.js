'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, Plus, Trash2, Save, Search, RefreshCw, FileText, Wine } from 'lucide-react';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [unmappedItems, setUnmappedItems] = useState([]);
  const [brands, setBrands] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandCategory, setNewBrandCategory] = useState('Spirits');
  const [newBrandGravity, setNewBrandGravity] = useState('0.94');
  const [showAddBrand, setShowAddBrand] = useState(false);

  // Editing state for mapping a POS item
  const [selectedPosItem, setSelectedPosItem] = useState(null);
  const [mappedIngredients, setMappedIngredients] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch('/api/recipes');
      const data = await res.json();
      if (res.ok) {
        setRecipes(data.recipes || []);
        setUnmappedItems(data.unmappedPosItems || []);
        setBrands(data.brands || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddBrand(e) {
    e.preventDefault();
    if (!newBrandName.trim()) return;

    try {
      // In Next.js, we can also add a quick POST to category/items or we can directly add it to liquor_brands
      // Let's create an endpoint or run a raw POST. Wait, let's make a quick API route or write it inside a helper.
      // Wait, we can add a route to handle adding liquor brands!
      // Let's call /api/recipes with a action or create a simple post brand api.
      // Wait, let's support adding it directly via /api/recipes by sending an action "add_brand"!
      // Yes, we can handle it in our Recipes POST endpoint if we send `action: 'add_brand'`.
      // Let's implement this on the backend or we can just send it. Let's make sure the backend endpoint /api/recipes handles brand creation!
      // Wait, let's verify if we need to add a brand endpoint.
      // Yes, let's support it in POST /api/recipes with `{ action: 'add_brand', name: ..., category: ..., specificGravity: ... }`.
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_brand',
          brandName: newBrandName.trim(),
          brandCategory: newBrandCategory,
          specificGravity: parseFloat(newBrandGravity) || 1.0
        })
      });
      const data = await res.json();
      if (res.ok) {
        setNewBrandName('');
        setShowAddBrand(false);
        fetchData();
      } else {
        alert(data.error || 'Failed to add brand');
      }
    } catch (err) {
      console.error(err);
    }
  }

  function startMapping(item) {
    setSelectedPosItem(item);
    setMappedIngredients([{ brandId: '', pourSizeOz: 1.5 }]);
  }

  function addIngredientField() {
    setMappedIngredients([...mappedIngredients, { brandId: '', pourSizeOz: 1.5 }]);
  }

  function removeIngredientField(index) {
    const list = [...mappedIngredients];
    list.splice(index, 1);
    setMappedIngredients(list);
  }

  function handleIngredientChange(index, field, value) {
    const list = [...mappedIngredients];
    list[index][field] = value;
    setMappedIngredients(list);
  }

  async function handleSaveRecipe(e) {
    e.preventDefault();
    if (!selectedPosItem) return;

    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          posItemNum: selectedPosItem.itemNum,
          ingredients: mappedIngredients.map(i => ({
            brandId: i.brandId,
            pourSizeOz: parseFloat(i.pourSizeOz)
          }))
        })
      });
      if (res.ok) {
        setSelectedPosItem(null);
        setMappedIngredients([]);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save recipe');
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteRecipe(recipeId) {
    if (!confirm('Are you sure you want to delete this recipe mapping?')) return;
    try {
      const res = await fetch(`/api/recipes?recipeId=${recipeId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  }

  const filteredUnmapped = unmappedItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <div>
            <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-400 mb-2 flex items-center gap-3">
              <ClipboardList className="w-9 h-9 text-purple-400 animate-pulse" />
              POS Recipe Mapping
            </h1>
            <p className="text-gray-400">Map your POS items (cocktails, beers, wine glasses) to raw inventory ingredients.</p>
          </div>
          <button
            onClick={() => setShowAddBrand(!showAddBrand)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold text-white transition-all shadow-lg hover:shadow-purple-500/20 hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            Add Custom Liquor Brand
          </button>
        </div>

        {/* Add custom brand modal/panel */}
        {showAddBrand && (
          <div className="mb-8 p-6 rounded-2xl bg-gray-900/40 border border-gray-800 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-xl font-bold text-white mb-4">Add Custom Liquor Brand</h2>
            <form onSubmit={handleAddBrand} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Brand Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jameson Irish Whiskey"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-purple-500 transition-colors text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Category</label>
                <select
                  value={newBrandCategory}
                  onChange={(e) => setNewBrandCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-purple-500 transition-colors text-white"
                >
                  <option value="Spirits">Spirits</option>
                  <option value="Liqueurs">Liqueurs</option>
                  <option value="Wine">Wine</option>
                  <option value="Beer">Beer</option>
                  <option value="Mixers">Mixers</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Specific Gravity</label>
                <input
                  type="number"
                  step="0.01"
                  value={newBrandGravity}
                  onChange={(e) => setNewBrandGravity(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:border-purple-500 transition-colors text-white"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-white transition-all shadow-md"
              >
                Create Brand
              </button>
            </form>
          </div>
        )}

        {/* Main Work Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Mapped Recipes Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/20 p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Wine className="w-6 h-6 text-emerald-400" />
                Active Recipes ({recipes.length})
              </h2>

              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <RefreshCw className="w-8 h-8 text-gray-600 animate-spin" />
                </div>
              ) : recipes.length === 0 ? (
                <div className="text-center py-20 text-gray-500 border border-dashed border-gray-850 rounded-2xl">
                  No recipes mapped yet. Select a POS item on the right to start mapping.
                </div>
              ) : (
                <div className="space-y-4">
                  {recipes.map(recipe => (
                    <div
                      key={recipe.recipeId}
                      className="p-5 rounded-2xl bg-gray-950/60 border border-gray-850 hover:border-gray-850 flex justify-between items-center transition-all hover:bg-gray-950/90 group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs bg-purple-500/10 text-purple-400 font-mono px-2 py-0.5 rounded-full border border-purple-500/20">
                            #{recipe.posItemNum}
                          </span>
                          <h3 className="text-lg font-semibold text-white">{recipe.posItemName}</h3>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {recipe.ingredients.map(ing => (
                            <span
                              key={ing.ingredientId}
                              className="text-xs bg-gray-900 border border-gray-800 text-gray-300 px-3 py-1 rounded-full flex items-center gap-1.5"
                            >
                              <span className="font-semibold text-purple-400">{ing.pourSizeOz} oz</span>
                              <span>{ing.brandName}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteRecipe(recipe.recipeId)}
                        className="p-2.5 rounded-xl bg-red-650/10 text-red-400 border border-red-500/10 hover:bg-red-600 hover:text-white transition-all scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* POS Items & Editor Column */}
          <div className="space-y-6">
            
            {/* Editor Panel if active */}
            {selectedPosItem ? (
              <div className="rounded-2xl border border-purple-500/30 bg-purple-950/5 p-6 backdrop-blur-xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-400" />
                    Map: {selectedPosItem.name}
                  </h3>
                  <button
                    onClick={() => setSelectedPosItem(null)}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleSaveRecipe} className="space-y-4">
                  <div className="space-y-3">
                    {mappedIngredients.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          value={item.brandId}
                          onChange={(e) => handleIngredientChange(idx, 'brandId', e.target.value)}
                          className="flex-1 px-3 py-2.5 rounded-xl bg-gray-850 border border-gray-700 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white"
                          required
                        >
                          <option value="">-- Choose Brand --</option>
                          {brands.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.name} ({b.category})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.05"
                          placeholder="oz"
                          value={item.pourSizeOz}
                          onChange={(e) => handleIngredientChange(idx, 'pourSizeOz', e.target.value)}
                          className="w-20 px-3 py-2.5 rounded-xl bg-gray-850 border border-gray-700 text-sm focus:outline-none focus:border-purple-500 text-center transition-colors text-white"
                          required
                        />
                        {mappedIngredients.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeIngredientField(idx)}
                            className="p-2 text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addIngredientField}
                    className="w-full py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs font-semibold text-purple-400 hover:text-purple-300 hover:bg-gray-850 transition-colors mb-4"
                  >
                    + Add Ingredient Component
                  </button>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-white transition-all shadow-md"
                  >
                    Save Mapping Recipe
                  </button>
                </form>
              </div>
            ) : null}

            {/* POS List Panel */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Unmapped POS items</h2>
              
              <div className="relative mb-4">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search sales report..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-950 border border-gray-850 focus:outline-none focus:border-purple-500 transition-colors text-sm text-white"
                />
              </div>

              {loading ? (
                <div className="flex justify-center py-10">
                  <RefreshCw className="w-6 h-6 text-gray-600 animate-spin" />
                </div>
              ) : filteredUnmapped.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">
                  {searchTerm ? 'No results match your search.' : 'All POS items are mapped! 🎉'}
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {filteredUnmapped.map(item => (
                    <div
                      key={item.itemNum}
                      className="p-3.5 rounded-xl bg-gray-950 border border-gray-850 flex justify-between items-center hover:border-gray-700 transition-colors"
                    >
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-white line-clamp-1">{item.name}</h4>
                        <div className="flex gap-3 text-xs text-gray-500">
                          <span>Sold: <span className="text-gray-300 font-medium">{item.numSold}</span></span>
                          <span>Price: <span className="text-gray-300 font-medium">${item.price}</span></span>
                        </div>
                      </div>
                      <button
                        onClick={() => startMapping(item)}
                        className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white transition-all text-xs font-semibold"
                      >
                        Map
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
