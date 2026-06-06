'use client';

export default function GradedDetailsWidget({ item, isGuest = false }) {
  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="bg-gray-800/30 p-6 rounded-2xl border border-gray-700/50 h-full">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Grading Details</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-700/50 pb-4">
              <span className="text-gray-400">Condition/Grade</span>
              <span className={`font-bold ${item.gradedCondition ? 'text-amber-400' : 'text-white'}`}>
                {item.gradedCondition || 'Unknown'}
              </span>
            </div>
            
            <div className="flex justify-between items-center border-b border-gray-700/50 pb-4">
              <span className="text-gray-400">Grading Agency</span>
              <span className="font-bold text-white uppercase">{item.gradedAgency || 'N/A'}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400">Cert Number</span>
              <span className="font-mono text-white">{item.gradedCertNumber || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-gray-800/30 p-6 rounded-2xl border border-gray-700/50 h-full relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Universal Graded Asset</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            This item is processed by the universal graded asset pipeline. Market data is calculated by cross-referencing the item's title, grading agency, and assigned grade.
          </p>
        </div>
      </div>
    </div>
    
    {!isGuest && (
      <div className="mt-8 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden p-6 md:p-8 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Estimated Market Value</h3>
            {item.valueAvg ? (
              <div className="flex items-baseline gap-4">
                <span className="text-4xl font-black text-green-400">${item.valueAvg}</span>
                <span className="text-sm text-gray-500 font-medium tracking-wide">
                  LOW: ${item.valueLow} &nbsp;&bull;&nbsp; HIGH: ${item.valueHigh}
                </span>
              </div>
            ) : (
              <div className="text-xl font-medium text-gray-500 italic">
                {item.syncStatus === 'pending' ? 'Calculating value...' : 'Value not available'}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
