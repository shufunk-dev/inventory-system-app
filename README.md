# Unified Inventory & Point-of-Sale (POS) System

A modern, local-first, multi-platform inventory management and Point-of-Sale (POS) system. Designed to bridge the gap between high-end retail management, multi-booth antique malls, and simple, lightweight collection cataloging. 

Built with **Next.js 16**, **React 19**, **Electron**, and **React Native (Expo)**, the application is modular, offline-first, and highly configurable via licensing keys to fit different business types and hobbyist needs.

For detailed manuals, live roadmaps, and sprint logs, visit the official documentation page at **[its.shufunk.net](https://its.shufunk.net/)**.

---

## 🚀 Key Features

### 1. Dual Operational Modes (Reinstall-Free)
Lock/unlock features dynamically based on product licensing keys:
- **Collector Mode**: A clean, simplified UI for tracking condition, cataloging assets, shelf locations, and calculating collection net worth (video games, coins, cards, comics, toys, books, music archives, retro computing/hardware, workshop tools, etc.).
- **Retail Store Mode**: Unlocks the complete POS checkout register, sales transaction logs, tax structures, employee shifts, commission tracking, and supplier profiles.
- **7-Day Offline Retail Trial**: Test complete Retail Store Mode features offline using the public trial key: `TRIA-7777-7042-18B0`. This trial key activates all premium features for 7 days, after which the local environment resets to factory settings.

### 2. Smart Barcode & Visual Scanning Engine
- **Standard UPC/EAN Lookups**: Auto-populates item details using Google Books, UPCItemDB, and OpenFoodFacts.
- **eBay REST API Market Valuation**: Directly queries the eBay OAuth 2.0 Browse API (`api.ebay.com`) using GTIN/UPC/ISBN or product titles to calculate real-time market price summaries (average/median, minimum, maximum, item count).
- **SearXNG Meta-Search Engine**: Integrates with self-hosted SearXNG instances for privacy-focused market pricing and metadata retrieval without commercial API key dependencies.
- **PriceCharting Game Waterfall**: Detects video game categories and queries the PriceCharting API to fetch current market values across loose, CIB, and new conditions.
- **Discogs Music Lookups**: Queries the Discogs API using barcodes or album titles to auto-populate artist details, format types (Vinyl/CD/Cassette/8-track), pressing year/country, matrix runout numbers, and condition ratings.
- **Retro Tech Specs Resolution**: Automatically scrapes technical spec sheets (CPU-World, TechPowerUp, EveryMac) to pull core clocks, RAM configurations, and model metrics for CPUs, GPUs, drives, and legacy computing systems.
- **Tools & Workshop Recognition**: Auto-identifies repair tool brands (Hakko, DeWalt, Milwaukee, Makita, Bosch, Ryobi) and logs custom metrics like warranty coverage, purchase dates, and assigned workstation locations (e.g. "Desk 2").
- **Google Lens Visual Matching**: Allows visual search for un-barcoded items (like vintage toys, antiques, or graded cards) to retrieve details instantly.

### 3. Duplex Scan Intake & OCR Ingestion Pipeline
- **Duplex & Multi-Page Document Ingestion**: Ingests physical count sheets and multi-page invoices with automated page splitting, canvas rendering, and Tesseract.js OCR text extractions.
- **Vendor Division Column Parsing**: Dynamically detects vendor formats (e.g. *Barringer*, *Caffey*, *Pepsi Co*) and adapts soft drink bottle/can column layouts automatically.
- **Merge-on-Date**: Merges counts matching the same upload date to facilitate easy corrections and session updates.
- **Asset Valuation & Depletions**: Calculates dollar depletions and stock totals side-by-side using start and end count sessions.
- **Chronological Timeline Progression**: Interactive matrix table showing inventory levels over time with dynamic quick-filters ("Select All", "Clear All", "Last 5", "Last 10").

### 4. Bulk Management & Find-and-Replace Engine
- **Regex & Pattern Find-and-Replace**: Mass-update item titles, descriptions, and SKU patterns across selected categories or entire catalogs.
- **Bulk Categorization & System Tagging**: Rapidly assign game platforms, custom media formats (VHS, LaserDisc, Betamax, Blu-Ray, 4K UHD), and custom tags in bulk.
- **Bulk Price Scaling**: Apply fixed-value or percentage-based price adjustments across inventory segments.

### 5. Multi-Booth Aggregator & Sales Payouts (Antique Malls)
- **Vendor Booth Partitioning**: Gates user logins dynamically. Store owners assign users to isolated database partitions (`store_[id].sqlite`) while locking down unassigned stores.
- **Cross-Store Sales Attribution**: The checkout register scans barcodes (matching UUID or UPC), searches booth catalogs, attributes sales to the correct vendor, and calculates custom commission deductions.
- **Print Hub & Thermal Receipts**: Renders monospaced checkout prints optimized for **80mm Thermal Rolls** and **Standard Letter Invoices**, displaying inline booth numbers and metadata per line item.

### 6. Interactive Countertop Tablet Register & Sandbox
- **Tablet Cashier Register**: Touch-optimized register interface designed for iPad/Android cashiering tablets with collapsible accordion blocks to maximize screen space.
- **Widescreen Tactile Grid**: Responsive item catalog grids with instant touch feedback.
- **Interactive Touch Cart**: Real-time checkout cart featuring touch quantity modifiers, item removal, and single-tap checkout payment triggers.
- **Clerk Training Sandbox**: Isolated sandbox mode allowing cashiers to practice checkouts with simulated credit card delays and fake transactions without affecting live accounting data.

### 7. Direct ESC/POS Hardware Printing & Cash Drawer Control
- **ESC/POS Command Encoder**: Compiles receipt data into formatted monospaced binary command blocks (bold, double-width text, table alignments, line splits).
- **Direct TCP Socket Streaming**: Sends print jobs directly over background TCP sockets to network thermal printers on Port 9100, bypassing standard browser print dialogs.
- **Hardware Triggers**: Native control codes for automatic paper cutting (`GS V`) and cash drawer pop triggers (`ESC p`).
- **WebUSB Binary Stream**: Direct binary buffer streaming via client WebUSB connections.

### 8. Local-First Architecture & Zero-Config Remote Sync
- **Local SQLite Storage**: Runs on local **SQLite** databases (`better-sqlite3`), keeping inventory, sales logs, and customer data secure and under your direct control.
- **Mobile Offline Sync**: The React Native scanner app stores counts locally and syncs back to the primary server automatically over Wi-Fi.
- **Cloudflare Zero Trust Tunnels**: Secure remote access (cellular/external network) without complex router configurations or port-forwarding.

### 9. Cryptographic Security & Remote Support Portal
- **Asymmetric Support Tokens**: Uses NIST P-256 (ECDSA ES256) signature verification for backend support session authorization.
- **Machine Fingerprinting & Support Dashboard**: Glassmorphic UI displaying local Machine IDs and copyable JWT session tokens.

---

## 🛠 Tech Stack

- **Frontend Framework**: Next.js 16 (App Router), React 19, TailwindCSS 4, Lucide Icons
- **Desktop Shell**: Electron 30 with `electron-builder` (NSIS Installer)
- **Mobile App**: React Native 0.81, Expo 54, `expo-camera`, local SQLite sync
- **Database Layer**: SQLite (`better-sqlite3`, `react-native-quick-sqlite`)
- **APIs & Lookups**: eBay REST API (OAuth 2.0 Browse API), SearXNG, PriceCharting, Discogs, Google Books, UPCItemDB, OpenFoodFacts, Tesseract.js (OCR)
- **Networking & Tunneling**: Cloudflare Zero Trust Tunnels, TCP Sockets (Port 9100 direct printing)
- **Licensing & SaaS**: Express.js standalone licensing server with SQLite storage

---

## 📁 Repository Structure

```
inventory-system-app/
├── web/                        # Main Next.js Web App, API Endpoints, & Electron Host
│   ├── app/                    # Next.js App Router (POS, Inventory, Valuation, Admin)
│   ├── components/             # Reusable UI Components & Modals
│   ├── lib/                    # Core Utilities (Database, eBay, ESC/POS, Licensing, Support)
│   ├── electron/               # Electron Main Process & Build Configs (`electron-builder`)
│   ├── searxng/                # Self-Hosted SearXNG Configuration
│   ├── setup-appliance.sh      # Raspberry Pi OS Appliance Provisioning Script
│   └── build-windows.bat       # Windows Electron .exe Packaging Script
├── mobile/                     # React Native Expo Mobile Handheld Scanner App
└── README.md                   # Project Overview & Documentation
```

---

## ⚡ Quick Start & Development

### Prerequisites
- **Node.js**: v18.x or v20.x+
- **npm**: v9.x+
- **Windows Terminal** (optional, for batch scripts on Windows)

### 1. Run Web & Mobile Dev Servers

#### Windows (One-Click):
Double-click `start_dev_servers.bat` or run:
```powershell
.\start_dev_servers.bat
```

#### Manual Startup:
**Web App (Dashboard & Register):**
```bash
cd web
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

**Mobile App (Expo Scanner):**
```bash
cd mobile
npm install
npm start
```
Scan the QR code with Expo Go or run on an emulator (`npm run android` / `npm run ios`).

---

### 2. Standalone Build Commands

#### Package Windows Electron Installer (.exe):
```powershell
cd web
.\build-windows.bat
```
The compiled NSIS installer `.exe` will be generated under `web/electron/dist/`.

#### Build Standalone Android APK (via Expo EAS):
```powershell
cd mobile
npx eas-cli build --platform android --profile preview --non-interactive
```

#### Run License Management Server:
```powershell
.\start_license_manager.bat
# Or manually:
cd license-server
npm install
npm start
```
Access the License Management Dashboard at [http://localhost:3005](http://localhost:3005).

---

## 🌐 Ecosystem Deployment Formats

1. **Windows Desktop Application**: Native `.exe` installer generated via Electron.
2. **Local / Cloud Web Server**: Deployed to local Linux machines, Windows Server, or cloud VPS.
3. **Raspberry Pi OS Appliance**: Turn a Pi 4 or Pi 5 into a dedicated local server using `web/setup-appliance.sh`.
4. **Bootable Linux Live USB**: Offline OS flash drive with persistent database storage.
5. **Standalone Handheld Mobile App**: Native Android & iOS app for stock counts and barcode scanning.

---

## 📄 License & Contact

Developed and maintained by **Shufelt Designs LLC**.
For licensing, custom deployments, or support, visit **[its.shufunk.net](https://its.shufunk.net/)**.

