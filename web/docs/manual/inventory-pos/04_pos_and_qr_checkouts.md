# POS and QR Checkouts

The system includes a fully functional Point of Sale (POS) checkout interface. Cashiers can ring up sales, process credit card terminals, or display scan-to-pay QR codes for mobile wallets.

---

## 1. Commercial Registers

The POS interface is optimized for speed and barcode scanner inputs.

### A. Core Workflow
1. Navigate to the **POS / Register** screen.
2. Select the **Active Store/Booth** (if in multi-store mode).
3. Focus your cursor on the **Scan Input** box. Scans will append items directly to the cart.
4. Adjust quantities, apply discounts (flat rate or percentage), or toggle tax exemption.
5. Click **Checkout** to select a payment method.

### B. Register Shifts
* **Opening Register**: Cashiers input the starting cash amount (cash drawer bank).
* **Closing Register**: At the end of a shift, cashiers count cash, card slips, and mobile payments. The system generates a reconciliation report comparing actual cash with expected cash, marking variances in the audit log.

---

## 2. Card Reader Integration (Square / Stripe)

For physical card swipes, insertions, and tap payments, you can connect reader terminals:

### A. Square Terminal Integration
* Connect a Square Terminal or Square Reader via SDK.
* In **Settings** > **POS Card Reader Integration**, select **Square** as the provider, enter your Square Sandbox/Access Token (`EAAA...`), Location ID, and Device ID.
* The POS app requests a checkout session, initializing the terminal to display the transaction amount automatically. The transaction status is tracked in real-time.

### B. Stripe Terminal Integration
* In **Settings** > **POS Card Reader Integration**, select **Stripe** as the provider, enter your Stripe API key and Reader ID.
* Setup Stripe Terminal to accept Tap-to-Pay on compatible mobile devices or dedicated Stripe Reader hardware.
* Status is updated in real-time via Stripe webhook endpoints.

### C. Clerk Training Sandbox Mode
* When toggled ON inside the POS header, payments bypass Stripe and Square gateways.
* A flashing amber warning banner alerts cashiers that transactions are simulated locally.
* Training runs write transaction logs with an `isTraining = 1` database flag to isolate training history from active sales accounting records.
* The system simulates card tap status sequences with a **3-second delay** and supports mock clerk cancellations.

---

## 3. QR Code Payment Generators (Venmo & PayPal)

For low-overhead checkouts or craft show booths, you can display scan-to-pay QR codes directly on the register screen.

### A. Configuration
In **Settings** > **POS Card Reader Integration** > **Dynamic Mobile Payments (QR Codes)**:
* **Venmo Username**: Input your store Venmo handle (e.g. `@ShufeltDesigns`).
* **PayPal Email**: Input your store PayPal email (e.g. `billing@shufeltdesigns.com`).

### B. Dynamic Generation
When checking out via Venmo or PayPal:
1. The system computes the final order total (including tax and discounts).
2. It dynamically compiles and renders vector QR codes using mobile URI schemes:
   * **Venmo**: `venmo://paycharge?txn=pay&recipients=[Clean-Handle]&amount=[Total]&note=Receipt%20[No]`
   * **PayPal**: `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=[Email]&amount=[Total]&currency_code=USD&item_name=Receipt%20[No]`
3. The customer scans the QR code from the register viewport using their camera, launching their native mobile app with pre-filled billing.
4. The cashier clicks "Mark as Paid & Print" once the customer confirms payment.

---

## 4. ESC/POS Direct Thermal Printing & Hardware Triggers

Cashiers can configure direct raw printing streams to POS receipt printers, bypassing standard browser print overlays.

### A. Configuration
In **Settings** > **Receipt Printer Configuration**, select your printer connection profile:
* **Regular Printer (Browser)**: Triggers the standard HTML print dialog (`window.print()`).
* **Network Thermal Printer**: Routes raw print buffers to network receipt printers via TCP. Enter the target **Printer IP Address** and **TCP Port** (default: `9100`).
* **USB Thermal Printer (WebUSB)**: Compiles raw binary data and exposes hex-encoded buffers for client-side WebUSB printing.

### B. Thermal Hardware triggers
Configure hardware options directly inside settings:
* **Automatic Paper Cut**: Appends partial cut commands (`GS V`) at the end of receipts.
* **Kick Cash Drawer**: Appends drawer pulse commands (`ESC p`) to pop connected cash drawers instantly upon payment completion.

---

## 5. Optimized Widescreen Tablet Register (Tablet Layout)

Toggle **Tablet Layout** inside the POS header to activate an interface optimized for countertop tablet registers (e.g. Apple iPads or Android tablets).

### A. Layout Refinements
* **Collapsible Configurations**: Hides the administrative receipt configuration card behind a collapsible header accordion, starting collapsed to maximize catalog display space.
* **Tactile Items Grid**: Search result cards scale dynamically into larger touch targets featuring click-scale animations for responsive item ring-ups.

### B. Interactive Touch Cart Sidebar
* Replaces static paper print previews on the right with a dynamic shopping ticket.
* Cashiers can tap touch-friendly increment (`+`) and decrement (`-`) quantity controls or delete line items instantly.
* grand totals update in real-time, backed by primary cashless checkout actions pinned to the foot of the ticket.
