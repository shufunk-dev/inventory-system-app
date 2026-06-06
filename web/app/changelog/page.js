import { getDb } from '@/lib/db';
import { getUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ChangelogPage() {
  const db = await getDb();
  
  // Fetch changelogs from database
  // Order by createdAt DESC to have newest at the top
  const logs = db.prepare('SELECT * FROM changelogs ORDER BY createdAt DESC').all();

  // Parse the changes JSON string
  const versions = logs.map(log => ({
    ...log,
    changes: JSON.parse(log.changes || '[]')
  }));

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-blue-500/30">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-4">
            Inventory Project Changelog
          </h1>
          <p className="text-xl text-gray-400">Tracking the evolution of the Mobile Scanner & Web Dashboard</p>
        </div>

        {/* Timeline */}
        <div className="relative border-l-2 border-gray-800 ml-4 md:ml-8 space-y-16 pb-16">
          {versions.map((v) => (
            <div key={v.id} className="relative pl-8 md:pl-12">
              {/* Timeline dot */}
              <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-[#0a0a0a]" />
              
              <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-4 mb-4">
                <h2 className="text-3xl font-bold text-white">{v.version}</h2>
                <span className="text-sm font-medium text-blue-400 px-3 py-1 bg-blue-500/10 rounded-full w-fit">
                  {v.date}
                </span>
              </div>
              
              <h3 className="text-xl text-gray-300 font-medium mb-6">{v.title}</h3>

              <ul className="space-y-4">
                {v.changes.map((change, i) => (
                  <li key={i} className="flex gap-4">
                    <span className={`shrink-0 mt-1 uppercase text-[10px] font-bold tracking-wider px-2 py-0.5 rounded border ${
                      change.type === 'mobile' 
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {change.type}
                    </span>
                    <span className="text-gray-400 leading-relaxed">
                      {change.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          
          {versions.length === 0 && (
            <div className="pl-8 md:pl-12 text-gray-500 italic">No changelogs have been published yet.</div>
          )}
        </div>
        
      </div>
    </div>
  );
}
