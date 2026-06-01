'use client';
import { Gamepad2 } from 'lucide-react';

export default function GameDetailsWidget({ item }) {
  return (
    <>
    <div className="flex items-center gap-3 mb-6">
      <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400">
        <Gamepad2 className="w-6 h-6" />
      </div>
      <h2 className="text-2xl font-bold text-white">Video Game Details</h2>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="bg-gray-800/30 p-6 rounded-2xl border border-gray-700/50 h-full relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Condition & Status</h3>
          
          <div className="space-y-4 relative z-10">
            <div className="flex justify-between items-center border-b border-gray-700/50 pb-4">
              <span className="text-gray-400">Format</span>
              <span className="font-bold text-white">
                {item.gradedAgency ? 'Encapsulated/Slabbed' : 'Raw / Ungraded'}
              </span>
            </div>
            
            {item.gradedAgency ? (
              <>
                <div className="flex justify-between items-center border-b border-gray-700/50 pb-4">
                  <span className="text-gray-400">Grading Agency</span>
                  <span className="font-bold text-white uppercase">{item.gradedAgency}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-700/50 pb-4">
                  <span className="text-gray-400">Grade</span>
                  <span className="font-bold text-purple-400">{item.gradedCondition || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Cert Number</span>
                  <span className="font-mono text-white">{item.gradedCertNumber || 'N/A'}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Est. Condition</span>
                <span className="font-bold text-gray-300">Used / CIB</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6 flex flex-col justify-end">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden p-6 md:p-8 relative h-full">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          
          <div className="flex flex-col justify-between h-full relative z-10">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Estimated Market Value</h3>
            {item.valueAvg ? (
              <div>
                <div className="flex items-baseline gap-4 mb-2">
                  <span className="text-4xl font-black text-green-400">${item.valueAvg}</span>
                </div>
                <span className="text-sm text-gray-500 font-medium tracking-wide">
                  LOW: ${item.valueLow} &nbsp;&bull;&nbsp; HIGH: ${item.valueHigh}
                </span>
              </div>
            ) : (
              <div className="text-xl font-medium text-gray-500 italic mt-auto">
                {item.syncStatus === 'pending' ? 'Calculating value...' : 'Value not available'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    
    <hr className="border-gray-800 my-12" />
    </>
  );
}
