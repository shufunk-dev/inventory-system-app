# Release v2.0.0: Timed Sales Engine, Scheduled Promotions, Live Kiosks & Physical Booth Signage Generator

We are thrilled to announce **Release v2.0.0** of the Inventory System & POS! Tailored specifically for antique mall cooperatives, multi-booth vendors, and retail storefronts, this release introduces a complete **Promotions & Timed Sales Engine** with automatic countdown clocks, recurring weekend scheduling, grace period buffers, POS line-item discounts, full-screen digital signage, and a physical booth sign maker.

---

### Highlights & Key Improvements

1. **Promotions & Timed Sales Engine**
   - Configure percentage (%) or fixed dollar ($) markdowns targeting:
     - **Entire Booth Inventory** (e.g. *20% Off Storewide*).
     - **Specific Categories or Tags** (e.g. *40% Off Vintage Glassware* or *Red Tag Clearance*).
     - **Selected Individual Items** with multi-item search and selection.
   - Preserves base inventory `retailPrice` so catalog records remain pristine and automatically revert when sales expire.
   - Automatic best-deal resolution ensures the customer always receives the highest discount when overlapping rules apply.

2. **Automated Scheduling, Recurring Sales & Grace Periods**
   - Precise Start and End Date/Time scheduling.
   - **Recurring Day Schedules**: Automatically repeats sales on chosen days of the week (e.g., weekend-only sales on Saturdays and Sundays).
   - **Grace Period Buffer**: Configurable 5 to 30-minute buffer window preventing abrupt price resets for customers waiting in line at closing.

3. **POS Register Integration & As-Is / Damaged Overrides**
   - Active promotions apply dynamically as items are rung up or scanned at checkout.
   - **Ad-Hoc Line-Item Discounts**: Cashiers can click the new `%` discount button on any cart item to apply an instant markdown for damaged, as-is, or negotiated items with preset reasons.
   - **Receipt Savings Breakdown**: Both 80mm Thermal paper and Standard Letter (A4) invoices print regular prices, discount reasons, item savings, and an eye-catching total savings banner: `*** YOU SAVED: $XX.XX TODAY! ***`.

4. **Digital Signage Showcase Kiosk (`/promotions/display`)**
   - A high-contrast, full-screen presentation mode designed for in-booth iPad/Android tablets or counter displays.
   - Features a live second-by-second countdown clock (with amber warning during grace windows), rotating slideshow of featured sale items, high-res photos, crossed-out original prices, and prominent green sale prices.

5. **Physical Sign Maker & Shelf-Talkers**
   - One-click print utility generating print-ready signage on standard paper via browser print styles:
     - **Full Booth Poster (8.5" x 11")**: Eye-catching large banner showing Booth #, discount percentage, category/scope, and validity dates.
     - **Shelf-Talker Cards (4 per page)**: Compact fold-over cards with dashed cutting lines for placement directly in front of merchandise.

6. **Home Catalog Grid Enhancements**
   - Items with active promotions display a vibrant sale badge in the corner and show crossed-out original prices alongside emerald sale prices.

7. **Version 2.0.0 Alignment**
   - System version updated to **Beta 2.0.0** across the Web Navbar, POS Receipts, and system manifests.

