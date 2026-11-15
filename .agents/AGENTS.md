# Project Rules & Customizations

This file outlines project-specific rules, guidelines, and automation instructions for the Inventory System codebase.

---

## 1. Standalone Android APK Builds

When requested to compile, build, or deploy a new Android APK for the handheld scanner application:
- Always check the `mobile/` directory: [mobile](file:///c:/Projects/inventory-system-app/mobile).
- Verify the Expo user status with `npx eas-cli whoami` (default account: `shufunk`).
- Trigger the EAS build asynchronously using:
  ```powershell
  npx eas-cli build --platform android --profile preview --non-interactive
  ```
- Extract the build log URL (e.g., `https://expo.dev/accounts/shufunk/projects/mobile/builds/...`) from the initial command output and report it to the user.
- Allow the build to run in the background. Once the task completes, parse the output for the `.apk` download URL (e.g., `https://expo.dev/artifacts/eas/...apk`) and provide it to the user.

---

## 2. Environment Configuration, Data Preservation & Demo Mode Safeguards

CRITICAL REQUIREMENT: Live production instances, offline local appliances, and user devices (e.g. Raspberry Pi, local servers, and standalone Windows desktop apps) MUST NEVER lose user data, inventory records, or administrator accounts.

### A. Environment Variable & Git Rules
1. **Never Commit or Push `DEMO_MODE=true` to Any Branch**:
   - `web/.env` in the repository must always have `DEMO_MODE=false`.
   - Never commit `DEMO_MODE=true` to `master`, `main`, `demo-siteground`, or any other branch.
   - Any git pull on a production system, Raspberry Pi, or local device must always leave `DEMO_MODE=false`.
2. **Dedicated Cloud Demo Packaging Only**:
   - The public demonstration build (e.g., SiteGround demo) is exclusively generated via `scripts/make_demo_zip.py`.
   - `scripts/make_demo_zip.py` dynamically injects `DEMO_MODE=true` and `ENABLE_SCHEDULED_RESET=true` into the ZIP payload without ever modifying the local or tracked git repository `.env`.

### B. Double-Lock Database Reset Protection
1. **Double-Lock Required for Automated Resets**:
   - `performMidnightReset()`, `scheduleMidnightReset()`, and `checkAndResetIfNeeded()` in `web/lib/db.js` MUST require BOTH `process.env.DEMO_MODE === 'true'` AND `process.env.ENABLE_SCHEDULED_RESET === 'true'`.
   - If either variable is missing or false, scheduled resets, table drops, and re-seeding MUST immediately abort.
2. **Never Wipe User Uploads or Custom Store Databases**:
   - `uploads/` directory must never be purged or altered during demo resets in non-SaaS environments.
   - `seedDemoData()` must only ever touch the 3 pre-seeded demo booths (`booth-101-pixel-cartridge`, `booth-102-vault-cards`, `booth-103-nostalgia-toys`). Custom `store_<UUID>.sqlite` files must never be unlinked.

### C. Automatic Orphaned Store Recovery
1. **Always Preserve & Auto-Link Discovered Databases**:
   - On master database startup (`initializeMasterSchema` in `web/lib/db.js`), the engine automatically scans the working data directory for any `store_*.sqlite` database files that are not registered in `store_profiles`.
   - Any discovered store database must be automatically re-linked into `store_profiles` so user inventory is never orphaned or invisible in the UI after updates.

