# Valuation, Audits, and Depletions

Accurately tracking the current worth of inventory assets and identifying shrinkage or usage is key to maintaining profitability. This section covers inventory count sheet ingestion, depletion logs, and audit timelines.

---

## 1. Raw Count Sheet OCR Ingestion

Instead of manually typing inventory numbers, you can upload hand-written or printed inventory count sheets:

### A. How it Works
1. Navigate to the **Auditor / Variance** page.
2. Click **Upload Count Sheet**.
3. Select an image (PNG, JPG) or PDF of your count sheet.
4. The system runs the document through an offline **Tesseract.js OCR engine**:
   * It recognizes tables, handwritten numbers, and SKU codes.
   * Matches scanned rows with the database by checking for Title or Barcode.
5. Displays a preview table showing:
   * Identified Item.
   * Scanned/Physical Count.
   * Database Count.
   * Variance (Difference).
6. Click **Confirm Ingestion** to update inventory counts and record variance adjustments.

---

## 2. Depletion and Usage Logging

When items are removed from stock without a register sale (e.g., damaged items, items used internally, promotional giveaways), you must log them as depletions:

* **Damage/Loss**: Write-off item due to breakage or expiration.
* **Internal Usage**: Item consumed for store operations (e.g., office supplies, display materials).
* **Consignment Return**: Return unsold consignment items back to their vendors.
* **Shrinkage**: Discovered missing during physical audits.

Logging these events accurately calculates the **Cost of Goods Sold (COGS)** and adjusts your tax liability.

---

## 3. Chronological Timeline Filters

Under the **Valuation Dashboard**, you can view and filter history to understand asset value changes over time.

### A. Valuation History Charts
The system keeps a snapshot of total inventory value (Cost Price vs. Retail Price vs. Market Value). You can filter this chart by:
* **Last 30 Days**: View daily fluctuations.
* **Quarterly**: View macroscopic trends.
* **Custom Range**: Filter down to specific periods.

### B. Audit Log Timeline
Every single change (manual edit, register sale, OCR count correction, market price fetch) creates a ledger entry. Use the search filter at the top of the history timeline to filter entries by:
* **Action Type** (e.g. Sale, Depletion, Import, Price Update).
* **Store/Booth** (e.g. only show modifications in Booth 101).
* **Operator** (e.g. only show adjustments made by user "Clerk John").
* **Severity** (e.g. flag all adjustments that reduced stock by > $100 in value).
