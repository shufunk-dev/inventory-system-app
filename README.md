# Unified Inventory & Point-of-Sale (POS) System

A modern, local-first, multi-platform inventory management and Point-of-Sale (POS) system. Designed to bridge the gap between high-end retail management and simple, lightweight collection cataloging. 

Built with **Next.js**, **Electron**, and **React Native**, the application is modular, offline-first, and highly configurable via licensing keys to fit different business types and hobbyist needs.

For detailed manuals, live roadmaps, and sprint logs, visit the official page at **[its.shufunk.net](https://its.shufunk.net/)**.

---

## Key Features

### 1. Dual Operational Modes (Reinstall-Free)
Lock/unlock features based on product licensing keys:
- **Collector Mode**: A clean, simplified UI for tracking condition, cataloging assets, shelf locations, and calculating collection net worth (video games, coins, toys, books, etc.).
- **Retail Store Mode**: Unlocks the complete POS checkout register, sales transaction logs, tax structures, employee shifts, and supplier profiles.
- **7-Day Retail Trial**: Test the complete Retail Store Mode features offline using the public trial key: `TRIA-7777-7042-18B0`. This trial key activates all premium features for 7 days, after which the local environment resets back to factory settings to prepare for clean activation.

### 2. Smart Barcode & Visual Scanning
- **Standard UPC/EAN Lookups**: Auto-populates item details using Google Books, UPCItemDB, and OpenFoodFacts.
- **PriceCharting Game Waterfall**: Detects video game categories and queries the PriceCharting API to fetch current market values.
- **Google Lens Visual Matching**: Allows visual search for un-barcoded items (like vintage toys or graded cards) to retrieve details instantly.

### 3. Local-First & Offline-First Architecture
- **Your Data is Yours**: Runs on a local **SQLite** database. Your inventory, sales metrics, and vendor data remain entirely local and secure.
- **Mobile Offline Sync**: The mobile scanning app stores counts offline and syncs back to the server automatically once within Wi-Fi range.

### 4. Zero-Config Remote Sync
- Supports local network Wi-Fi sync out of the box.
- Unlocks secure remote access (cellular/external Wi-Fi) without complex port-forwarding or router settings using built-in Cloudflare Tunnels (available as a self-hosted configuration or managed service).

### 5. Multi-Method Cashless Checkout
- **Card Terminals**: Integrates with Stripe/Square readers using tokenized APIs (ensures zero local credit card storage/PCI compliance).
- **Zero-Hardware QR Payments**: Generates dynamic checkout QR codes mapped to the store's PayPal or Venmo handles for cashless customer checkouts.

### 6. Physical Inventory Ingestion & Valuation Auditor
- **Raw Sheet Ingestion (PDF/TXT)**: Drag-and-drop parser that handles physical count sheets. Dynamically switches between vendor divisions (like *Barringer*, *Caffey*, and *Pepsi Co*) and adjusts column configurations for soft drinks automatically.
- **Merge-on-Date**: Merges counts matching the same upload date to facilitate easy corrections and updates.
- **Asset Valuation & Depletions**: Calculates dollar depletions and stock totals side-by-side using start and end count sessions.
- **Chronological Timeline Progression**: Interactive matrix table showing inventory levels over time. Features quick-toggle checkboxes ("Select All", "Clear All", "Last 5", "Last 10") to dynamically filter dates.

### 7. Multi-Booth Aggregator & Sales Payouts (Antique Malls)
- **Vendor Booth Partitioning**: Gates user logins dynamically. Store owners assign users to one or multiple booths, auto-routing vendor sessions to isolated database partitions (`store_[id].sqlite`) while locking down unassigned stores.
- **Cross-Store Sales Attribution**: The checkout register scans barcodes (matching UUID or UPC). The system searches booth catalogs, attributes sales to the correct vendor, and generates payout drawers with custom commission deductions.
- **Print Hub & Thermal Receipts**: Renders monospaced checkout prints optimized for **80mm Thermal Rolls** and **Standard Letter Invoices**, displaying inline booth numbers and metadata per line item.

---

## 5 Ecosystem Deployment Formats
The codebase is structured to build and run across five environments:
1. **Windows Desktop App**: Compiled Electron `.exe` installer.
2. **Web / Cloud Server**: Deployed to local Linux machines or VPS hosting.
3. **Raspberry Pi OS**: A micro-server appliance image running on Pi 4 / Pi 5.
4. **Linux Live USB**: A bootable offline OS environment with persistent storage on a flash drive.
5. **Standalone Mobile App**: Native iOS & Android applications.

---

## Tech Stack
- **Frontend/API**: Next.js, React, TailwindCSS, HTML5/CSS3
- **Desktop Shell**: Electron
- **Mobile App**: React Native (Expo)
- **Database**: SQLite (via `better-sqlite3` and `react-native-quick-sqlite`)
- **Network Tunnels**: Cloudflare Zero Trust (Tunnels)
