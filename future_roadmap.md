# Product Roadmap & Future Options

This document outlines the remaining planned future features, security settings, and device integrations for the Inventory System.

---

## Completed Features (Beta 1.8.6)
- **Direct IP Syncing (Over-the-Air Sync)**: Mobile scanner pairs directly with local servers via IP addresses or domains, pushing scans and image payloads via HTTP POST, bypassing manual ZIP transfers.
- **Remote Sync (Self-Hosted Cloudflare Tunnels)**: Fully supported session authorization via Bearer tokens, allowing secure remote syncing over custom self-hosted Cloudflare Zero Trust tunnels.
- **Cryptographic Remote Support Tokens (Asymmetric Support Access)**: Technical support is enabled offline without hardcoded backdoors. If support is requested, the owner imports a time-limited token signed with your private key, granting temporary admin access that expires automatically after 24 hours.

---

## 1. Remote Cloud Aggregation & Sync Options
- **Remote Sync (Managed Paid Sync)**:
  - Automatic provisioning of secure subdomains (e.g. `https://[shop-id].shufunk-sync.com`) under our Cloudflare account, requiring zero configuration.
- **Centralized Cloud Console**:
  - View aggregated sales, inventory levels, and cross-store search reports by feeding summary telemetry from local servers to a central console.

## 2. Countertop Tablet POS Register Layout
- **Tablet Layout Mode**: Optimizes Next.js screens for countertop Apple iPads and Android Tablets, displaying a desktop-style two-column dashboard with a persistent navigation sidebar.
- **Card Reader Integration**: Support for physical chip/tap readers (Stripe Terminal, Square Terminal) using tokenized, end-to-end encrypted APIs.
- **Venmo & PayPal Dynamic QR Codes**: Zero-cost card-free payments. POS screens dynamically generate scan-to-pay QR codes representing deep-links with recipient handles and exact total purchase totals.
- **ESC/POS Native Thermal Receipt Printing**: Standard ESC/POS command raw buffer output to USB/Network thermal paper checkout printers.
