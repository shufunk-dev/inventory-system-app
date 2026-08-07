# Release v1.9.9: Duplex & Single-Sided Scan Intake, Intelligent Sorting & Inline Category Creator

We are excited to announce **Release v1.9.9** of the Inventory System App! This release introduces **Duplex & Single-Sided Scan Intake** for high-volume trading cards, business cards, and documents, along with intelligent pair sorting, front/back orientation swap protection, sports position name preservation, and an inline category creation workflow.

---

### Highlights & Key Improvements

1. **Duplex & Single-Sided Scan / Photo Intake**
   - Import multi-file image pairs or `.zip` archives directly into the system.
   - Dual-side card creation (`imagePath` and `imagePathBack`) automatically queue background AI vision identification and market valuation workers.

2. **Intelligent Duplex Sorting & Orientation Swap Protection**
   - Natural alphanumeric sorting recognizes side suffixes (`_a`/`_b`, `-front`/`-back`, `_f`/`_b`, `-1`/`-2`).
   - Automatically orders `front` sides before `back` sides even when standard alphabetical order would reverse them.
   - Built-in orientation swap safeguard automatically flips out-of-order front/back pairs before storage.

3. **Sports Position & Term Preservation**
   - Intelligent parser protects position names and card terms ending in "Back" (such as *Running Back*, *Corner Back*, *Quarter Back*, *Throwback*, and *Diamondbacks*) from being truncated.

4. **Inline Category Creation**
   - Quick `+ New Category` inline form on the Intake page lets users create and auto-select destination categories without leaving the upload screen.

5. **Discord Webhook Relayer for eBay Compliance**
   - Added an optional Discord Webhook URL configuration in Settings.
   - Automatically formats and relays incoming eBay Account Deletion / Closure Notifications directly to a designated Discord channel as rich alert embeds for real-time compliance monitoring.

6. **Version 1.9.9 Ecosystem Alignment**
   - System version bumped to **Beta 1.9.9** across the Web Navbar, POS Receipt headers, Mobile Scanner Expo config, and Desktop Electron build manifests.
