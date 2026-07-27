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
