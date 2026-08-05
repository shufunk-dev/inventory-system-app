# Inventory System - Complete Developer Journal & Engineering Notes

> **Physical Copy Edition** | Total Journal Entries: 23

## Table of Contents

1. [Building the Foundation: An AI-Driven Inventory System](#entry-01)
2. [The Alpha Journey: From Concept to Beta 1.0](#entry-02)
3. [From Prototype to Powerhouse: Expanding the Multi-Asset AI Ecosystem](#entry-03)
4. [Afternoon Sprint: Comic Books & Smarter AI](#entry-04)
5. [Building a Secure Multi-Tenant SaaS Architecture for Local-First Databases](#entry-05)
6. [Securing Onboarding, Scaling Ingestion, & Structuring the Mobile Submodule](#entry-06)
7. [Antique Mall Aggregator: Multi-Booth Sales Payouts, Locked Routing, & Thermal Receipts](#entry-07)
8. [Offline Trials, Bulletproof Self-Destruct, & SaaS Cloud Demo Mode](#entry-08)
9. [Release Update: Beta 1.8.1 — Clean Layouts & Sequential Booth Numbering](#entry-09)
10. [Release Update: Beta 1.8.4 — Direct Mobile Sync & Bearer Authentication](#entry-10)
11. [Release Update: Beta 1.8.5 — Shared Catalog Scoping & Appliance Onboarding Refinements](#entry-11)
12. [Release Update: Beta 1.8.6 — Cryptographic Remote Support Tokens & Security Hardening](#entry-12)
13. [Guarding Quotas and Scoping Locations: Launching v1.8.8](#entry-13)
14. [Self-Hosted SearXNG Integration & Background Worker Stabilization](#entry-14)
15. [Licensing Compliance & Commercial-Safe Metadata Resolution](#entry-15)
16. [Release Beta 1.9.0: Music, Retro Computing, and Tools Inventory Modules](#entry-16)
17. [Release v1.9.2: Widescreen Tablet POS registers, Dynamic QR Codes, Sync Tunnels & ESC/POS Thermal Printing](#entry-17)
18. [Release v1.9.4: Video Game Console Systems, Customizable Movie Formats, and Dashboard Bulk Renaming](#entry-18)
19. [Release v1.9.4: Cash Register Checkout Modal, Receipt Tender Breakdowns, Card Brand Display & Model Upgrades](#entry-19)
20. [Release v1.9.6: Bottles & Cans Engine, Custom Folder ZIP Imports, & Recursive Category Deletion](#entry-20)
21. [Release v1.9.7: Find & Replace Bulk Renaming Engine & Substring Matching](#entry-21)
22. [SearXNG Engine Stabilization, Year-Number Filters & Market Value Optimizations](#entry-22)
23. [Release v1.9.8: Direct eBay REST API Integration & Universal Category Valuation Engine](#entry-23)



---

<a id="entry-01"></a>
> **Entry #01** | Original File: `01-building-the-foundation.published.md`

# Building the Foundation: An AI-Driven Inventory System

Welcome to the developer journal! This project started as a simple idea: what if we could take pictures of items and have an AI automatically categorize, tag, and build an inventory system for us?

## The Stack
We decided to build this using a modern, robust architecture:
- **Next.js 16** for the web dashboard and backend API.
- **SQLite** for a fast, portable database that requires zero configuration.
- **React Native (Expo)** for the mobile application.

## The Journey So Far
In our first major sprint, we tackled some incredibly complex challenges:
1. We built a background worker pipeline that queues images and sends them to Google Lens and Numista APIs.
2. We conquered multi-tenancy in SQLite, ensuring that when the software is distributed, each user gets their own isolated categories without hitting global constraint errors.
3. We implemented a sleek "Root Backdoor" architecture, ensuring the original developer maintains absolute control over the appliance no matter where it is deployed.

Stay tuned as we continue to push the boundaries of what this system can do!


---

<a id="entry-02"></a>
> **Entry #02** | Original File: `02-the-alpha-journey.published.md`

# The Alpha Journey: From Concept to Beta 1.0

Building an automated, AI-driven inventory system is no small feat. What started on May 24th as a basic proof of concept quickly exploded into a massive, full-stack ecosystem. This is the story of our Alpha development phase and how we reached Beta 1.0 in less than a week.

## Phase 1: The Foundation
The very first day was all about laying the groundwork. We needed a way to scan items rapidly without being tethered to a computer. We built a custom **React Native (Expo)** mobile application designed specifically for speed. The scanner allowed us to rapidly capture barcodes and snap front/back photos, queuing them all up on the device even without internet.

On the backend, we spun up a lightning-fast **Next.js 16** web application powered by **SQLite**. We chose SQLite because we wanted the entire system to be completely portable—a true "appliance" that didn't rely on massive external cloud databases.

## Phase 2: The Brain (AI Integrations)
An inventory system is useless if you have to type out every single description manually. We built a background worker pipeline and plugged the system into multiple AI engines:
1. **UPCItemDB** to instantly pull product metadata using barcodes.
2. **Google Cloud Vision API** as a failover to read text and detect logos right off the box art if a barcode scan failed.
3. **Smart Retry Queues** to handle API rate limiting smoothly so the server would never crash under a heavy load of incoming scans.

## Phase 3: The Specialized Modes
We quickly realized that scanning a standard box of toys is very different from scanning a rare coin. We introduced specialized capture modes: **Coin Mode** and **Toy Mode**.
To power Coin Mode, we integrated the **Numista API**, allowing the app to cross-reference images with the world's largest numismatic database. For standard items, we integrated **SerpApi's Google Lens**, bringing world-class visual search capabilities directly into our local dashboard.

## Phase 4: Security and Polish
As we approached the end of the Alpha phase, we needed to make the software ready for actual users. We built:
- An infinite-depth subcategory system.
- An intuitive Admin Control Panel.
- A "Self-Bootstrapping" registration system that automatically secures the ecosystem upon the very first boot.

By May 29th, all of these pieces clicked together flawlessly. We had successfully built an autonomous pipeline: you snap a photo on the mobile app, and moments later, a fully categorized, highly-detailed product listing appears on the web dashboard. 

The Alpha journey was wild, but it successfully proved that this AI-driven inventory ecosystem works. Welcome to Beta 1.0!


---

<a id="entry-03"></a>
> **Entry #03** | Original File: `03-From-Prototype-to-Powerhouse.published.md`

# From Prototype to Powerhouse: Expanding the Multi-Asset AI Ecosystem

What a day it has been. We went into today’s development session with a solid, functioning inventory tracker—but what we walked away with is an absolute powerhouse of a multi-asset intelligence system.

Here is a look back at the sheer volume of engineering, architecture, and AI integration we accomplished in just one day.

## 1. Mastering the Toys Domain 🧸
We recognized early on that toys are not standard items. The condition of a vintage action figure drastically changes its market value. 

To handle this, we ripped out the generic logic and built a dedicated **Toy Mode**:
- **Granular Condition Modeling**: We implemented radio-button logic for specific toy states (Mint in Box, Loose, Missing Parts, etc.).
- **Dynamic Valuation Engine**: We wrote a background AI worker that queries Google Shopping to fetch precise, real-time market value averages based *specifically* on the toy’s condition.
- **The Toy Details Widget**: We built a custom UI component allowing for beautiful, inline "Quick Edits" of the toy's brand, year, and condition—automatically recalculating the live market value the exact moment you hit save.

## 2. Numismatic Precision: The Coins Domain 🪙
Coin collectors require extreme precision. A generic "Good" or "Bad" condition doesn't cut it. 

We completely overhauled our coin architecture to support the **Sheldon Coin Grading Scale** (from PO-1 all the way to MS-70). But we didn’t stop at just recording the grade:
- **Slab Barcode Scraping**: When you use the mobile app’s Coin Mode to scan the barcode on a PCGS or NGC graded slab, our background AI worker intercepts it. Instead of a generic lookup, the worker uses SerpApi to run a targeted Google Search against the certification database, effectively scraping the official coin name, grading agency, and extreme details straight from the text snippet!
- **Coin Details Widget**: Just like toys, coins got their own tailored UI widget for managing certification numbers, grading agencies, and live market valuation.

## 3. Lights, Camera, Action: The Movies Domain 🎬
We introduced a completely new domain into the ecosystem: **Videos and Movies**.
- When the system detects a movie scan, the AI automatically queries the IMDb Knowledge Graph. 
- It extracts the full cast list, the plot summary, and even embeds a playable YouTube trailer directly into the item's dashboard page.

## 4. The WordPress Mirror: Going Public 🌐
Perhaps the biggest architectural leap of the day was taking our private, local inventory and connecting it to the world.
- We built a custom **WordPress Mirror API** directly into our Next.js backend.
- This creates an autonomous web bridge that syncs your local SQLite database out to a public-facing WordPress site. It means that as you scan items in your private collection, they can instantly and seamlessly populate a public catalog or storefront without any double data-entry.

## 5. Polishing the Foundation 🛠️
Beyond the major features, we spent significant time bulletproofing the ecosystem:
- Fixed React hydration crashes caused by third-party browser extensions (we're looking at you, password managers!).
- Rebuilt empty-states across the app, ensuring that items without market values gracefully display "Not Calculated" with a seamless one-click recalculation button.
- Hardened the mobile-to-web synchronization pipeline.

## What’s Next?
We have successfully transformed this platform from a basic barcode scanner into a highly intelligent, domain-aware asset manager. 

With the mobile app and web app currently firing on all cylinders, there's only one major frontier left to cross on our roadmap: compiling the entire ecosystem into a **Bootable Linux "Inventory Appliance."**

But for now? I think we’ve earned a break!


---

<a id="entry-04"></a>
> **Entry #04** | Original File: `04-afternoon-sprint.published.md`

# Afternoon Sprint: Comic Books & Smarter AI

We wrapped up the afternoon by tackling some incredibly complex edge cases in both our asset domains and our AI logic.

## 1. The Comics Domain & Deep AI Refinements 🦸‍♂️
We conquered the **Comic Books** domain. Comics present a unique challenge because grading scales (CGC, CBCS) are highly standardized, but a massive portion of the market relies on "Raw / Ungraded" values. 
- **Dual Engine Pipeline**: We built a Comic Book Engine that utilizes both OCR and Google Lens to accurately identify obscure variant covers and issues.
- **Raw Market Valuation**: We bridged the Google Shopping API to dynamically calculate real-time market averages for loose, ungraded comics based on standard market perceptions rather than strict numeric grades.
- **Comic Book Details Widget**: We created a tailored frontend component for managing publisher, issue number, grading agency, and certification numbers.

## 2. Intelligent AI Fallbacks & UI Overhaul 🧠
As our AI capabilities expanded, the dashboard became cluttered with experimental buttons. 
- **AI Pipeline Engine**: We refactored the entire system into a sleek, unified dropdown menu, allowing users to seamlessly switch between Standard Web Search, Premium Image Lens, and experimental domain-specific AI pipelines (like Coin Mode or Comic Mode).
- **Synthesized Product Extraction**: We dramatically enhanced the "Basic / Standard" Google Vision AI. Instead of giving up when it encounters a generic object (like a "Glass Bottle"), the AI now intelligently cross-references any detected Logos with the vertical stack of OCR text on the product. It automatically combines these discrete clues into a highly robust, fully descriptive product name (e.g., automatically stitching the logo "Bawls" with the words "Guarana" and "Original" to create a perfect name).

We are officially at version **Beta 1.3** and firing on all cylinders! Next stop: compiling the entire ecosystem into a Bootable Linux Appliance.


---

<a id="entry-05"></a>
> **Entry #05** | Original File: `saas-multitenancy-and-security.published.md`

# Building a Secure Multi-Tenant SaaS Architecture for Local-First Databases

In this update, we made massive architectural leaps to prepare our local-first catalog and inventory app for a fully managed SaaS hosting tier. Here is how we designed and implemented dynamic database routing, offline-first licensing, and robust security upgrades.

---

## The SaaS Goal: Cost Efficiency & Strict Isolation

To provide a fully managed SaaS cloud tier for non-technical users, we needed a remote server configuration. However, spinning up separate Next.js instances and database containers for every new customer is extremely expensive and makes code updates difficult.

Instead, we chose the **Hybrid SQLite Model (Shared Server, Separate Databases)**:
*   **One Next.js Server**: Serves all customer requests from a single codebase.
*   **Isolated Database Files**: Every tenant gets their own physical SQLite database (e.g. `tenant_abc.sqlite`). This provides 100% data separation with near-zero hosting overhead.

To support this, we built a custom connection pool manager (`dbManager.js`) that dynamically opens database connections based on session headers or cookies and automatically closes connections that have been idle for longer than 5 minutes to release server resources.

---

## Offline-First Product Licensing

Because the app is designed to run offline on local devices (like Raspberry Pi appliances or laptops), we cannot rely on an active internet server to check subscription states. 

We built a cryptographic, offline-first product key system (`license.js`):
1.  **Prefix-mapped modes**: Product keys dictate features—`COLL` activates Collector Mode (simplified inventory logs), and `STOR` activates Retail Store POS Mode (cash registers, receipts, employee shifts).
2.  **SHA-256 HMAC Signatures**: Keys are verified mathematically using a private environment salt, preventing users from forging license codes.

---

## First-Boot Setup Wizard & Redirect Gates

We hardened the app by deleting a hardcoded root backdoor (`shufunk@gmail.com`) that was previously used for admin bootstrapping. 

Now, when a user boots the app for the first time:
*   The database starts with 0 users.
*   Next.js server layouts detect the clean install and redirect all requests automatically to the `/setup` wizard.
*   The user registers their admin credentials and enters their license key. The server dynamically grants them Root privileges and provisions their isolated database file.

---

## Secure Support: Option A (Super Admin Login)

To allow remote troubleshooting without checking backdoor accounts into public GitHub repositories:
*   We wrote a login interceptor that checks inputs against the environment variables `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_HASH`.
*   On a match, the server generates a virtual user profile directly from the decrypted session token, bypassing local database lookups and letting support agents view the store database seamlessly.

---

## 100% Validated

We wrote a full integration testing suite to check for edge cases, path resolutions, and concurrent writes. We fired parallel transactions using matching primary keys simultaneously across separate databases and confirmed **100% data isolation with zero leakage or lock crashes**. All 13 tests passed successfully.

Stay tuned for our next update where we tackle NCR Aloha POS sales log ingestion!


---

<a id="entry-06"></a>
> **Entry #06** | Original File: `06-audit-timeline-and-git-submodule.published.md`

# Securing Onboarding, Scaling Ingestion, & Structuring the Mobile Submodule

It has been a massive day of architecture, security hardening, and database optimization. Today, we shifted gears from cataloging individual assets to building robust operational tools—securing the system boundaries for SaaS deployment, scaling stock count ingestion, and structuring the codebase for independent mobile development.

Here is a look at what we engineered today:

## 1. SaaS Multi-Tenancy & Setup Gates (Beta 1.5.2)
To lay the foundation for hosted commercial operations, we introduced:
* **Tenant Database Isolation**: A dynamic SQLite manager that routes database connections per tenant on the fly, keeping client data completely segregated.
* **Onboarding Setup Wizard (`/setup`)**: On first boot, the system redirects to a setup page requiring a **Product License Key**. The page validates **Type A (Collector)** or **Type B (Retail Store)** license keys entirely offline using secure SHA-256 HMAC checksums before unlocking the app.

## 2. Ingestion Auditor & Fluid Math (Beta 1.6.0)
We built a physical count spreadsheet uploader that ingests PDF/TXT sheets directly from the browser:
* **Dynamic Vendor Boundaries**: The parser automatically routes items into their respective distributors (*Barringer*, *Caffey*, or *Pepsi Co*) based on brand names.
* **Layout Auto-Correction**: The parser detects soda sheets to swap quantity and cost columns automatically, resolving layout variances.
* **Fluid Volume Math**: Converts bottle tare weights, sizes, and specific gravity values into precise fluid ounces.
* **Merge-on-Date**: Reuses count sessions on matching dates, updating overlapping brand quantities to make sheet corrections simple.

## 3. History Timeline & Interactive Filters
To track stock levels chronologically:
* **Timeline Mode**: Switches from side-by-side count comparisons to a matrix showing progression of brand quantities and asset values side-by-side.
* **Bulk Date Filters**: To prevent dashboard clutter over dozens of audit dates, we added quick filters—**Select All**, **Clear All**, **Last 5**, and **Last 10**—coupled with selection memory so your view settings aren't lost when refreshing.

## 4. BLE Scale Archival & Git Submodules
To optimize code weight and prepare for Git commits:
* **BLE Scale Archival**: Moved the mock BLE scale simulation page and calculations to a dedicated `/Archive` directory, keeping the core Next.js production build lean.
* **Scanner Repository Segmentation**: Moved the React Native camera scanner code into its own dedicated repository, **`inventory-system-mobile-scanner`**, and registered it as a Git Submodule using `.gitmodules`. Clicking the mobile folder on GitHub now links directly to the scanner codebase.


---

<a id="entry-07"></a>
> **Entry #07** | Original File: `07-multi-booth-sales-routing.published.md`

# Antique Mall Aggregator: Multi-Booth Sales Payouts, Locked Routing, & Thermal Receipts

We have successfully wrapped up a massive development sprint, transforming the inventory tracker into a full-scale local-first aggregator tailored specifically for physical antique malls and multi-booth store environments. 

Here is a breakdown of the database architectures, routing protocols, and custom register print engines we designed and deployed.

---

## 1. Multi-Booth User Assignment & Context Locking
In an antique mall setup, booth vendors must log into the system to manage their own catalogs while being strictly gated from viewing or modifying other vendors' data.
* **Comma-Separated Access Mapping**: We updated the user management database schema to support comma-separated store IDs. Admins can now assign a vendor to one or multiple booths simultaneously.
* **Context Auto-Routing**: Refactored the database connection resolver to dynamically intercept the user session. If a restricted user logs in, the backend locks their context, bypasses the master database, and routes them to their specific booth database file (`store_[id].sqlite`).
* **Dropdown Gating**: We updated the header store selector. Unrestricted admins see the entire mall catalog and a switcher dropdown. Restricted vendors only see a locked badge of their assigned booth or a filtered switcher showing only their permitted booths, completely hiding the global catalog.

---

## 2. Cross-Store Sales Attribution & Payouts Reporting
The central checkout register scans items from all booths. The scanner captures either a vendor's custom-printed barcode (containing a unique item UUID) or the manufacturer's original UPC.
* **Dual ID Cross-Referencing**: We designed a central attribution engine in `/api/admin/sales-report` that maps sold register items to the correct vendor by scanning booth databases for matches on both the internal item ID (UUID) and the manufacturer UPC barcode.
* **Unattributed Sales**: Scans that cannot be matched to any vendor catalog are categorized as "Direct / Unattributed Sales" (e.g., direct mall register sales).
* **Expanding Payout Sheets**: Admins get an expandable breakdown drawer detailing total units sold, gross sales revenue, and net vendor payouts after mall commission fees.

---

## 3. Adhesive Labels & Receipt Printing Hub
To support checkout cashiers and vendor tag printing:
* **The Receipt Printing Hub**: We built a register print module at `/receipt` that pulls active checkout items, computes sales tax, and attributes booth names inline on each line item.
* **Dual Layout Render Engine**:
  * **Thermal Roll (80mm)**: Generates a monospaced checkout printout styled with dotted partition dividers, optimized for thermal receipt printers.
  * **Letter Invoice**: Generates standard business-size bills.
* **Adhesive Barcode Labels**: Vendors can instantly print price tags for their items. The tag dynamically outputs the mall name, booth number, a 20-character shortened item name, price, and barcode.

---

## 4. Database Schema Upgrades & Test Mocking
To guarantee the new local-first multi-store architectures are stable:
* **TEXT Primary Keys**: Migrated `pos_items.itemNum` from `INTEGER` to `TEXT` primary keys. This ensures SQLite does not truncate leading zeros on standard manufacturer UPCs (like `000767...`) and correctly processes alphanumeric UUIDs.
* **Automated Cookie Mocking**: Mocked Next.js 15+ async `cookies()` headers inside our test runner environment. This allows testing authenticated API endpoints offline without browser instances.
* **Image Cleanup on Deletion**: Updated the item deletion API to check the database for `imagePath` and `imagePathBack` and delete the physical files from the local `/uploads/` folder, preventing disk space leaks.

---

## What’s Next
With the multi-store sales aggregation, user access gating, and receipt printing hub complete, the platform is now fully equipped for physical store testing. All 28 automated integration tests pass with 100% success.


---

<a id="entry-08"></a>
> **Entry #08** | Original File: `08-offline-trials-and-demo-resets.published.md`

# Offline Trials, Bulletproof Self-Destruct, & SaaS Cloud Demo Mode

Today marks another major engineering milestone for the Inventory System. We focused heavily on commercial viability, user onboarding, and system security—bridging the gap between local desktop installations and cloud-hosted SaaS environments.

Here is a breakdown of the robust features introduced in our latest release (Beta 1.8.0):

## 1. Offline Trial Activation Keys 🔑
We built a dynamic, cryptographic license validation mechanism that operates 100% offline. 
* **Retail Store Mode Mapping**: Users can input a 7-day premium trial key (`TRIA-7777-7042-18B0`) during the onboarding wizard. The setup engine validates the key's SHA-256 checksum and immediately grants full access to Premium Retail Store Mode features.
* **Frictionless Local Testing**: This allows users to experience the desktop software locally on their own machines without requiring database connections to a remote license server.

## 2. Bulletproof Transactional Self-Destruct 🛡️
Security and IP protection are critical. When a trial key expires, the application is designed to trigger a factory reset, instantly wiping all user data, categories, and item records.
* **Bypassing Windows File Locking**: In local testing, standard file unlinking (`fs.unlinkSync`) would occasionally fail on Windows with `EBUSY` resource locks because the active SQLite connection handle was still held open by concurrent request processes.
* **Transactional Purging**: To solve this, we engineered a transactional database wiper fallback. The self-destruct mechanism queries the SQLite master schema, loops through all tables, and transactionally executes `DELETE FROM` queries. This guarantees immediate data wiping even if Windows blocks the deletion of the physical database file!

## 3. SaaS Cloud Demo Mode with Daily Resets ☁️
To showcase the application to the public, we created a cloud demonstration wrapper (`DEMO_MODE=true`).
* **Instant Onboarding**: Demo users can sign up without SMTP email verification delays—their virtual accounts are activated immediately.
* **Midnight Cleanup Resets**: To keep the demo environment clean and prevent spam accumulation, we implemented an automated daily reset system. Every night at midnight, the system wipes all subsequent tenant accounts and uploaded image files while intelligently preserving the original base tenant and assets.

## 4. Total Verification & Test Coverage 🧪
To guarantee that these critical systems—validation, onboarding, database self-destruct, and daily demo resets—operate seamlessly under high concurrency, we added a comprehensive integration testing suite. The entire application now boasts 100% test coverage across all core features.

With these features live and verified, our offline setup installer is officially prepared for public testing. Next up, we shift our focus back to our core platform capabilities. Onward!


---

<a id="entry-09"></a>
> **Entry #09** | Original File: `09-booth-numbering-and-print-toggles.published.md`

# Release Update: Beta 1.8.1 — Clean Layouts & Sequential Booth Numbering

We are excited to announce the release of **Beta 1.8.1**, a quality-of-life update focused on enhancing the barcode printing layout and streamlining store profile organization. If you are running the native desktop app, the version 1.8.1 update is now compiled and ready to download.

Here is a breakdown of what's new in this release:

## 1. Automatic & Sequential Booth Numbering 🪙
Managing multiple stores or booths inside a single inventory database just got a whole lot cleaner. 
- **Chronological Database Migrations**: When updating to 1.8.1, the system automatically checks your existing store profiles. It orders them by creation date and assigns zero-padded 3-digit booth numbers starting from `001` (so your very first store automatically maps to `001`, the next to `002`, and so on).
- **Auto-Calculated Creation**: When adding a new store profile via the administrator panel, the system dynamically queries the highest existing booth number, increments it, pads it (e.g. `003`), and saves it to the database.

## 2. Print Settings Layout Toggle: Name vs. Number 🖨️
Depending on your label size, space can be at a premium. Showing full business names on tiny sticker labels can lead to overlap and text clipping.
- **Show Booth Number Toggle**: In the bulk barcode print settings panel, you can now toggle **"Show Booth Number instead of Name"**.
- **Dynamic Render**: When enabled, the print sheets (Avery 5160, 5167, 5161) and continuous thermal rolls will render `Booth 001` instead of your full store name (e.g. `Mena Coins`). If disabled, it falls back to displaying the full store name.

## 3. Clutter-Free Price Tags 🏷️
- The single-item barcode tag widget has been refactored to automatically prioritize the clean, zero-padded `Booth {number}` display (e.g., `Booth 001`) if it is available. This reduces visual clutter and prevents long store names from overlapping with the item's barcode or title.

## 4. Solid Testing & Native EXE Release
- We added automated test coverages for these database auto-migrations and creation route queries. The entire test suite was successfully verified with 100% passing rates.
- The standalone desktop executable installer is fully compiled and ready.

*Version 1.8.1 is now live in the repository and available for packaging!*


---

<a id="entry-10"></a>
> **Entry #10** | Original File: `10-direct-mobile-sync.published.md`

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


---

<a id="entry-11"></a>
> **Entry #11** | Original File: `11-shared-catalog-and-appliance-refinements.published.md`

# Release Update: Beta 1.8.5 — Shared Catalog Scoping & Appliance Onboarding Refinements

We are excited to announce the release of **Beta 1.8.5**, focusing on multi-user inventory collaboration, setup security enforcement, and Linux appliance setups.

Here is a breakdown of what's new in this release:

## 1. Unified Shared Catalog (Removal of Individual User Filtering) 🤝
To support antique malls and collaborative storefront environments:
* **Collaborative Database Access:** We removed individual `userId` filters from all core inventory query routes (including categories, audit lists, recipes, CSV exports, and main dashboard panels).
* **Multi-User Visibility:** Managers, owners, and staff can now see and query scans, categories, and physical audit counts created by all authorized users in the same store or tenant database context.
* **Audit Trail Retention:** The `userId` of the creator is still saved on insertions to maintain a clear audit trail for the sync queue and database records.

## 2. Onboarding Gates & Setup Redirection Wizard 🔒
* **Redirect Locks:** Implemented redirection gates that automatically force-redirect unconfigured backend servers directly to the `/setup` onboarding wizard upon first boot, ensuring that credentials and offline license keys are set up before accessing dashboard tools.

## 3. Appliance Setup Bootstrapping ⚙️
We updated the Linux installation setup scripts (`setup-appliance.sh` and `appliance-setup.sh`) to turn any Ubuntu/Raspberry Pi server into a dedicated inventory appliance:
* **Automatic Updates:** Configured automatic npm package checking to automatically pull and sync dependency builds.
* **Pi swap-space Guidelines:** Added configuration checklists and manuals troubleshooting swap-space allocations (mandating a minimum of 1GB swap space) to prevent compiler crashes on low-RAM Raspberry Pi boards during production builds.

## 4. Test Suite Throttling Fixes 🧪
* **Trial Fixes:** Added explicit test-mode overrides in `tests/trial.test.js` to ensure the cryptographic trial key check does not throttle or self-destruct during automation testing.
* **All Tests Passed:** 100% test success across all 36 test cases in the test runner suite.

*Version 1.8.5 is now fully live and compiled on GitHub!*


---

<a id="entry-12"></a>
> **Entry #12** | Original File: `12-cryptographic-support-tokens-and-security.published.md`

# Release Update: Beta 1.8.6 — Cryptographic Remote Support Tokens & Security Hardening

We are thrilled to announce the release of **Beta 1.8.6**, a security-focused feature update that introduces secure, offline-compatible **Cryptographic Remote Support Tokens (Asymmetric Support Access)**. 

This release officially deprecates and replaces insecure backdoors or shared root passwords, providing a premium, hardware-locked support portal for local systems and self-hosted environments.

Here is a breakdown of what's new in this release:

## 1. Cryptographic Asymmetric Support Access
* Support verification is now completely offline-compatible using the Elliptic Curve Digital Signature Algorithm (ECDSA) with the NIST P-256 curve (ES256).
* The local system contains a hardcoded developer public key. When a remote support token is imported, the system verifies that the token's digital signature matches the public key and that the token has not expired.

## 2. Hardware-Locked System Access (Machine Binding)
* To prevent support tokens from being reused across different installations, each token is cryptographically bound to the client's local **Machine ID** (derived from network MAC addresses). 
* The system matches the token's target ID against the local hardware node, ensuring it only unlocks on the intended machine.

## 3. Ephemeral Sessions (Auto-Expiration)
* Authorized support sessions do not write any persistent accounts or backdoor roles to the database.
* The API signs an ephemeral session cookie with a virtual `support-admin-session` user ID that automatically self-terminates after a maximum of **24 hours**.

## 4. Premium Support Portal UI & Login Integration
* **Dedicated Support Interface**: A new `/support` portal displays the client's local Machine ID with one-click copy buttons and a token entry input.
* **Sign-In Redirection**: A secure Remote Support Portal quick-link is integrated directly into the primary login screen footer.

---
*Version 1.8.6 is now fully live and compiled on GitHub!*


---

<a id="entry-13"></a>
> **Entry #13** | Original File: `13-google-pricing-safeguards-and-category-reports.published.md`

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


---

<a id="entry-14"></a>
> **Entry #14** | Original File: `14-searxng-self-hosting-and-worker-stabilization.published.md`

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


---

<a id="entry-15"></a>
> **Entry #15** | Original File: `15-compliance-and-licensing-tmdb-removal.published.md`

# Licensing Compliance & Commercial-Safe Metadata Resolution

Today, we took a major step toward making the Inventory System fully compliant and ready for commercial sale. To protect against potential licensing liabilities, we have completely removed the TMDB (The Movie Database) API integration and replaced it with keyless, commercial-safe alternatives using Wikipedia and YouTube search.

Here is a breakdown of our changes and why they make the application legally clear for commercial distribution.

---

## 1. The Compliance Challenge: TMDB Commercial Restrictions
During a review of our dependencies, we analyzed the TMDB API Terms of Use, which explicitly prohibit using their APIs in connection with a commercial application:
* *“Selling, leasing, or sublicensing the TMDB APIs, access to the TMDB APIs, or TMDB Content... is considered a commercial use and is only permitted under a separate written agreement.”*

Even though our system required users to supply their own personal TMDB keys, distributing an application containing built-in code targeting TMDB endpoints could still be flagged under their distribution terms. To eliminate this risk, we decided to purge all TMDB code and design a keyless, legally open metadata loop.

---

## 2. Migrating Movie Metadata to Wikipedia
Instead of calling TMDB, the background sync worker now queries the official **Wikipedia (MediaWiki) API** to fetch movie plots and cover images. 

We implemented this in a new helper function `fetchWikipediaMovieMetadata(name)`:
* **The Search Query**: It first searches Wikipedia for `${name} film` to identify the most accurate film article.
* **Details Fetching**: Once it has the article title, it requests the introduction extract (which acts as the movie plot summary) and the page's main image (which resolves to the high-resolution movie poster/cover).

**Why this is a major upgrade:**
* **Commercial Safety**: Wikipedia’s data is released under Creative Commons (CC-BY-SA) or the Public Domain, allowing commercial distribution.
* **Keyless Onboarding**: Users no longer need to register for, copy-paste, or maintain a TMDB API Key. Movie imports work automatically out of the box.

---

## 3. Resolving Movie Trailers via YouTube Organic Search
TMDB previously supplied YouTube trailer codes. We replaced this with a keyless search query using our existing **organic search pipeline**:
* We added a new `url` return field to our generic `fetchOrganicSearch` crawler.
* We created a helper `fetchYouTubeTrailer(name)` that searches the web for `${name} movie trailer youtube` using the user's configured organic search engine (either the self-hosted **SearXNG** instance or **Google Custom Search Engine**).
* It scans the search results and extracts the first valid YouTube watch URL, embedding it directly into the item detail record.

---

## 4. Cleaning up Settings and UI
With TMDB removed, we cleaned up the administration panel and API routes:
* **UI Cleanup**: We removed the *The Movie Database (TMDB) API Key* input field from the Settings page.
* **API Cleanups**: We removed `tmdbApiKey` from the backend settings configuration schemas (`/api/settings` GET and PUT routes).
* **Worker Cleanup**: We deleted all references to `process.env.TMDB_API_KEY` and the state-restoring environment logic in the background sync queue.

---

## 5. Implementing Unit Tests
To ensure the new Wikipedia and YouTube search integrations are robust, we created a new test suite at `web/tests/wikipedia-movie.test.js`. 

The test suite mocks `axios` web calls to:
* Validate that `fetchWikipediaMovieMetadata` queries Wikipedia search, resolves article pages, and correctly parses plots and thumbnail images.
* Validate that `fetchYouTubeTrailer` uses the organic search mapping to identify valid YouTube URLs.

All tests passed successfully:
```powershell
node --test tests/wikipedia-movie.test.js
```
```
▶ Wikipedia Movie Metadata & YouTube Trailer fetching
  ✔ fetchWikipediaMovieMetadata queries Wikipedia search and retrieve details/image (0.8853ms)
  ✔ fetchYouTubeTrailer finds youtube URLs in search results (1.5697ms)
  ✔ Cleanup and restore axios (0.1797ms)
✔ Wikipedia Movie Metadata & YouTube Trailer fetching (3.6609ms)
```

With these updates, the inventory system remains incredibly powerful, automatically enriching your scanned media catalogs with plots and artwork while keeping the codebase 100% compliant, keyless, and safe to sell.


---

<a id="entry-16"></a>
> **Entry #16** | Original File: `16-music-retro-tech-and-tools-inventory-modules.published.md`

# Release Beta 1.9.0: Music, Retro Computing, and Tools Inventory Modules

We are excited to announce the release of **Beta 1.9.0**! This is a major update that significantly expands the range of collections and assets you can track within the application. By consulting with our collector community, we have designed three new dedicated inventory modules: **Music Archives**, **Retro Computing & Hardware**, and **Tools & Workshop Inventory**. 

Here is a full breakdown of the features introduced in this release, along with how to use them with your mobile handheld scanner.

---

## 1. General Music Archives (Vinyl, Cassette, CD, 8-Track)
Whether you are tracking legacy vinyl pressings, classic cassettes, CDs, or vintage 8-tracks, our new **Music Archives** module is built to keep your audio physical media cataloged:
*   **Discogs API Integration**: We integrated the official Discogs Database API to resolve metadata. Scanned music barcodes automatically fetch the artist, album name, formats (e.g., LP, Album, Reissue, 180g), release year, pressing country, and high-resolution cover artwork.
*   **Media-Specific Attributes**: The database now tracks matrix runout engravings (vital for identifying specific pressings/runs), vinyl weights (e.g. 180g vs standard), and separate media & sleeve condition ratings (using the goldmine standard: M, NM, VG+, VG, G, P).
*   **Custom Token Support**: Administrators can save their personal Discogs API Token in the Admin Settings panel to query search indexes.

---

## 2. Retro Computing & Hardware Archives
For tech restorers and legacy collectors, cataloging old computers and individual parts is now incredibly easy:
*   **Automatic Spec Extraction**: The worker runs web specifications lookups against databases like EveryMac, CPU-World, and TechPowerUp to retrieve configuration metrics.
*   **CPU/GPU Auto-Detection**: The scraper parses queries and automatically classifies standard processors (such as Pentium, Celeron, Athlon, Xeon) as `CPU` types.
*   **Hardware Metrics**: Track serial numbers, BIOS/firmware versions, compatibility logs (e.g., *"Tested with antiX/Lubuntu 23.04"*), and hard drive SMART health diagnostics.

---

## 3. Tools & Workshop Inventory
Organizing the physical workshop tools used in your salvage or repair operations saves time and prevents lost items:
*   **Workstation/Desk Assignment**: Assign tools to specific workspaces (e.g., *"Soldering Iron on Desk 2"* or *"Multimeter in Storage Box A"*).
*   **Warranty Tracking**: Keep log profiles of purchase dates and warranty statuses.
*   **Popular Brand Mapping**: Automatically recognizes maker and tool brands (like Hakko, DeWalt, Milwaukee, Makita, Bosch, and Dremel) through scan OCR.

---

## 4. Mobile Handheld Scanner App Support
Our React Native companion app has been bumped to version 1.9.0 to support scanning into the new modules:
*   **Selector Dropdown**: A new dropdown menu offers `🎵 Music`, `🖥️ Retro Tech`, and `🔧 Tools & Workshop` scan modes.
*   **Intelligent Syncing**: Items scanned in these modes are automatically exported with their corresponding categories, triggering the backend worker to run the correct Discogs or hardware resolver.

---

## 5. Legally Compliant & Offline-Tested
Continuing our commitment to commercial licensing safety and quality:
*   **Mocked Tests**: Added three new automated unit test suites (`tests/discogs.test.js`, `tests/hardware.test.js`, and `tests/tool.test.js`) verifying the API mappings, defaults, and SQLite queries.
*   **Backwards Compatibility**: Ensured the SQLite parameter indices are preserved, allowing all existing 81 test cases across 21 test suites to run and pass with 100% success.

Enjoy organizing your new collections, and happy cataloging!


---

<a id="entry-17"></a>
> **Entry #17** | Original File: `17-pos-register-upgrades-and-tablet-layouts.published.md`

# Release v1.9.2: Widescreen Tablet POS registers, Dynamic QR Codes, Sync Tunnels & ESC/POS Thermal Printing

We are thrilled to announce the official release of **v1.9.2**, bringing a massive suite of features and register optimizations designed specifically for modern physical storefronts and countertop tablet cashier desks.

This update represents the culmination of a rigorous engineering phase focused on hardware connectivity, payment flexibility, offline training, and widescreen tablet register layouts. Here is a deep dive into what was built, shipped, and tested in this release cycle.

---

## 1. Countertop Card Reader Integration & Simulated Training Mode

To enable physical credit card payments directly at the cashier counter:
* **Terminal Gateway Integrations**: Created dedicated backend controllers for **Stripe Reader** and **Square Terminal** hardware, managing checkout requests, cancellation states, and polling APIs.
* **Webhook Receiver Hooks**: Added asynchronous webhook endpoints (`/api/pos/webhooks/stripe` and `/api/pos/webhooks/square`) to listen for transaction confirmations streamed from gateways.
* **Clerk Training Mode**: Designed an isolated cashier practicing state. When toggled, checkout requests bypass payment gateways, store transaction rows under a private `isTraining = 1` flag (keeping accounting files clean), and simulate a realistic **3-second card swipe delay** with complete checkout success and cancellation controls.

---

## 2. Dynamic Scan-to-Pay Mobile QR Codes

We’ve integrated dynamic client-facing QR checkout codes right on the register terminal screen:
* **PayPal & Venmo Configurations**: Store owners can input Venmo handles and PayPal emails in the settings panel.
* **Dynamic Deep-Linking**: The register dynamically generates and renders vector QR codes matching checkout totals and specific receipt numbers:
  * **Venmo Deep Link**: `venmo://paycharge?txn=pay&recipients=[Handle]&amount=[Total]&note=Receipt%20[No]`
  * **PayPal Payment**: `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=[Email]&amount=[Total]&currency_code=USD&item_name=Receipt%20[No]`
* Customers scan the vector QR image using their phone camera to instantly complete mobile payments, while cashiers mark it as paid on the screen to finalize.

---

## 3. Manual Catalog Filtering (No-Scanner Mode)

For checkout stands without active barcode scanners, or for ringing up booth items manually:
* Added a **Booth / Catalog filter selector** directly adjacent to the register catalog search bar.
* scopes queries specifically to default catalogs, direct mall sales, or individual booth vendor profiles.
* Scoped items can be rung up by typing matching names, item descriptions, or numeric UPC codes.

---

## 4. Managed Remote Sync & Cloud Tunnels

Connecting a local offline register database to the web (for offsite inventory audits, sales reports, and merchant dashboards) is now a single-click action:
* **Cloudflare Zero Trust integration**: Created a background spawner manager (`tunnelManager.js`) that runs and manages local `cloudflared` background processes.
* **Dynamic Subdomains**: Tunnels automatically fetch provisioned tokens and connect the local SQLite instance to custom secure subdomains like `https://[shop-id].shufunk-sync.com`.
* **Licensing Simulator**: Implemented a mock licensing validation server verifying subscription tiers and Stripe billing keys before establishing cloud links.

---

## 5. Optimized Countertop Tablet Register Layout

We redesigned the desktop register into a premium, responsive widescreen layout optimized for iPads and Android countertop tablets:
* **Accordion Configuration Header**: The large register configuration panel (mall metadata, printer styling modes) is now hidden behind a collapsible header accordion, starting collapsed by default on tablet screens to save vertical space.
* **Widescreen Catalog Grid**: The items catalog search grid scales dynamically to fill widescreen formats, rendering larger touch tiles with tactile click scales.
* **Interactive Touch Cart Workspace**: Swapped static printed receipt previews on the right with a full checkout sidebar, offering:
  * Large touch-friendly quantity modifier controls (`+` / `-`) and clear cart options.
  * Bold checkout action tiles: **Pay via Card**, **Pay via QR**, and **Print Customer Receipt**.

---

## 6. ESC/POS Direct Thermal Printing

Instead of opening standard, print-dialog-heavy browser windows (`window.print()`), cashiers can now stream receipts directly to thermal paper roll printers:
* **ESC/POS Binary Encoder**: Created `escposEncoder.js` to compile receipt details into formatted Latin1 binary command buffers (including double-size titles, column margins, auto-cuts, and cash drawer kicks).
* **Direct TCP Port Streaming**: Created a backend route (`/api/pos/print`) that opens raw sockets to print directly to network printers on Port 9100.
* **Background Checkouts**: If direct printing is enabled in settings, receipts print instantly in the background without launching browser dialog overlays, providing status alerts inside the register workspace.

---

## 🧪 Integration Verification

All integrations have been backed by extensive integration testing to guarantee high uptime:
* `tests/pos-card.test.js` (**8/8 Passed**): Verified checkout status flows, square cancellations, webhook processors, training mode delay overrides, and QR logging.
* `tests/sync-tunnel.test.js` (**3/3 Passed**): Asserted token masking, license key handshakes, and Cloudflare daemon lifecycle management.
* `tests/escpos-print.test.js` (**3/3 Passed**): Verified printer settings retrieval, ESC/POS byte sequence compilation, and print endpoint dispatchers.

This release represents a massive step forward in transforming our application into a state-of-the-art POS countertop platform!


---

<a id="entry-18"></a>
> **Entry #18** | Original File: `18-custom-game-systems-movie-formats-and-bulk-rename.published.md`

# Release v1.9.4: Video Game Console Systems, Customizable Movie Formats, and Dashboard Bulk Renaming

We are excited to announce the release of **v1.9.4**, bringing customizable configurations and bulk updates to retro video game collections and movie archives. This update delivers granular platform matching, bulk dashboard editing, and smarter visual OCR heuristics.

---

## 1. Video Game Console System Configurations
Store owners and collectors can now explicitly set the console system/platform for video games in their inventory:
* **Custom Console/Platform Registry**: Added a toggable checklist inside Account Settings containing 36 retro and modern consoles (NES, Sega Genesis, N64, Switch, PS1-PS5, Xbox, Atari, TurboGrafx, etc.). Checked systems populate the catalog dropdown list, keeping options clean and compact.
* **Granular PriceCharting Search**: The pricing search query builder now appends the exact selected console platform (e.g. `"Super Mario Bros. 3 NES video game price value pricecharting"`), bypassing generic search ambiguities and guaranteeing accurate price matches.
* **Auto-Platform Classification**: During photo uploads, OCR name resolver heuristics scan detected text for platform badges (e.g., `"NES"`, `"Genesis"`, `"Color"`) to automatically set the game's system, avoiding manual console entry.

---

## 2. Customizable Movie Formats
We have extended matching precision to video, DVD, and tape formats:
* **Format Configuration Options**: Added a toggable checklist for popular movie formats (VHS, DVD, Blu-ray, 4K Ultra HD, LaserDisc, BetaMax, VCD, HD DVD, and Digital Copy).
* **Format Details Badge**: The item details page renders a styled badge showing the specific movie format.
* **Auto-Format Detection**: Photo uploads check OCR content for format markers (e.g., `"VHS"`, `"DVD"`, `"laserdisc"`), pre-selecting them during visual ingestion.

---

## 3. Bulk Dashboard Assignments & Renaming
To handle large inventory imports efficiently:
* **Bulk Renaming Modal**: Selected dashboard items can be renamed in bulk via a scrollable list overlay, complete with thumbnail previews.
* **Bulk System Assignment**: Cashiers can select multiple items and click "Set System" to assign a game platform, automatically classifying them as video games and triggering a valuation re-sync.
* **Bulk Format Assignment**: Allows selecting multiple items and clicking "Set Format" to update the movie format in a single database transaction.

---

## 4. Google Vision OCR Heuristics Fixes
We fine-tuned the OCR text parsing worker to prevent mismatched names and incorrect fallbacks:
* **Label Exclusion Lists**: Stripped region ratings (NTSC, PAL, ESRB), network badges (Xbox Live, PSN), media packages (VHS tape, DVD cover), and legacy publisher logos from titles.
* **Non-Latin Character Rejector**: Discards Cyrillic, CJK, and Arabic strings when parsing English cover labels.
* **Prioritized Match Hierarchy**: Queries OCR title text first, followed by brand logos, web entity titles, and best guess labels.


---

<a id="entry-19"></a>
> **Entry #19** | Original File: `19-cash-checkout-receipt-breakdowns-and-gemini-3.6-upgrade.published.md`

# Release v1.9.4: Cash Register Checkout Modal, Receipt Tender Breakdowns, Card Brand Display & Model Upgrades

We are excited to present **v1.9.4**, a feature update centered around POS cash register workflows, explicit receipt tender breakdowns, card brand tracking, and AI model performance upgrades.

Whether handling cash payments with instant change calculation, capturing card brand and last 4 digits on receipts, or attributing impulse checkout items directly to vendor booths, this release elevates the countertop register experience.

---

## 1. Cash Register Checkout Modal & Tender Calculations

To provide cashiers with a seamless cash payment experience at checkout:
* **Pay via Cash Modal**: Added an interactive Cash Register Checkout modal accessible directly from top header controls and tablet register action grids.
* **Quick Tender Shortcuts**: Integrated quick cash tender buttons (`Exact`, `$20`, `$50`, `$100`) and custom tender input.
* **Live Change Calculation**: Computes exact change due to the customer in real-time as tender amounts are selected or typed.
* **Database Sales Recording**: Automatically inserts completed cash transaction records into `payment_transactions` under `provider = 'cash'`, ensuring all cash revenue is fully accounted for in sales reports.

---

## 2. Receipt Snapshot State & Render Synchronization

We resolved DOM rendering timing conflicts between state updates and browser print windows:
* **Completed Receipt Snapshot**: Created a `completedReceipt` frozen state object that retains all transaction data (line items, subtotal, tax rate, tax amount, total, payment method, cash tendered, change due, timestamp, and receipt number) after checkout.
* **Cart Reset Isolation**: Clearing the register cart for the next customer no longer wipes the on-screen receipt preview or printed ticket.
* **Async Print Scheduler**: Scheduled `window.print()` using a `150ms` execution delay to ensure React flushes DOM updates before the browser print dialog or thermal printer overlay opens.

---

## 3. Credit Card Brand & Last 4 Digits Tracking

Cashiers and customers can now verify which card was used for any credit card payment:
* **Terminal Status Polling**: Updated `/api/pos/checkout/status` to retrieve card brand and last 4 digits (e.g. `VISA ****4242`) from Stripe, Square, or training mode simulators.
* **Thermal & Invoice Receipts**: Rendered `CARD DETAILS: [BRAND] ****[LAST4]` across live thermal previews, standard letter invoice templates, and direct ESC/POS binary thermal printer streams.

---

## 4. Custom Line Items & Vendor Attribution

For impulse purchases at checkout (such as snacks, sodas, shopping bags, or unbarcoded booth items):
* **Custom Item Entry**: Cashiers can enter custom item names, prices, and attribute them to specific booth vendors or direct mall sales.
* **Automated Daily Vendor Sales**: Rung-up custom items automatically flow into vendor daily sales reports, payout calculations, and commission splits without manual entry.

---

## 5. Core AI Engine Upgrade

* Upgraded coding assistant and automation engine to **Gemini 3.6 Flash (Medium)**, boosting processing speed and reducing token consumption across developer workflows.

---

## 🧪 Verification & Build Status

All builds and tests compile cleanly with zero errors:
* Verified production build via `npm run build` using Next.js Turbopack compiler.
* Confirmed database transaction records, receipt snapshots, and ESC/POS thermal printing.


---

<a id="entry-20"></a>
> **Entry #20** | Original File: `20-bottles-and-cans-engine-custom-folder-zip-imports-and-recursive-category-deletion.published.md`

# Release v1.9.6: Bottles & Cans Engine, Custom Folder ZIP Imports, & Recursive Category Deletion

We are excited to announce **Release v1.9.6** of the Inventory System App! This update introduces a brand new **Bottles & Cans Engine**, intelligent **Custom Folder-Structured ZIP Importing**, extended **1GB Bulk Payload Limits**, and clean **Recursive Category Deletion**.

---

## 🍾 1. Dedicated Bottles & Cans Scanner Engine & Valuation
- Added a dedicated **Bottles, Cans & Glassware (`bottle`)** item type across the Web Dashboard, Single Upload forms, Valuation reports, and Mobile Handheld Scanner app.
- Integrated AI vision & market lookup prompts searching for antique glass bottles, soda/beer cans (flat tops, cone tops, pull tabs), milk bottles, mason jars, and insulator glass across online sold archives and eBay listings.
- Filter and monitor total portfolio value for glass bottles and vintage cans on the `/valuation` analytics page with teal visual badges.

---

## 📦 2. Custom Folder-Structured ZIP Importer & 1GB Payload Limits
- Standard `.zip` archives created manually (outside the mobile app) can now be imported directly into the system database.
- **Folders Become Categories**: Folder hierarchies automatically build top-level Categories and nested Subcategories.
- **Filenames Become Item Names**: File basenames automatically derive clean item names.
- **Increased Payload Limits**: Upload body limits bumped to **1GB (1000MB)** with 5-minute request processing timeouts for large photo archives.
- **Batch Item Type Designation**: Implemented an Item Type selector in the ZIP import modal so you can designate item types for entire file batches prior to extraction.
- **Automatic Background Worker Execution**: Custom ZIP imports now automatically queue with `syncStatus: "pending"`, triggering the AI background worker for instant market pricing upon upload completion.

---

## 🗑️ 3. Recursive Category Deletion
- Deleting a category now recursively deletes that category **and all subcategories linked underneath it** in one operation.
- Items previously assigned to deleted categories are automatically preserved as **Uncategorized** to prevent orphaned data.

---

## 📱 4. Mobile Scanner & Version Sync
- Added **Bottles & Cans Mode** to the handheld mobile scanner app mode selector.
- Version numbers bumped to **Beta 1.9.6** across Web navbar, POS receipt footers, Mobile Expo config, and Electron desktop binaries.


---

<a id="entry-21"></a>
> **Entry #21** | Original File: `21-find-and-replace-bulk-renaming-engine.published.md`

# Release v1.9.7: Find & Replace Bulk Renaming Engine & Substring Matching

We are excited to announce **Release v1.9.7** of the Inventory System App! This release introduces an intelligent **Find & Replace Bulk Renaming Engine**, allowing you to perform partial word and phrase replacements across your inventory item names to improve market value lookup accuracy.

---

## 🔍 1. Find & Replace Bulk Renaming Engine
- **Partial Substring Replacement**: Instantly search for specific words or terms (e.g. replacing `"coke"` with `"coca-cola"`) within item titles while preserving all surrounding text (e.g. `"75th anniversary coke bottle"` -> `"75th anniversary coca-cola bottle"`).
- **Match Case & Whole Word Controls**: Precision toggles to switch between case-sensitive matching and whole-word boundary filtering (`\b`).
- **Live Preview & Match Counters**: Preview updated item names in real-time with instant match counts before committing changes to the database.
- **One-Click Reset**: Easily reset items back to their original names prior to batch saving.

---

## 🛠️ 2. Market Pricing Optimization
- Standardized product titles (e.g., driver names, brand spellings, and official trademarks) significantly increase precision when running AI market value estimations and automated pricing web scrapers.

---

## 📱 3. Version Bump & System Alignment
- System version bumped to **Beta 1.9.7** across the Web Navbar, POS Receipt headers, Mobile Scanner Expo config, and Desktop Electron build manifests.


---

<a id="entry-22"></a>
> **Entry #22** | Original File: `22-searxng-engine-stabilization-and-market-value-optimizations.published.md`

# SearXNG Engine Stabilization, Year-Number Filters & Market Value Optimizations

We are excited to share a major update focusing on **SearXNG Engine Stabilization, Intelligent Year-Number Price Filtering, and Market Value Optimizations**! This update drastically improves market pricing accuracy and fixes connection issues during bulk inventory refreshes.

---

## ⚡ 1. SearXNG Engine Pacing & 10s Timeout Fixes
- **10-Second Engine Timeouts**: Updated `settings.yml` to increase SearXNG engine request timeouts from 3.0s to 10.0s, completely eliminating `httpx.ConnectTimeout` errors for DuckDuckGo, Bing, Yahoo, Startpage, and Qwant.
- **1000ms Request Pacing**: Added a 1-second pace delay between worker query executions to prevent search engines (Google, Startpage, Brave) from issuing CAPTCHA suspensions or rate-limiting IP addresses during bulk refreshes.
- **Container Health Warnings**: Added automatic `ECONNREFUSED` connection checks to log clear warnings in the console if the local SearXNG Docker container is stopped.
- **HTML Search Fallback**: Added automatic HTML search page parsing as a fallback if JSON API endpoints are disabled.

---

## 🎯 2. Intelligent Year-Number Price Filtering
- **Release Year Protection**: Fixed an issue where manufacturing/edition years in item titles (e.g. `1975`, `1998`, `1999`, `2001`, `2004`) were being extracted as `$1,999.00` price tags. Integer numbers between 1900 and 2035 are now recognized as dates rather than dollar values.
- **Preserving Exact Title Searches**: Queries for year-specific editions (e.g., `"1999 Coca Cola 600 Pace car"` vs `"2001 Coca Cola 600 Pace car"`) retain their full exact title for accurate active online listing lookups.
- **High-Value Item Preservation**: Ensured genuine high-end market prices (e.g., $12,000 for PSA-graded cards, rare uncirculated coins, or antique bottles) remain preserved in `valueHigh` without artificial caps.

---

## 🧹 3. Title Sanitization & Query Streamlining
- **Media Extension Stripping**: Implemented `sanitizeTitleForSearch` to automatically strip file extensions (`.MP`, `.MP4`, `.JPG`, `.PNG`) and bracketed file metadata before submitting search queries.
- **Loop Optimization**: Streamlined bottle, toy, video game, coin, comic, and card market value helpers to eliminate duplicate fallback query loops.


---

<a id="entry-23"></a>
> **Entry #23** | Original File: `23-ebay-rest-api-market-valuation-engine.published.md`

# Release v1.9.8: Direct eBay REST API Integration & Universal Category Valuation Engine

We are excited to announce **Release v1.9.8** of the Inventory System App! This release introduces direct integration with the **eBay REST API**, bringing real-time active listing market values (low, average, high) across all item categories, along with compliance webhook fixes and reverse-proxy support.

---

## 🛍️ 1. Direct eBay REST API Valuation Engine
- **Live Active Listing Lookups**: Direct REST API connection to eBay Browse API querying live active market listings for structured price averages and ranges.
- **Universal Category Pricing**: Updated all 12 item category pipelines (Movies, Video Games, Toys, Coins, Cards, Graded Assets, Comic Books, Music, Hardware, Tools, Bottles, and Generic Items) to safely parse low, average, and high market values into SQLite.
- **Clean Title Querying**: Automatically strips web-search modifier keywords (`ebay`, `price`, `movie ebay`) when querying the native eBay REST API to prevent zero-result listing failures.

---

## 🔒 2. eBay Deletion Notification Webhook & Reverse-Proxy Support
- **SHA-256 Challenge Verification**: Implemented eBay Marketplace Account Deletion Notification GET challenge handler complying with eBay GDPR compliance requirements.
- **Reverse Proxy & Tunnel Support**: Updated endpoint challenge URL generation to respect `x-forwarded-host` and `x-forwarded-proto` headers, supporting ngrok, Cloudflare Tunnels, and Vercel hosting.
- **Settings UI Guidance**: Added real-time environment detection in App Settings highlighting public HTTPS requirements and ngrok tunnel setup for local development.

---

## 📌 3. System Versioning & Build Manifest Updates
- System version bumped to **Beta 1.9.8** across the Web Navbar, POS Receipt headers, Mobile Scanner Expo config, and Desktop Electron build manifests.
