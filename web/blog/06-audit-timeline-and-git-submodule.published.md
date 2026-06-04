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
