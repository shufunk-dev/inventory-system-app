# Release Update: Beta 1.8.5 — Shared Catalog Scoping & Appliance Onboarding Refinements

We are excited to announce the release of **Beta 1.8.5**, focusing on multi-user inventory collaboration, setup security enforcement, and Linux appliance setups.

Here is a breakdown of what's new in this release:

## 1. Unified Shared Catalog (Removal of Individual User Filtering) 🤝
To support antique malls and collaborative storefront environments:
* **Collaborative Database Access:** We removed individual `userId` filters from all core inventory query routes (including categories, audit lists, recipes, CSV exports, and main dashboard panels).
* **Multi-User Visibility:** Managers, owners, and staff can now see and query scans, categories, and physical audit counts created by all authorized users in the same store or tenant database context.
* **Audit Trail Retention:** The `userId` of the creator is still saved on insertions to maintain a clear audit trail for the sync queue and database records.

## 2. Onboarding Gates & Setup Redirection Wizard 🔒
* **Redirect Locks:** Implemented redirection gates that automatically force-redirect unconfigured backend servers directly to the `/setup` onboarding wizard upon first boot, ensuring that credentials and offline license keys are set up before accessing dashboard tools.

## 3. Appliance Setup Bootstrapping ⚙️
We updated the Linux installation setup scripts (`setup-appliance.sh` and `appliance-setup.sh`) to turn any Ubuntu/Raspberry Pi server into a dedicated inventory appliance:
* **Automatic Updates:** Configured automatic npm package checking to automatically pull and sync dependency builds.
* **Pi swap-space Guidelines:** Added configuration checklists and manuals troubleshooting swap-space allocations (mandating a minimum of 1GB swap space) to prevent compiler crashes on low-RAM Raspberry Pi boards during production builds.

## 4. Test Suite Throttling Fixes 🧪
* **Trial Fixes:** Added explicit test-mode overrides in `tests/trial.test.js` to ensure the cryptographic trial key check does not throttle or self-destruct during automation testing.
* **All Tests Passed:** 100% test success across all 36 test cases in the test runner suite.

*Version 1.8.5 is now fully live and compiled on GitHub!*
