import { getDb, getGlobalDb } from '@/lib/db';
import { headers } from 'next/headers';
import Link from 'next/link';
import { ArrowLeft, Package, Calendar, Tag, RefreshCw, Film } from 'lucide-react';
import { getUser } from '@/lib/auth';
import { decryptSync } from '@/lib/jwt';
import BarcodeDisplay from '@/components/BarcodeDisplay';
import UploadImageForm from '@/components/UploadImageForm';
import DeleteItemButton from '@/components/DeleteItemButton';
import EditItemForm from '@/components/EditItemForm';
import FetchMetadataButton from '@/components/FetchMetadataButton';
import ImageGallery from '@/components/ImageGallery';
import ToyDetailsWidget from '@/components/ToyDetailsWidget';
import CoinDetailsWidget from '@/components/CoinDetailsWidget';
import CardDetailsWidget from '@/components/CardDetailsWidget';
import ComicDetailsWidget from '@/components/ComicDetailsWidget';
import GradedDetailsWidget from '@/components/GradedDetailsWidget';
import GameDetailsWidget from '@/components/GameDetailsWidget';
import StandardDetailsWidget from '@/components/StandardDetailsWidget';

export default async function ItemPage({ params }) {
  const { id } = await params;
  const db = await getDb();
  
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);

  if (!item) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center flex-col gap-4">
        <Package className="w-16 h-16 text-gray-600" />
        <h1 className="text-3xl font-bold text-gray-300">Item Not Found</h1>
        <Link href="/" className="text-blue-500 hover:text-blue-400 mt-4 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </Link>
      </div>
    );
  }

  const user = await getUser();
  const isAdmin = user?.isAdmin === 1;
  const isOwner = user ? (user.id === item.userId) : false;
  const canEdit = user && (user.isAdmin || user.role === 'admin' || user.role === 'manager' || user.id === item.userId);
  const isGuest = !user;

  let globalTier = 'basic';
  try {
    const globalDb = await getGlobalDb();
    const row = globalDb.prepare("SELECT value FROM system_settings WHERE key = 'active_tier'").get();
    if (row && row.value) {
      globalTier = row.value;
    } else {
      const adminUser = globalDb.prepare("SELECT tier FROM users WHERE (isAdmin = 1 OR isRoot = 1) AND tier = 'premium' LIMIT 1").get();
      if (adminUser) {
        globalTier = 'premium';
      }
    }
  } catch (e) {}

  const userTier = globalTier;

  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const qrUrl = `http://${host}/item/${item.id}`;
  
  const date = new Date(item.createdAt).toLocaleString();

  // Resolve central store/mall name
  let centralStoreName = 'Antique Mall';
  try {
    const globalDb = await getGlobalDb();
    const row = globalDb.prepare("SELECT value FROM system_settings WHERE key = 'mall_name'").get();
    if (row && row.value) {
      centralStoreName = row.value;
    }
  } catch (e) {}

  // Resolve booth name
  let boothName = 'Central';
  let boothNumber = null;
  try {
    const { cookies } = require('next/headers');
    const cookieStore = await cookies();
    let activeStoreId = 'default';
    
    const sessionCookie = cookieStore.get('session')?.value;
    if (sessionCookie) {
      const payload = decryptSync(sessionCookie);
      if (payload && payload.userId) {
        const globalDb = await getGlobalDb();
        const userRow = globalDb.prepare('SELECT storeId FROM users WHERE id = ?').get(payload.userId);
        if (userRow && userRow.storeId && userRow.storeId !== 'default') {
          activeStoreId = userRow.storeId;
        }
      }
    }
    
    if (activeStoreId === 'default') {
      activeStoreId = cookieStore.get('active_store_id')?.value || 'default';
    }

    if (activeStoreId !== 'default') {
      const globalDb = await getGlobalDb();
      const storeProfile = globalDb.prepare('SELECT name, boothNumber FROM store_profiles WHERE id = ?').get(activeStoreId);
      if (storeProfile) {
        boothName = storeProfile.name;
        boothNumber = storeProfile.boothNumber;
      }
    }
  } catch (e) {
    console.error('Error resolving store/booth details:', e);
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white selection:bg-blue-500/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-gray-900 px-4 py-2 rounded-full border border-gray-800 hover:border-gray-600">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Back to Catalog</span>
          </Link>
          
          {item.itemType === 'coin' && (
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
              Coin Mode Entry
            </span>
          )}

          {item.itemType === 'toy' && (
            <span className="bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse"></div>
              Toy Mode Entry
            </span>
          )}

          {item.itemType === 'video' && (
            <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
              Video Mode Entry
            </span>
          )}
        </div>

        <div className="bg-gray-900 rounded-[2rem] p-8 md:p-12 border border-gray-800 shadow-2xl">
          <div className="flex flex-col md:flex-row gap-12 mb-12">
            {/* Image Section */}
            <div className="w-full md:w-1/2">
              <ImageGallery item={item} />
              {canEdit && (
                <div className="mt-6 flex justify-center">
                  <UploadImageForm itemId={item.id} />
                </div>
              )}
            </div>

            {/* Details Section */}
            <div className="w-full md:w-1/2 flex flex-col justify-center">
              <EditItemForm item={item} canEdit={canEdit} isGuest={isGuest} />
              
              <div className="space-y-6">
                {item.barcode && (!isGuest || (item.itemType && item.itemType !== 'standard' && item.itemType !== 'video')) && (
                  <div className="flex items-center gap-4 bg-gray-800/50 p-4 rounded-2xl">
                    <div className="bg-blue-500/20 p-3 rounded-xl text-blue-400">
                      <Tag className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-400">Original Barcode</p>
                      <p className="text-xl font-mono text-white">{item.barcode}</p>
                    </div>
                  </div>
                )}

                {!isGuest && (
                  <>
                    <div className="flex items-center gap-4 bg-gray-800/50 p-4 rounded-2xl">
                      <div className="bg-purple-500/20 p-3 rounded-xl text-purple-400">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-400">Added to Catalog</p>
                        <p className="text-lg text-white">{date}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 bg-gray-800/50 p-4 rounded-2xl">
                      <div className={`p-3 rounded-xl ${
                        item.syncStatus === 'success' ? 'bg-green-500/20 text-green-400' :
                        item.syncStatus === 'failed' ? 'bg-red-500/20 text-red-400' :
                        item.syncStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        <RefreshCw className={`w-6 h-6 ${item.syncStatus === 'pending' ? 'animate-spin' : ''}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-400">
                          Last Scanned: {item.lastSyncAttempt ? new Date(item.lastSyncAttempt).toLocaleString() : 'Never'}
                        </p>
                        <p className={`text-lg font-bold capitalize ${
                          item.syncStatus === 'success' ? 'text-green-400' :
                          item.syncStatus === 'failed' ? 'text-red-400' :
                          item.syncStatus === 'pending' ? 'text-yellow-400' :
                          'text-gray-400'
                        }`}>
                          {item.syncStatus === 'completed' ? 'Success (Legacy)' : item.syncStatus}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              {canEdit && (
                <div className="mt-8 flex flex-col gap-2">
                  <FetchMetadataButton itemId={item.id} isAdmin={isAdmin} userTier={userTier} />
                  <DeleteItemButton itemId={item.id} />
                </div>
              )}
            </div>
          </div>

          <hr className="border-gray-800 mb-12" />

          {item.itemType === 'card' && (
            <CardDetailsWidget item={item} isGuest={isGuest} />
          )}

          {item.itemType === 'graded' && (
            <GradedDetailsWidget item={item} isGuest={isGuest} />
          )}

          {item.itemType === 'game' && (
            <GameDetailsWidget item={item} isGuest={isGuest} />
          )}

          {/* Movie Details Section */}
          {item.itemType === 'video' && (
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-rose-500/20 p-2 rounded-lg text-rose-400">
                  <Film className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-white">Movie / TV Show Details</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {item.moviePlot && (
                    <div className="bg-gray-800/30 p-6 rounded-2xl border border-gray-700/50">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Plot Summary</h3>
                      <p className="text-gray-300 leading-relaxed">{item.moviePlot}</p>
                    </div>
                  )}
                  
                  {!isGuest && item.movieCast && (
                    <div className="bg-gray-800/30 p-6 rounded-2xl border border-gray-700/50">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Cast</h3>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          try {
                            const castList = JSON.parse(item.movieCast);
                            return castList.map((actor, idx) => (
                              <span key={idx} className="bg-gray-700/50 text-gray-300 px-3 py-1 rounded-full text-sm">
                                {actor}
                              </span>
                            ));
                          } catch (e) {
                            return <span className="text-gray-400">{item.movieCast}</span>;
                          }
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {item.movieTrailer && (
                  <div className="bg-gray-800/30 p-6 rounded-2xl border border-gray-700/50 flex flex-col">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Trailer</h3>
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black flex-1">
                      {(() => {
                        let embedUrl = item.movieTrailer;
                        if (embedUrl.includes('watch?v=')) {
                          embedUrl = embedUrl.replace('watch?v=', 'embed/');
                          embedUrl = embedUrl.split('&')[0];
                        }
                        return (
                          <iframe
                            src={embedUrl}
                            className="absolute top-0 left-0 w-full h-full"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {!isGuest && (item.gradedAgency || item.gradedCondition) && (
                <div className="mt-8 bg-gray-800/30 p-6 rounded-2xl border border-gray-700/50">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Video Grading Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <span className="block text-gray-400 mb-1 text-sm">Grading Agency</span>
                      <span className="font-bold text-white text-lg">{item.gradedAgency || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400 mb-1 text-sm">Condition/Grade</span>
                      <span className="font-bold text-amber-400 text-lg">{item.gradedCondition || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400 mb-1 text-sm">Cert Number</span>
                      <span className="font-mono text-white text-lg">{item.gradedCertNumber || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}

              {!isGuest && (
                <div className="mt-8 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden p-6 md:p-8 relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div>
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Estimated Market Value</h3>
                      {item.valueAvg ? (
                        <div className="flex items-baseline gap-4">
                          <span className="text-4xl font-black text-rose-400">${item.valueAvg}</span>
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

              <hr className="border-gray-800 my-12" />
            </div>
          )}

          {/* Toy Details Section */}
          {item.itemType === 'toy' && (
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-fuchsia-500/20 p-2 rounded-lg text-fuchsia-400">
                  <div className="w-6 h-6 flex items-center justify-center font-bold">T</div>
                </div>
                <h2 className="text-2xl font-bold text-white">Toy Details</h2>
              </div>
              
              <ToyDetailsWidget item={item} isPrivate={isOwner || isAdmin} isGuest={isGuest} />
              
              <hr className="border-gray-800 my-12" />
            </div>
          )}

          {/* Coin Details Section */}
          {item.itemType === 'coin' && (
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-amber-500/20 p-2 rounded-lg text-amber-400">
                  <div className="w-6 h-6 flex items-center justify-center font-bold">C</div>
                </div>
                <h2 className="text-2xl font-bold text-white">Coin Details</h2>
              </div>
              
              <CoinDetailsWidget item={item} isPrivate={isOwner || isAdmin} isGuest={isGuest} />
              
              <hr className="border-gray-800 my-12" />
            </div>
          )}

          {/* Comic Details Section */}
          {item.itemType === 'comic' && (
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-sky-500/20 p-2 rounded-lg text-sky-400">
                  <div className="w-6 h-6 flex items-center justify-center font-bold">🦸‍♂️</div>
                </div>
                <h2 className="text-2xl font-bold text-white">Comic Book Details</h2>
              </div>
              
              <ComicDetailsWidget item={item} isPrivate={isOwner || isAdmin} isGuest={isGuest} />
              
              <hr className="border-gray-800 my-12" />
            </div>
          )}

          {/* Standard Item Market Value Details */}
          {(item.itemType === 'standard' || !item.itemType) && !isGuest && (
            <StandardDetailsWidget item={item} />
          )}

          {/* Barcodes Section */}
          {!isGuest && (
            <BarcodeDisplay 
              internalId={item.id} 
              qrUrl={qrUrl} 
              centralStoreName={centralStoreName}
              boothName={boothName}
              boothNumber={boothNumber}
              itemName={item.name}
              retailPrice={item.retailPrice}
            />
          )}
          
        </div>
      </div>
    </main>
  );
}
