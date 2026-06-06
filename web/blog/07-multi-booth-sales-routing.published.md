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
