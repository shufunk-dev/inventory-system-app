# Guarding Quotas and Scoping Locations: Launching v1.8.8

We are excited to announce the release of **v1.8.8** of the Unified Inventory & POS System! Today's update introduces critical safety features to protect your search quotas, fixes a hidden key-resolution bug, and brings context-aware location valuation filtering to the dashboard.

Here is a summary of what's new in this release:

---

## 1. Google CSE & SerpApi Safeguards (Quota Protection)
When importing major dumps of un-barcoded items (like a batch of 80+ VHS tapes or collectible toys), background workers have a tendency to consume search quotas rapidly if error limits aren't handled. In v1.8.8, we've implemented strict safeguards:
- **Graceful Error Detection:** The pricing worker now intercepts Google Custom Search `403` (key restriction) and `429` (quota limit) codes immediately.
- **Queue Auto-Pause:** Instead of continuing to run, failing items, and spamming the APIs, the background worker now triggers a clean safety pause. The remaining queue is marked as `rate_limited` and goes idle, allowing you to fix API restrictions or wait for daily resets before resuming.
- **SerpApi Quota Preservation:** We've completely disabled SerpApi pricing fallbacks for all market value lookups (toys, coins, books, comics, cards, and generic items). The system will now use **Google Custom Search Engine** exclusively for automated price estimates, saving your SerpApi quota strictly for image matches (Google Lens searches).

---

## 2. Dynamic Category-Specific Valuations
Understanding the value of your inventory based on *where* it is located (like "Box 1", "Middle Drawer", or "Top Shelf") is a huge asset for collectors and resellers. 
- The homepage **Est. Value** badge now dynamically recalculates when you filter by a category/location. If you select "Box 1", you'll see `Category Value: $150.00 →` instead of the total portfolio value.
- Clicking the badge routes you to the **Valuation Report** pre-filtered to that category.
- The Valuation Report page now displays a sleek banner showing the active filter (e.g. `Filtered: Box 1`) and includes a quick `×` button to clear the filter and reset stats back to the full catalog.

---

## 3. Bug Fix: TMDB Key Resolution
We discovered a bug where Next.js server details for video/movie lookups were failing back to SerpApi, bypassing TMDB even when a valid key was configured. The server was querying the store-specific partition database for the `api_keys` setting rather than the global configuration database. We patched this in v1.8.8, and movie imports will now fetch plots, cast, and trailers directly from the free TMDB API, saving hundreds of SerpApi queries during large movie imports.

---

## 4. Native Windows App v1.8.8 Released
Lastly, we've rebuilt the Electron wrapper, bumped all version manifests to `1.8.8`, and successfully packaged the Windows desktop executable. The updated installer (`Inventory System Setup 1.8.8.exe`) is officially published and live on the GitHub repository releases!

Stay tuned for more updates!
