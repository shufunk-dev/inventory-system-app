import Link from 'next/link';
import { Users, BookOpen, Rss } from 'lucide-react';
import { getUser } from '@/lib/auth';

export default async function AdminLayout({ children }) {
  const currentUser = await getUser();
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-blue-500/30 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Admin Navigation */}
        <div className="flex items-center gap-6 border-b border-gray-800 pb-4 mb-8">
          <Link href="/admin" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <Users className="w-5 h-5" />
            <span className="font-medium tracking-wide">User Management</span>
          </Link>
          
          {currentUser?.isRoot === 1 && (
            <>
              <Link href="/admin/changelogs" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <BookOpen className="w-5 h-5" />
                <span className="font-medium tracking-wide">Changelogs</span>
              </Link>
              <Link href="/admin/blog" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <Rss className="w-5 h-5" />
                <span className="font-medium tracking-wide">Dev Journal</span>
              </Link>
            </>
          )}
        </div>

        {children}

      </div>
    </div>
  );
}
