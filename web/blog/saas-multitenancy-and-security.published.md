# Building a Secure Multi-Tenant SaaS Architecture for Local-First Databases

In this update, we made massive architectural leaps to prepare our local-first catalog and inventory app for a fully managed SaaS hosting tier. Here is how we designed and implemented dynamic database routing, offline-first licensing, and robust security upgrades.

---

## The SaaS Goal: Cost Efficiency & Strict Isolation

To provide a fully managed SaaS cloud tier for non-technical users, we needed a remote server configuration. However, spinning up separate Next.js instances and database containers for every new customer is extremely expensive and makes code updates difficult.

Instead, we chose the **Hybrid SQLite Model (Shared Server, Separate Databases)**:
*   **One Next.js Server**: Serves all customer requests from a single codebase.
*   **Isolated Database Files**: Every tenant gets their own physical SQLite database (e.g. `tenant_abc.sqlite`). This provides 100% data separation with near-zero hosting overhead.

To support this, we built a custom connection pool manager (`dbManager.js`) that dynamically opens database connections based on session headers or cookies and automatically closes connections that have been idle for longer than 5 minutes to release server resources.

---

## Offline-First Product Licensing

Because the app is designed to run offline on local devices (like Raspberry Pi appliances or laptops), we cannot rely on an active internet server to check subscription states. 

We built a cryptographic, offline-first product key system (`license.js`):
1.  **Prefix-mapped modes**: Product keys dictate features—`COLL` activates Collector Mode (simplified inventory logs), and `STOR` activates Retail Store POS Mode (cash registers, receipts, employee shifts).
2.  **SHA-256 HMAC Signatures**: Keys are verified mathematically using a private environment salt, preventing users from forging license codes.

---

## First-Boot Setup Wizard & Redirect Gates

We hardened the app by deleting a hardcoded root backdoor (`shufunk@gmail.com`) that was previously used for admin bootstrapping. 

Now, when a user boots the app for the first time:
*   The database starts with 0 users.
*   Next.js server layouts detect the clean install and redirect all requests automatically to the `/setup` wizard.
*   The user registers their admin credentials and enters their license key. The server dynamically grants them Root privileges and provisions their isolated database file.

---

## Secure Support: Option A (Super Admin Login)

To allow remote troubleshooting without checking backdoor accounts into public GitHub repositories:
*   We wrote a login interceptor that checks inputs against the environment variables `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_HASH`.
*   On a match, the server generates a virtual user profile directly from the decrypted session token, bypassing local database lookups and letting support agents view the store database seamlessly.

---

## 100% Validated

We wrote a full integration testing suite to check for edge cases, path resolutions, and concurrent writes. We fired parallel transactions using matching primary keys simultaneously across separate databases and confirmed **100% data isolation with zero leakage or lock crashes**. All 13 tests passed successfully.

Stay tuned for our next update where we tackle NCR Aloha POS sales log ingestion!
