# Scanning and AI Pipeline

The core power of this Inventory & POS System lies in its intelligent item identification pipeline. When you scan a barcode or upload an image, the system runs through a multi-tiered fallback pipeline to extract titles, descriptions, categories, and estimated values automatically.

---

## 1. Barcode Scanning Waterfall

When a UPC or EAN barcode is scanned, the system performs a sequential search across multiple database providers:

```
           [ Scan Barcode ]
                  │
                  ▼
         ┌────────────────┐
         │ Local Database │ ──(Found?)──► [ Return Item ]
         └────────────────┘
                  │ No
                  ▼
         ┌────────────────┐
         │   UPCItemDB    │ ──(Found?)──► [ Import & Return ]
         └────────────────┘
                  │ No
                  ▼
         ┌────────────────┐
         │  OpenFoodFacts  │ ──(Found?)──► [ Import & Return ]
         └────────────────┘
                  │ No
                  ▼
         ┌────────────────┐
         │  Book Database │ ──(Found?)──► [ Import & Return ]
         └────────────────┘
                  │ No
                  ▼
         [ Manual Creation ]
```

### A. Local Database
The system first checks the local sqlite file `inventory.db` for existing items with the same barcode. This ensures offline speed for previously entered items.

### B. UPCItemDB (Global API)
If the item is not found locally, the system queries UPCItemDB. This provider returns commercial product titles, descriptions, and categories for general retail merchandise.

### C. OpenFoodFacts
For groceries, foods, and personal care products, the system queries OpenFoodFacts, importing nutrition facts, ingredients, and brand info.

### D. Open Library / Google Books
If the scanned barcode matches an ISBN prefix, the system queries book databases to retrieve book titles, authors, publishers, and cover art.

> [!NOTE]
> **Recycled Barcodes (Pre-2007 Paperbacks)**:
> Older mass-market paperbacks (such as vintage Pocket Books, Dell, Bantam, or Avon editions printed before 2007) frequently shared generic UPC barcodes across entire price tiers. For example, every $6.50 paperback from a publisher might print the exact same barcode. 
> * **Symptom**: Scanning these older books may result in the system returning the wrong book title in the series or a completely different book by the same publisher.
> * **Workaround**: Switch the mobile camera to **Photo Mode** and take a picture of the front cover instead of scanning the barcode. The server's visual Google Lens pipeline will match the cover art and pull the correct book title, description, and market value.

---

## 2. PriceCharting Waterfall

For video games, trading cards (Pokemon, Magic: The Gathering), and comic books, the system uses a specialized value lookup engine.

1. **Exact Matches**: Queries PriceCharting by product ID or barcode.
2. **Fuzzy Titles**: Queries by title and platform, matching condition state (Loose, Complete-in-Box, New).
3. **Fallback Value**: If no direct price is found, it uses the average of the last 3 eBay sold listings.

---

## 3. SerpApi Google Lens Integration

For items without barcodes (antiques, artwork, loose toys, diecast cars, collectibles), the system utilizes image-based searches:

* **Trigger**: Take a photo with the mobile app camera or upload a file.
* **SerpApi Google Lens**: The system uploads the image and queries Google Lens via SerpApi to identify visually similar objects.
* **Match Resolution**: Google Lens returns a list of visual matches, eBay listings, and store pages. The system extracts common keywords to suggest a title, category, and market price.
* **User Customization**: Users can edit the automatically generated title (e.g. adding details like "large car" or "era-specific edition") to refine subsequent searches or match personal labeling conventions.

---

## 4. Specialized Lookups (Music, Retro Tech, & Tools)

The system includes specialized crawlers and database connectors to enrich details for particular categories of items:

### A. Discogs Music Integration
For items scanned in **Music Mode**, the background worker queries the Discogs Database API:
* **Lookup**: Queries by barcode first, falling back to artist/title keywords.
* **Fields Resolved**: Populates pressing year, country, media format (e.g. Vinyl vs CD), Discogs Release ID, and cover images. 
* **Goldmine Condition Ratings**: Stores separate ratings for media condition and sleeve condition.

### B. Retro Tech Spec Scraper
For items scanned in **Retro Tech Mode**, the worker uses organic web searches to target hardware database indexes:
* **Lookup Sources**: Queries CPU-World, EveryMac, and TechPowerUp.
* **Hardware Type Resolution**: Automatically classifies common CPU architectures (e.g., Pentium, Xeon, Celeron, Athlon) as CPU types, and matches keywords for GPUs and storage drives.
* **Fields Resolved**: Extracts clock speeds, capacities, serial numbers, BIOS versions, SMART health reports, and operating system compatibility configurations (e.g. antiX, Lubuntu).

### C. Workshop Tools Recognition
For items scanned in **Tools & Workshop Mode**, the worker identifies maker brands:
* **Brand Auto-Detection**: Extracts brands like DeWalt, Makita, Milwaukee, Ryobi, Hakko, Bosch, and Dremel from titles or label photos.
* **Fields Resolved**: Tracks warranty coverages, purchase dates, and assigned workbench locations (e.g. "Desk 2").

---

## 5. Basic vs. Premium Configurations

Depending on your license tier, different parts of the AI pipeline will be active:

| Feature | Community Edition | Professional | Enterprise |
| :--- | :--- | :--- | :--- |
| **Local Lookup** | Unlimited | Unlimited | Unlimited |
| **OpenFoodFacts** | Active | Active | Active |
| **UPCItemDB API** | Basic (Rate Limited) | Standard API | Dedicated/Custom API |
| **PriceCharting Sync**| Manual | Automated Sync | Real-time Webhooks |
| **Google Lens (SerpApi)**| Disabled | Up to 100/mo | Unlimited / Custom Key |
| **OCR Count Sheets** | Disabled | Active | Bulk OCR Processing |
