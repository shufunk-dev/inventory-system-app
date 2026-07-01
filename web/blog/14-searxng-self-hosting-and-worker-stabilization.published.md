# Self-Hosted SearXNG Integration & Background Worker Stabilization

Today, we took major steps to make the Inventory System more self-reliant, cost-effective, and robust. By integrating a self-hosted instance of **SearXNG** on the Raspberry Pi appliance, we've enabled free, privacy-respecting market valuation searches that bypass the need for paid search APIs. 

Along the way, we stabilized the background sync worker, resolved UI scroll behaviors, and added automatic media fetching from TMDB. Here is a breakdown of today's achievements.

---

## 1. Self-Hosting SearXNG on the Appliance (Docker)
To avoid reliance on paid Google Custom Search Engine (CSE) queries for item pricing, we deployed **SearXNG** in a Docker container directly on the Raspberry Pi appliance. 

We encountered and resolved a Docker permission barrier:
* **The Error**: `permission denied while trying to connect to the docker API at unix:///var/run/docker.sock`
* **The Fix**: We added the appliance service user to the host system's `docker` group (`sudo usermod -aG docker $USER`) and rebooted the system to apply user privileges across all background daemons (including PM2). The Next.js server can now query and manage the Docker socket seamlessly without `sudo`.

---

## 2. API Key Routing & Sync Worker Stabilization
During manual sync operations triggered directly from the Web UI, the background worker was failing to query SearXNG.
* **The Cause**: The database API key injection code (which loads settings like `SEARXNG_URL`) was located inside the background queue loop (`processNextItem`). Since manual detail syncs trigger the `fetchItemDetails` function directly from the route handler (`/api/item/[id]/fetch`), the database keys were never loaded, causing `process.env.SEARXNG_URL` to remain `undefined`.
* **The Fix**: We relocated the database config injection block to the very beginning of the `fetchItemDetails` function. Now, both direct manual fetches and background queue runs have automatic access to the custom database configuration.

---

## 3. Restricting SerpApi & Migrating Certificate Searches
To protect our users' SerpApi quotas, we enforced a strict rule: **SerpApi is now reserved exclusively for premium visual matches (Google Lens).**

* **Movie Metadata**: We removed the SerpApi fallback from movie lookups. If TMDB is unavailable, it skips straight to pricing checks.
* **Graded Barcode Certs**: Certificate lookups for graded assets (such as PSA, Beckett, SGC, PCGS, and NGC cert number lookups) were previously hitting SerpApi. We created a new generic `fetchOrganicSearch` helper that routes these web lookups to the local **SearXNG** instance (or Google CSE) for free, completely bypassing SerpApi.

---

## 4. Preserving Custom Titles During Sync
We noticed that if a user manually corrected or edited an item's title in the UI (e.g., simplifying a noisy barcode name to `"Ella Enchanted"`), clicking **Sync** would pull the raw name from the barcode registry and overwrite the user's custom title.

We updated the worker's name-resolution logic to check if a custom title exists in the database before running barcode lookups:
```javascript
const isCustomName = item.name && 
                     item.name !== 'Analyzing Photo...' && 
                     item.name !== 'Unknown Item' && 
                     item.name !== 'Pending Sync' &&
                     item.name.trim() !== '';
let name = isCustomName ? item.name : ((details && details.name) ? details.name : 'Unknown Item');
```
Now, if you have edited the item's title, the sync worker respects your edit and uses it to query TMDB and SearXNG instead of reverting back to the raw barcode registry title.

---

## 5. Fetching Official Movie Posters from TMDB
To improve the visual presentation of movie items, we updated the TMDB metadata helper to extract the `poster_path` from the TMDB API response and convert it to a full w500 poster image URL.

If a synced video/movie item has no cover photo (or is showing a placeholder), the worker will automatically set the item's main image to the official poster fetched from TMDB.

---

## 6. Confining Live Console Auto-Scroll
We fixed a minor UI bug in the Admin Control Panel where live console terminal auto-scrolling was using `scrollIntoView()`. This was causing the browser to pull down the entire page-level scrollbar every time a new log entry arrived.

We switched the scroll mechanism in `ServerLogsPanel.js` to adjust the scroll container directly:
```javascript
useEffect(() => {
  if (terminalRef.current && autoRefresh) {
    terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }
}, [logs, autoRefresh]);
```
This restricts the auto-scroll action strictly to the terminal window, keeping your main page scrollbar locked in place so you can read other parts of the admin page in peace.
