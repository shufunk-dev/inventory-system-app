import { getDb, getGlobalDb } from '@/lib/db';
import { cookies } from 'next/headers';
import { decryptSync } from '@/lib/jwt';
import BarcodePrintClient from '@/components/BarcodePrintClient';

export const dynamic = 'force-dynamic';

export default async function ItemPrintPage({ searchParams }) {
  const { ids } = await searchParams;
  const db = await getDb();
  
  let items = [];
  if (ids) {
    const idList = ids.split(',').map(id => id.trim()).filter(id => id.length > 0);
    if (idList.length > 0) {
      // Fetch items matching the ids
      const placeholders = idList.map(() => '?').join(',');
      items = db.prepare(`SELECT * FROM items WHERE id IN (${placeholders})`).all(...idList);
    }
  }

  // Resolve central store/mall name
  let centralStoreName = 'Antique Mall';
  try {
    const globalDb = await getGlobalDb();
    const row = globalDb.prepare("SELECT value FROM system_settings WHERE key = 'mall_name'").get();
    if (row && row.value) {
      centralStoreName = row.value;
    }
  } catch (e) {
    console.error('Error resolving mall name settings:', e);
  }

  // Resolve active booth/store name
  let boothName = 'Central';
  try {
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
      const storeProfile = globalDb.prepare('SELECT name FROM store_profiles WHERE id = ?').get(activeStoreId);
      if (storeProfile) {
        boothName = storeProfile.name;
      }
    }
  } catch (e) {
    console.error('Error resolving store/booth details:', e);
  }

  return (
    <BarcodePrintClient 
      initialItems={items} 
      centralStoreName={centralStoreName} 
      defaultBoothName={boothName} 
    />
  );
}
