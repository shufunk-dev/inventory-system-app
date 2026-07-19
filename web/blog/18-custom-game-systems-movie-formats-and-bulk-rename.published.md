# Release v1.9.4: Video Game Console Systems, Customizable Movie Formats, and Dashboard Bulk Renaming

We are excited to announce the release of **v1.9.4**, bringing customizable configurations and bulk updates to retro video game collections and movie archives. This update delivers granular platform matching, bulk dashboard editing, and smarter visual OCR heuristics.

---

## 1. Video Game Console System Configurations
Store owners and collectors can now explicitly set the console system/platform for video games in their inventory:
* **Custom Console/Platform Registry**: Added a toggable checklist inside Account Settings containing 36 retro and modern consoles (NES, Sega Genesis, N64, Switch, PS1-PS5, Xbox, Atari, TurboGrafx, etc.). Checked systems populate the catalog dropdown list, keeping options clean and compact.
* **Granular PriceCharting Search**: The pricing search query builder now appends the exact selected console platform (e.g. `"Super Mario Bros. 3 NES video game price value pricecharting"`), bypassing generic search ambiguities and guaranteeing accurate price matches.
* **Auto-Platform Classification**: During photo uploads, OCR name resolver heuristics scan detected text for platform badges (e.g., `"NES"`, `"Genesis"`, `"Color"`) to automatically set the game's system, avoiding manual console entry.

---

## 2. Customizable Movie Formats
We have extended matching precision to video, DVD, and tape formats:
* **Format Configuration Options**: Added a toggable checklist for popular movie formats (VHS, DVD, Blu-ray, 4K Ultra HD, LaserDisc, BetaMax, VCD, HD DVD, and Digital Copy).
* **Format Details Badge**: The item details page renders a styled badge showing the specific movie format.
* **Auto-Format Detection**: Photo uploads check OCR content for format markers (e.g., `"VHS"`, `"DVD"`, `"laserdisc"`), pre-selecting them during visual ingestion.

---

## 3. Bulk Dashboard Assignments & Renaming
To handle large inventory imports efficiently:
* **Bulk Renaming Modal**: Selected dashboard items can be renamed in bulk via a scrollable list overlay, complete with thumbnail previews.
* **Bulk System Assignment**: Cashiers can select multiple items and click "Set System" to assign a game platform, automatically classifying them as video games and triggering a valuation re-sync.
* **Bulk Format Assignment**: Allows selecting multiple items and clicking "Set Format" to update the movie format in a single database transaction.

---

## 4. Google Vision OCR Heuristics Fixes
We fine-tuned the OCR text parsing worker to prevent mismatched names and incorrect fallbacks:
* **Label Exclusion Lists**: Stripped region ratings (NTSC, PAL, ESRB), network badges (Xbox Live, PSN), media packages (VHS tape, DVD cover), and legacy publisher logos from titles.
* **Non-Latin Character Rejector**: Discards Cyrillic, CJK, and Arabic strings when parsing English cover labels.
* **Prioritized Match Hierarchy**: Queries OCR title text first, followed by brand logos, web entity titles, and best guess labels.
