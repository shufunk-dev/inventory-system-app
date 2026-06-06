import Link from 'next/link';
import { getDb, getGlobalDb } from '@/lib/db';
import UploadForm from '@/components/UploadForm';
import SingleUploadForm from '@/components/SingleUploadForm';
import CatalogGrid from '@/components/CatalogGrid';
import CatalogFilters from '@/components/CatalogFilters';
import { Package, Download } from 'lucide-react';

import { buildCategoryTree, getCategoryAndChildrenIds } from '@/lib/categories';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }) {
  // In Local-First Mode, redirect to the setup wizard if no admin exists
  let shouldRedirect = false;
  if (process.env.SAAS_MODE !== 'true') {
    try {
      const db = await getGlobalDb();
      const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE isRoot = 1').get().count;
      if (adminCount === 0) {
        shouldRedirect = true;
      }
    } catch (e) {
      console.error('[home_page] Failed to check admin count:', e);
    }
    if (shouldRedirect) {
      redirect('/setup');
    }
  }

  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  // searchParams might be a promise in newer Next.js versions, so await it
  const params = await searchParams;
  
  const page = parseInt(params.page || '1');
  const limit = 15; // increased limit for a better view with search
  const offset = (page - 1) * limit;

  const query = params.q || '';
  const advanced = params.advanced === 'true';
  const categoryId = params.category || '';

  const db = await getDb();

  // Fetch categories for the filter UI
  const rawCategories = db.prepare('SELECT * FROM categories WHERE userId = ? ORDER BY name ASC').all(user.id);
  const initialCategories = buildCategoryTree(rawCategories);

  // Calculate total valuation
  let totalValuation = 0;
  try {
    const valRow = db.prepare('SELECT COALESCE(SUM(valueAvg), 0) as total FROM items').get();
    totalValuation = valRow.total;
  } catch (e) {
    console.error('Failed to query total valuation for catalog widget:', e);
  }

  // Build the dynamic SQL query
  let sqlConditions = ['userId = ?'];
  let sqlParams = [user.id];

  if (query) {
    if (advanced) {
      sqlConditions.push('(name LIKE ? OR description LIKE ? OR barcode LIKE ?)');
      sqlParams.push(`%${query}%`, `%${query}%`, `%${query}%`);
    } else {
      sqlConditions.push('name LIKE ?');
      sqlParams.push(`%${query}%`);
    }
  }

  if (categoryId) {
    if (categoryId === 'uncategorized') {
      sqlConditions.push("(categoryId IS NULL OR categoryId = '')");
    } else {
      const allIds = getCategoryAndChildrenIds(rawCategories, categoryId);
      const placeholders = allIds.map(() => '?').join(',');
      sqlConditions.push(`categoryId IN (${placeholders})`);
      sqlParams.push(...allIds);
    }
  }

  const whereClause = sqlConditions.length > 0 ? 'WHERE ' + sqlConditions.join(' AND ') : '';

  // Count totals
  const countRow = db.prepare(`SELECT COUNT(*) as count FROM items ${whereClause}`).get(...sqlParams);
  const totalItems = countRow.count;
  const totalPages = Math.ceil(totalItems / limit) || 1;

  // Fetch paginated items
  const items = db.prepare(`SELECT * FROM items ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`).all(...sqlParams, limit, offset);

  // Preserve search params for pagination links
  const urlParams = new URLSearchParams();
  if (query) urlParams.set('q', query);
  if (advanced) urlParams.set('advanced', 'true');
  if (categoryId) urlParams.set('category', categoryId);
  const baseQueryString = urlParams.toString();
  const buildPageUrl = (p) => `/?page=${p}${baseQueryString ? '&' + baseQueryString : ''}`;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <div>
            <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
              Inventory Catalog
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-gray-400 text-base">
              <p>Manage your scanned items seamlessly.</p>
              <span className="hidden sm:inline text-gray-700">|</span>
              <Link href="/valuation" className="inline-flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20 hover:border-emerald-500/35 transition-all shadow-[0_0_10px_rgba(16,185,129,0.05)] hover:-translate-y-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Est. Value: ${totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} →
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href="/api/export/csv" 
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:-translate-y-0.5"
            >
              <Download className="w-5 h-5" />
              Export CSV
            </a>
            <SingleUploadForm />
            <UploadForm />
          </div>
        </div>

        <CatalogFilters initialCategories={initialCategories} />

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-gray-800 rounded-3xl bg-gray-900/20">
            <Package className="w-16 h-16 text-gray-600 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-400 mb-2">No items found</h2>
            <p className="text-gray-500">
              {(query || categoryId) ? 'Try adjusting your search or category filters.' : 'Upload a ZIP file to populate your catalog.'}
            </p>
          </div>
        ) : (
          <CatalogGrid items={items} />
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-16">
            <Link 
              href={buildPageUrl(Math.max(1, page - 1))}
              className={`px-6 py-2 rounded-full font-medium transition-colors ${page <= 1 ? 'bg-gray-800 text-gray-500 pointer-events-none' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}
            >
              Previous
            </Link>
            <span className="text-gray-400 font-medium">
              Page <span className="text-white">{page}</span> of {totalPages}
            </span>
            <Link 
              href={buildPageUrl(Math.min(totalPages, page + 1))}
              className={`px-6 py-2 rounded-full font-medium transition-colors ${page >= totalPages ? 'bg-gray-800 text-gray-500 pointer-events-none' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}
            >
              Next
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}