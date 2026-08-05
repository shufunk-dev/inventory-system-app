# Release v1.9.8: Direct eBay REST API Integration & Universal Category Valuation Engine

We are excited to announce **Release v1.9.8** of the Inventory System App! This release introduces direct integration with the **eBay REST API**, bringing real-time active listing market values (low, average, high) across all item categories, along with compliance webhook fixes and reverse-proxy support.

---

## 🛍️ 1. Direct eBay REST API Valuation Engine
- **Live Active Listing Lookups**: Direct REST API connection to eBay Browse API querying live active market listings for structured price averages and ranges.
- **Universal Category Pricing**: Updated all 12 item category pipelines (Movies, Video Games, Toys, Coins, Cards, Graded Assets, Comic Books, Music, Hardware, Tools, Bottles, and Generic Items) to safely parse low, average, and high market values into SQLite.
- **Clean Title Querying**: Automatically strips web-search modifier keywords (`ebay`, `price`, `movie ebay`) when querying the native eBay REST API to prevent zero-result listing failures.

---

## 🔒 2. eBay Deletion Notification Webhook & Reverse-Proxy Support
- **SHA-256 Challenge Verification**: Implemented eBay Marketplace Account Deletion Notification GET challenge handler complying with eBay GDPR compliance requirements.
- **Reverse Proxy & Tunnel Support**: Updated endpoint challenge URL generation to respect `x-forwarded-host` and `x-forwarded-proto` headers, supporting ngrok, Cloudflare Tunnels, and Vercel hosting.
- **Settings UI Guidance**: Added real-time environment detection in App Settings highlighting public HTTPS requirements and ngrok tunnel setup for local development.

---

## 📌 3. System Versioning & Build Manifest Updates
- System version bumped to **Beta 1.9.8** across the Web Navbar, POS Receipt headers, Mobile Scanner Expo config, and Desktop Electron build manifests.
