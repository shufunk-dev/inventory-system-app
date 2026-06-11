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

### A. Square Reader
* Connect a Square Terminal or Square Reader via SDK.
* In **Settings** > **Payment Integrations**, enter your Square Application ID and Location ID.
* The POS app requests a reader token, initializing the terminal to display the transaction amount automatically.

### B. Stripe Terminal
* Configure your Stripe API keys.
* Setup Stripe Terminal to accept Tap-to-Pay on compatible mobile devices or dedicated Stripe Reader hardware.
* Status is updated in real-time via Stripe webhooks.

---

## 3. QR Code Payment Generators (Venmo & PayPal)

For low-overhead checkouts or craft show booths, you can display scan-to-pay QR codes directly on the register screen or printed receipts.

### A. Configuration
In **Settings** > **Store Setup** > **Payment Accounts**:
* **Venmo Username**: Input your Venmo handle (e.g. `@ShufeltDesigns`).
* **PayPal Email / Link**: Input your PayPal.Me link (e.g. `paypal.me/shufeltdesigns`).

### B. Dynamic Generation
When checking out via Venmo or PayPal:
1. The system computes the final order total (including tax and discounts).
2. It dynamically generates a QR code using standard URI schemes:
   * **Venmo**: `venmo://paycharge?txn=pay&recipients=Username&amount=Total&note=Order%20#123`
   * **PayPal**: `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=email&amount=Total&item_name=Order%20#123`
3. The customer scans the QR code from the screen using their phone camera, which opens their native app with the correct amount and recipient prefilled.
4. Once the customer completes the transaction, the cashier clicks "Mark as Paid" to complete the checkout.
