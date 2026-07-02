# Release Beta 1.9.0: Music, Retro Computing, and Tools Inventory Modules

We are excited to announce the release of **Beta 1.9.0**! This is a major update that significantly expands the range of collections and assets you can track within the application. By consulting with our collector community, we have designed three new dedicated inventory modules: **Music Archives**, **Retro Computing & Hardware**, and **Tools & Workshop Inventory**. 

Here is a full breakdown of the features introduced in this release, along with how to use them with your mobile handheld scanner.

---

## 1. General Music Archives (Vinyl, Cassette, CD, 8-Track)
Whether you are tracking legacy vinyl pressings, classic cassettes, CDs, or vintage 8-tracks, our new **Music Archives** module is built to keep your audio physical media cataloged:
*   **Discogs API Integration**: We integrated the official Discogs Database API to resolve metadata. Scanned music barcodes automatically fetch the artist, album name, formats (e.g., LP, Album, Reissue, 180g), release year, pressing country, and high-resolution cover artwork.
*   **Media-Specific Attributes**: The database now tracks matrix runout engravings (vital for identifying specific pressings/runs), vinyl weights (e.g. 180g vs standard), and separate media & sleeve condition ratings (using the goldmine standard: M, NM, VG+, VG, G, P).
*   **Custom Token Support**: Administrators can save their personal Discogs API Token in the Admin Settings panel to query search indexes.

---

## 2. Retro Computing & Hardware Archives
For tech restorers and legacy collectors, cataloging old computers and individual parts is now incredibly easy:
*   **Automatic Spec Extraction**: The worker runs web specifications lookups against databases like EveryMac, CPU-World, and TechPowerUp to retrieve configuration metrics.
*   **CPU/GPU Auto-Detection**: The scraper parses queries and automatically classifies standard processors (such as Pentium, Celeron, Athlon, Xeon) as `CPU` types.
*   **Hardware Metrics**: Track serial numbers, BIOS/firmware versions, compatibility logs (e.g., *"Tested with antiX/Lubuntu 23.04"*), and hard drive SMART health diagnostics.

---

## 3. Tools & Workshop Inventory
Organizing the physical workshop tools used in your salvage or repair operations saves time and prevents lost items:
*   **Workstation/Desk Assignment**: Assign tools to specific workspaces (e.g., *"Soldering Iron on Desk 2"* or *"Multimeter in Storage Box A"*).
*   **Warranty Tracking**: Keep log profiles of purchase dates and warranty statuses.
*   **Popular Brand Mapping**: Automatically recognizes maker and tool brands (like Hakko, DeWalt, Milwaukee, Makita, Bosch, and Dremel) through scan OCR.

---

## 4. Mobile Handheld Scanner App Support
Our React Native companion app has been bumped to version 1.9.0 to support scanning into the new modules:
*   **Selector Dropdown**: A new dropdown menu offers `🎵 Music`, `🖥️ Retro Tech`, and `🔧 Tools & Workshop` scan modes.
*   **Intelligent Syncing**: Items scanned in these modes are automatically exported with their corresponding categories, triggering the backend worker to run the correct Discogs or hardware resolver.

---

## 5. Legally Compliant & Offline-Tested
Continuing our commitment to commercial licensing safety and quality:
*   **Mocked Tests**: Added three new automated unit test suites (`tests/discogs.test.js`, `tests/hardware.test.js`, and `tests/tool.test.js`) verifying the API mappings, defaults, and SQLite queries.
*   **Backwards Compatibility**: Ensured the SQLite parameter indices are preserved, allowing all existing 81 test cases across 21 test suites to run and pass with 100% success.

Enjoy organizing your new collections, and happy cataloging!
