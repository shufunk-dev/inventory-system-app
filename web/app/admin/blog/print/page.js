import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { Printer, ArrowLeft, BookOpen, FileText } from 'lucide-react';
import PrintControls from './PrintControls';

export default async function AdminBlogPrintPage() {
  const user = await getUser();
  
  if (!user || user.isRoot !== 1) {
    redirect('/login');
  }

  const blogDir = path.resolve(process.cwd(), 'blog');
  let posts = [];
  
  try {
    if (fs.existsSync(blogDir)) {
      const rawFiles = fs.readdirSync(blogDir).filter(f => 
        (f.endsWith('.md') || f.endsWith('.published.md')) && f !== 'COMPLETE_PRINTABLE_BLOG.md'
      );

      // Sort entries logically: lead numerical prefix ascending (01, 02.. 23..), non-numeric by mtime
      const sortedFiles = rawFiles.map(file => {
        const filePath = path.join(blogDir, file);
        const stat = fs.statSync(filePath);
        const numMatch = file.match(/^(\d+)/);
        let num = numMatch ? parseInt(numMatch[1], 10) : 4.5;
        return { file, filePath, stat, num };
      }).sort((a, b) => {
        if (a.num !== b.num) return a.num - b.num;
        return a.stat.mtimeMs - b.stat.mtimeMs;
      });

      posts = sortedFiles.map(({ file, filePath, stat }, index) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        const html = marked.parse(content);
        
        let title = file.replace('.md', '').replace('.published', '').replace(/-/g, ' ');
        const lines = content.split('\n');
        if (lines[0] && lines[0].startsWith('# ')) {
          title = lines[0].replace('# ', '').trim();
        }

        const timestamp = stat.mtime.toLocaleDateString(undefined, { 
          year: 'numeric', month: 'short', day: 'numeric'
        });

        return { 
          entryNum: String(index + 1).padStart(2, '0'),
          filename: file, 
          rawContent: content,
          title, 
          html, 
          timestamp 
        };
      });

      // Auto-update COMPLETE_PRINTABLE_BLOG.md so markdown physical notes file stays in sync
      try {
        let toc = '# Inventory System - Complete Developer Journal & Engineering Notes\n\n';
        toc += '> **Physical Copy Edition** | Total Journal Entries: ' + posts.length + '\n\n';
        toc += '## Table of Contents\n\n';
        let fullDocContent = '';

        posts.forEach((p) => {
          toc += `${parseInt(p.entryNum, 10)}. [${p.title}](#entry-${p.entryNum})\n`;
          fullDocContent += `\n\n---\n\n<a id="entry-${p.entryNum}"></a>\n`;
          fullDocContent += `> **Entry #${p.entryNum}** | Original File: \`${p.filename}\`\n\n`;
          fullDocContent += p.rawContent;
        });

        fs.writeFileSync(path.join(blogDir, 'COMPLETE_PRINTABLE_BLOG.md'), toc + '\n' + fullDocContent, 'utf-8');
      } catch (docErr) {
        console.error('Failed to auto-update COMPLETE_PRINTABLE_BLOG.md:', docErr);
      }
    }
  } catch (error) {
    console.error('Error reading blog directory for print view:', error);
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 print:bg-white print:text-black print:p-0">
      {/* Print stylesheet overrides */}
      <style>{`
        @media print {
          @page {
            size: letter;
            margin: 0.75in;
          }
          body {
            background-color: white !important;
            color: black !important;
            font-size: 11pt;
            line-height: 1.5;
          }
          .no-print {
            display: none !important;
          }
          .print-break-before {
            page-break-before: always;
            break-before: page;
          }
          .print-avoid-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .prose {
            color: black !important;
            max-width: 100% !important;
          }
          .prose h1, .prose h2, .prose h3, .prose h4, .prose strong, .prose th {
            color: black !important;
          }
          .prose a {
            color: black !important;
            text-decoration: underline;
          }
          .prose code {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            border: 1px solid #cbd5e1 !important;
            padding: 0.15rem 0.3rem !important;
            border-radius: 0.25rem !important;
          }
          .prose pre {
            background-color: #f8fafc !important;
            color: #0f172a !important;
            border: 1px solid #cbd5e1 !important;
            white-space: pre-wrap !important;
            word-break: break-word !important;
          }
          .prose blockquote {
            border-left-color: #94a3b8 !important;
            color: #334155 !important;
          }
        }
      `}</style>

      {/* Sticky Action Toolbar (Screen Only) */}
      <div className="no-print sticky top-0 z-50 bg-slate-800/95 backdrop-blur border-b border-slate-700 shadow-xl px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a 
              href="/admin/blog"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Journal
            </a>
            <div className="h-5 w-px bg-slate-700" />
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              <span>Printable Notes Collection</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-normal">
                {posts.length} Entries
              </span>
            </div>
          </div>

          <PrintControls />
        </div>
      </div>

      {/* Main Printable Document Container */}
      <main className="max-w-4xl mx-auto p-6 md:p-12 print:p-0 print:max-w-none">
        {/* Cover / Header Section */}
        <header className="mb-12 pb-8 border-b border-slate-700 print:border-black print:mb-8 print:pb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white print:text-black">
              Inventory System — Engineering Journal & Notes
            </h1>
          </div>
          <p className="text-slate-400 print:text-slate-700 text-sm md:text-base">
            Complete physical copy compilation of all {posts.length} development posts written to date.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400 print:text-slate-600">
            <span>Generated: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>•</span>
            <span>Total Posts: {posts.length}</span>
            <span>•</span>
            <span>Local-First Architecture Logs</span>
          </div>
        </header>

        {/* Table of Contents */}
        <section className="mb-12 p-6 bg-slate-800/60 border border-slate-700 rounded-2xl print:bg-slate-50 print:border-slate-300 print:mb-8 print:p-6 print:rounded-none">
          <h2 className="text-xl font-bold text-white print:text-black mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400 print:text-black no-print" />
            Table of Contents
          </h2>
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-300 print:text-slate-800">
            {posts.map((post) => (
              <li key={post.entryNum} className="flex items-baseline gap-2">
                <span className="font-mono text-emerald-400 print:text-black font-semibold min-w-[2rem]">
                  #{post.entryNum}
                </span>
                <a 
                  href={`#entry-${post.entryNum}`}
                  className="hover:text-emerald-300 hover:underline truncate print:no-underline print:text-black"
                >
                  {post.title}
                </a>
              </li>
            ))}
          </ol>
        </section>

        {/* Blog Entries Sequence */}
        <div className="space-y-16 print:space-y-0">
          {posts.map((post, idx) => (
            <article 
              key={post.filename} 
              id={`entry-${post.entryNum}`}
              className={`bg-slate-800/40 border border-slate-700/80 rounded-2xl p-6 md:p-8 shadow-lg print:bg-white print:border-0 print:border-t print:border-slate-300 print:rounded-none print:p-0 print:pt-6 print:mb-8 ${idx > 0 ? 'print-break-before' : ''}`}
            >
              {/* Post Header */}
              <div className="mb-6 pb-4 border-b border-slate-700/60 print:border-slate-300">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 print:text-slate-600 mb-2">
                  <span className="font-mono font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 print:bg-slate-200 print:text-black rounded">
                    ENTRY #{post.entryNum}
                  </span>
                  <span>{post.timestamp}</span>
                  <span className="font-mono text-slate-500 print:text-slate-600">{post.filename}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white print:text-black mt-2">
                  {post.title}
                </h2>
              </div>

              {/* Rendered HTML Body */}
              <div 
                className="prose prose-invert prose-emerald max-w-none print:prose-neutral"
                dangerouslySetInnerHTML={{ __html: post.html }}
              />
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
