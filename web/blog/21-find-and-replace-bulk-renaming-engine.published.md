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
