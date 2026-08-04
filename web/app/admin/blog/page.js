import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { FileText, Rss, Printer } from 'lucide-react';
import PublishButton from './PublishButton';

export default async function AdminBlogPage() {
  const user = await getUser();
  
  if (!user || user.isRoot !== 1) {
    redirect('/login');
  }

  // Load local markdown files
  const blogDir = path.resolve(process.cwd(), 'blog');
  let posts = [];
  
  try {
    if (fs.existsSync(blogDir)) {
      const files = fs.readdirSync(blogDir).filter(f => (f.endsWith('.md') || f.endsWith('.published.md')) && f !== 'COMPLETE_PRINTABLE_BLOG.md');
      
      posts = files.map(file => {
        const filePath = path.join(blogDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const stats = fs.statSync(filePath);
        const html = marked.parse(content);
        const isPublished = file.endsWith('.published.md');
        
        let title = file.replace('.md', '').replace('.published', '').replace(/-/g, ' ');
        const lines = content.split('\n');
        if (lines[0].startsWith('# ')) {
          title = lines[0].replace('# ', '').trim();
        }

        const timestamp = stats.mtime.toLocaleDateString(undefined, { 
          year: 'numeric', month: 'short', day: 'numeric', 
          hour: '2-digit', minute: '2-digit' 
        });

        return { filename: file, title, html, isPublished, timestamp };
      });

      // Sort by filename descending (latest entry on top, e.g., '02-' before '01-')
      posts.sort((a, b) => b.filename.localeCompare(a.filename));
    }
  } catch (error) {
    console.error('Error reading blog directory:', error);
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Rss className="w-8 h-8 text-emerald-400" />
            Developer Journal
          </h1>
          <p className="text-gray-400">
            Internal logs of the development journey.
            {user.isRoot === 1 && (
              <span className="ml-2 text-emerald-400 text-sm font-semibold px-2 py-1 bg-emerald-400/10 rounded-lg">
                Root Access
              </span>
            )}
          </p>
        </div>

        <a 
          href="/admin/blog/print"
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg transition-all"
        >
          <Printer className="w-5 h-5" />
          <span>Printable View (All Notes)</span>
        </a>
      </div>

      {posts.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-300">No journal entries yet.</h2>
          <p className="text-gray-500 mt-2">Markdown files placed in the /blog directory will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post, i) => (
            <details key={i} className="group bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden shadow-xl [&_summary::-webkit-details-marker]:hidden">
              <summary className="bg-gray-900/50 px-6 py-4 border-b border-gray-700/50 flex items-center justify-between cursor-pointer hover:bg-gray-800/80 transition-colors list-none">
                <div className="flex flex-col">
                  <h2 className="text-xl font-bold text-white group-open:text-emerald-400 transition-colors">{post.title}</h2>
                  <span className="text-sm text-gray-500 mt-1">{post.timestamp}</span>
                </div>
                <div className="flex items-center gap-4">
                  {post.isPublished ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      LIVE ON WORDPRESS
                    </span>
                  ) : (
                    <PublishButton filename={post.filename} />
                  )}
                  <div className="text-gray-500 group-open:rotate-180 transition-transform duration-200">
                    ▼
                  </div>
                </div>
              </summary>
              <div 
                className="p-6 prose prose-invert prose-emerald max-w-none bg-gray-800/50"
                dangerouslySetInnerHTML={{ __html: post.html }}
              />
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
