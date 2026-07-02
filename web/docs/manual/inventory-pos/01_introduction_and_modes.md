# Introduction and Operating Modes

Welcome to the Inventory & POS System documentation. This system is designed to provide seamless inventory tracking, AI-powered cataloging, point-of-sale functionality, and valuation tools. The system can operate in two distinct modes tailored to your operational needs.

---

## 1. Dual Operating Modes

The system offers a flexible configuration that adapts to different business scales. You can toggle between these modes in the Settings module.

### A. Personal (Collector) Mode
Designed for individual collectors, hobbyists, or single-location operators who do not require complex store partitioning or multi-booth overhead.
* **Scope**: Single-catalog management without store partitions.
* **Specialized Collection Modules**:
  * **General Music Archives**: Track Vinyl records, CDs, Cassettes, and 8-Tracks with auto-populating pressing metrics and matrix runouts.
  * **Retro Computing & Hardware**: Log legacy computers and parts with automatic specification lookups (CPU, GPU, RAM, hard drive health).
  * **Tools & Workshop Inventory**: Track workshop tools, purchase dates, warranty info, and assigned workbench locations (e.g. Desk 2).
* **Features**: Full access to AI scanning pipelines, local valuation, and receipt generation.
* **Data Isolation**: All items exist in a global catalog. No user assignments or vendor restrictions are enforced.

### B. Store (Commercial) Mode
Designed for multi-vendor malls, antique booths, consignments, or multi-location retail stores.
* **Scope**: Multi-store partitioning.
* **Features**: Assign items to specific booths/stores, track vendor commissions, run independent registers, and restrict user roles (e.g., Guest, Clerk, Manager, Admin).
* **Data Isolation**: Users are assigned to specific stores. Clerks only see and edit items assigned to their active stores.

---

## 2. Licensing and Activation

The application uses a license validation engine to unlock premium cloud features, including advanced AI barcode resolution and live price syncing.

### A. License Tiers
* **Community Edition (Free)**: Access to local database management, standard barcode lookup (OpenFoodFacts, basic book databases), and manual valuation.
* **Professional Edition**: Unlocks premium API connections, multi-store support, multi-device sync, and custom CSV imports.
* **Enterprise Edition**: Adds dedicated database connections, custom receipt branding, API access, and advanced OCR pipeline capacity.

### B. Activation Process
1. Navigate to the **Settings** page.
2. Enter your license key in the Activation panel.
3. The system validates the key against our license authority server and stores an encrypted token locally.
4. Once verified, cloud pipelines (like SerpApi Google Lens and PriceCharting integration) become active.

---

## 3. Switching and Setup

Transitioning between Personal and Store Mode is safe and does not delete your items, but you should configure store profiles before switching.

### Steps to Transition:
1. Ensure you have Admin level access.
2. Go to **Settings** > **System Configuration**.
3. Toggle the **Store Mode** option.
4. If enabling Store Mode, define your first Store Profile:
   * Provide a unique Store Name.
   * Configure receipt templates and tax settings.
   * Assign managers/clerks.
5. Save the configuration. The application layout will refresh, showing the Store Selector in the navigation bar.

---

## 4. Hardware Locking & Device Recovery

To secure premium cloud features, your license key is bound to the physical hardware of your device using a unique **Machine ID**. 

### A. Seat Limits
* Standard retail license keys allow activation on **1 device seat**.
* Custom business or enterprise plans can support **multi-seat activations** (e.g., 3, 5, 10, or more devices simultaneously).

### B. Moving to a New Device (PC Migration or Failure Recovery)
In local-first mode, your entire catalog and configuration are stored inside your local SQLite database folder. If your computer malfunctions or you upgrade to a new PC:
1. **Drop-in Database Restore**: Simply install a fresh copy of the app on your new device and copy/drag-and-drop your old database folder into the new app directory.
2. **Instant Restoration**: Because the database contains your accounts and configuration, you will be logged in immediately without running the onboarding setup wizard.
3. **Key Retrieval**: The app will automatically retrieve your existing license key from your database settings.

### C. Deactivating Old Devices & 7-Day Cooldown
Since the new computer has a different Machine ID, the licensing server will perform a check-in:
* If you have an **available seat** on your license key, the new computer registers automatically and activates.
* If you are **at your seat limit**, the app will display a device selection screen showing your currently active hardware (identified by hostname and username).
* Simply select your old/broken computer from the list and click **Deactivate** to free up the seat. The new PC will activate immediately.
* **Security Cooldown**: To prevent key sharing, a **7-day cooldown** is enforced on the license key after any device deactivation before another device can be removed.

