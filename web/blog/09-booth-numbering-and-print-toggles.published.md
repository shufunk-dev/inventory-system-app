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
