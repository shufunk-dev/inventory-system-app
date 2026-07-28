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
