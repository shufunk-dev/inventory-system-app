export default function Changelog() {
  const versions = [
    {
      version: 'Beta 1.0',
      date: 'May 29, 2026',
      title: 'Initial Beta Release',
      changes: [
        { type: 'web', text: 'Officially entered Beta 1.0 phase.' }
      ]
    },
    {
      version: 'Pre-Beta version 0.020',
      date: 'May 29, 2026',
      title: 'Admin Infrastructure & Security',
      changes: [
        { type: 'web', text: 'Built the Admin Control Panel for managing user subscription roles.' },
        { type: 'web', text: 'Implemented self-bootstrapping registration to automatically secure the ecosystem.' },
        { type: 'web', text: 'Separated active tier from subscription role, allowing Premium users to toggle engines freely.' },
      ]
    },
    {
      version: 'Pre-Beta version 0.017',
      date: 'May 28, 2026',
      title: 'Specialized Capture & Premium AI Integrations',
      changes: [
        { type: 'mobile', text: 'Added Coin Mode and Toy Mode for specialized capture logic.' },
        { type: 'web', text: 'Integrated Numista API for hyper-accurate numismatic coin identification.' },
        { type: 'web', text: 'Integrated SerpApi Google Lens for highly accurate premium visual matches.' },
      ]
    },
    {
      version: 'Pre-Beta version 0.014',
      date: 'May 27, 2026',
      title: 'The Beta Polish & Organization',
      changes: [
        { type: 'mobile', text: 'Added visual scan verification with "Accept" and "Discard" controls.' },
        { type: 'web', text: 'Implemented an infinite-depth Subcategory system.' },
        { type: 'web', text: 'Built Advanced Search capabilities and category filtering.' },
        { type: 'web', text: 'Upgraded the Google Vision integration to scrape text and logos directly from box art.' },
        { type: 'web', text: 'Added a global sticky navigation header with version tracking.' },
      ]
    },
    {
      version: 'Alpha version 0.009',
      date: 'May 26, 2026',
      title: 'AI Integrations & Rate Limits',
      changes: [
        { type: 'web', text: 'Integrated the UPCItemDB API for automated metadata lookups.' },
        { type: 'web', text: 'Built a failover pipeline utilizing Google Cloud Vision API for fallback image analysis.' },
        { type: 'web', text: 'Implemented smart retry queues to handle API rate limiting smoothly.' },
      ]
    },
    {
      version: 'Alpha version 0.006',
      date: 'May 25, 2026',
      title: 'Details & Async Processing',
      changes: [
        { type: 'web', text: 'Built the dedicated Item Details page with barcode generation.' },
        { type: 'web', text: 'Migrated API requests to a background worker script to prevent server timeouts.' },
        { type: 'mobile', text: 'Added the Export Screen with ZIP generation for transferring scans to the dashboard.' },
      ]
    },
    {
      version: 'Alpha version 0.003',
      date: 'May 24, 2026',
      title: 'The Foundation',
      changes: [
        { type: 'mobile', text: 'Created the React Native scanner app with queue functionality.' },
        { type: 'web', text: 'Initialized the Next.js dashboard and SQLite database structure.' },
        { type: 'web', text: 'Implemented the ZIP upload parser for syncing mobile scans to the server.' },
      ]
    }
  ];

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
          {versions.map((v, idx) => (
            <div key={v.version} className="relative pl-8 md:pl-12">
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
        </div>
        
      </div>
    </div>
  );
}
