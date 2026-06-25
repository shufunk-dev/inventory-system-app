# Release Update: Beta 1.8.4 — Direct Mobile Sync & Bearer Authentication

We are thrilled to announce the release of **Beta 1.8.4**, a major feature update that establishes direct communication between the mobile scanner app and the web server. This release eliminates the need to manually copy ZIP files via USB or share sheets, allowing seamless, one-tap uploads over local Wi-Fi or remote secure tunnels.

Here is a breakdown of what's new in this release:

## 1. Local & Remote Mobile Ingestion ⚡
Previously, syncing scans required exporting a ZIP file from the mobile app and uploading it via the web interface. 
* **Settings Configuration**: A new **Settings Modal** (accessible via the gear ⚙️ icon on the Export screen) has been added. Users can enter their `Server URL` (such as a local IP `http://192.168.1.150:3000`, local domain `http://inventory.local`, or public Cloudflare Tunnel `https://inventory.yourdomain.com`), account email, and password.
* **Local Persistence**: Connection settings are encrypted and saved locally to the device's storage (`sync_settings.json`) using `expo-file-system`.

## 2. One-Tap Sync & Bearer Authentication 🔒
To bypass cross-origin cookie restrictions and make connections completely reliable on all mobile versions:
* **Token Authentication**: The login API now returns a secure, encrypted token in the response body. 
* **Header Authorization**: The server session validator was updated to accept token authorization via `Authorization: Bearer <token>` headers.
* **Direct Sync Action**: Clicking **⚡ Sync to Server** in the mobile app will automatically authenticate, compress the scanned queue in cache, and POST it directly to the server's ingestion endpoint, clearing the local mobile queue on success.

## 3. Google Books Exact ISBN Matching 📚
We optimized the background metadata scraper's book lookup system:
* **The Problem**: Pre-2007 mass-market paperbacks (Pocket Books, Dell, Bantam, Avon) printed generic UPC barcodes that were recycled across multiple books sharing the same price tier, returning the wrong book title in the same series when scanned.
* **The Solution**: The background worker now scans all matching volumes returned by Google Books and performs an exact ISBN match check against the `industryIdentifiers`. This prevents series name collisions and ensures you get the exact book title.

## 4. Troubleshooting Manual Updates 📖
* We updated the in-app **Troubleshooting User Manual** with details on recycled barcodes and how to use the mobile app's **Photo Mode** (which triggers Google Lens visual AI lookup) to bypass recycled barcode limits and catalog vintage paperback books.

## 5. Build Rebuilds & Native APK Release
* Standalone Android APK builds have been compiled and updated via EAS.
* Backend test suite verified and passing with 100% success.

*Version 1.8.4 is now fully live and deployed on GitHub!*
