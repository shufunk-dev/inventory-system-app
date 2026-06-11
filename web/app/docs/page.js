import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { marked } from 'marked';
import { BookOpen, FileText, ChevronRight, ArrowLeft, RefreshCw, Shield, HelpCircle } from 'lucide-react';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DocsPage({ searchParams }) {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const params = await searchParams;
  const activePage = params.page || '01_introduction_and_modes';

  // Directory path for docs
  const docsDir = path.join(process.cwd(), 'docs', 'manual', 'inventory-pos');
  
  let files = [];
  try {
    files = fs.readdirSync(docsDir)
      .filter(f => f.endsWith('.md'))
      .sort();
  } catch (err) {
    console.error('Error reading documentation directory:', err);
  }

  // Map files to human-readable names
  const docPages = files.map(file => {
    const id = file.replace('.md', '');
    // e.g. "01_introduction_and_modes" -> "Introduction and Modes"
    const title = id
      .substring(3) // Remove the numeric prefix like "01_"
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return { id, file, title };
  });

  // Find the current page
  const currentPage = docPages.find(p => p.id === activePage) || docPages[0];
  
  let contentHtml = '<p class="text-gray-400">Select a section to read.</p>';
  let rawMarkdown = '';
  
  if (currentPage) {
    try {
      const filePath = path.join(docsDir, currentPage.file);
      rawMarkdown = fs.readFileSync(filePath, 'utf8');
      
      // Parse markdown to HTML
      contentHtml = marked.parse(rawMarkdown);
    } catch (err) {
      console.error(`Error reading doc file ${currentPage?.file}:`, err);
      contentHtml = `<p class="text-red-400">Failed to load section content: ${err.message}</p>`;
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Navigation Breadcrumb / Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-800 pb-6 mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/20 p-2.5 rounded-xl border border-blue-500/30">
              <BookOpen className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Inventory & POS System Manual
              </h1>
              <p className="text-sm text-gray-400">Shufelt Designs LLC Product Suite</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors bg-gray-900 border border-gray-800 px-4 py-2 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Catalog</span>
            </Link>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Sidebar Navigation */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-gray-900/50 border border-gray-800/80 rounded-2xl p-5 backdrop-blur-sm">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">
                Table of Contents
              </h2>
              <nav className="space-y-1">
                {docPages.map((page) => {
                  const isActive = page.id === activePage;
                  return (
                    <Link
                      key={page.id}
                      href={`/docs?page=${page.id}`}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                        isActive 
                          ? 'bg-blue-600/20 border border-blue-500/40 text-blue-400' 
                          : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border border-transparent'
                      }`}
                    >
                      <span className="truncate">{page.title}</span>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                        isActive ? 'text-blue-400 translate-x-0.5' : 'text-gray-600 group-hover:text-gray-400 group-hover:translate-x-0.5'
                      }`} />
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Offline/Online Info Box */}
            <div className="bg-gradient-to-br from-gray-900/70 to-blue-950/20 border border-gray-800 rounded-2xl p-5">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-white">Local-First Manual</h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    This documentation is stored locally in your installation and is fully accessible offline.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Main Content Panel */}
          <main className="lg:col-span-3 bg-gray-900/30 border border-gray-800/80 rounded-2xl p-6 sm:p-10 backdrop-blur-sm">
            <article className="prose prose-invert max-w-none prose-headings:text-white prose-headings:font-bold prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-800 prose-hr:border-gray-800 prose-table:border-collapse prose-table:w-full prose-th:bg-gray-900 prose-th:p-3 prose-td:p-3 prose-tr:border-b prose-tr:border-gray-800">
              <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
            </article>
          </main>

        </div>

      </div>
    </div>
  );
}
