# Licensing Compliance & Commercial-Safe Metadata Resolution

Today, we took a major step toward making the Inventory System fully compliant and ready for commercial sale. To protect against potential licensing liabilities, we have completely removed the TMDB (The Movie Database) API integration and replaced it with keyless, commercial-safe alternatives using Wikipedia and YouTube search.

Here is a breakdown of our changes and why they make the application legally clear for commercial distribution.

---

## 1. The Compliance Challenge: TMDB Commercial Restrictions
During a review of our dependencies, we analyzed the TMDB API Terms of Use, which explicitly prohibit using their APIs in connection with a commercial application:
* *“Selling, leasing, or sublicensing the TMDB APIs, access to the TMDB APIs, or TMDB Content... is considered a commercial use and is only permitted under a separate written agreement.”*

Even though our system required users to supply their own personal TMDB keys, distributing an application containing built-in code targeting TMDB endpoints could still be flagged under their distribution terms. To eliminate this risk, we decided to purge all TMDB code and design a keyless, legally open metadata loop.

---

## 2. Migrating Movie Metadata to Wikipedia
Instead of calling TMDB, the background sync worker now queries the official **Wikipedia (MediaWiki) API** to fetch movie plots and cover images. 

We implemented this in a new helper function `fetchWikipediaMovieMetadata(name)`:
* **The Search Query**: It first searches Wikipedia for `${name} film` to identify the most accurate film article.
* **Details Fetching**: Once it has the article title, it requests the introduction extract (which acts as the movie plot summary) and the page's main image (which resolves to the high-resolution movie poster/cover).

**Why this is a major upgrade:**
* **Commercial Safety**: Wikipedia’s data is released under Creative Commons (CC-BY-SA) or the Public Domain, allowing commercial distribution.
* **Keyless Onboarding**: Users no longer need to register for, copy-paste, or maintain a TMDB API Key. Movie imports work automatically out of the box.

---

## 3. Resolving Movie Trailers via YouTube Organic Search
TMDB previously supplied YouTube trailer codes. We replaced this with a keyless search query using our existing **organic search pipeline**:
* We added a new `url` return field to our generic `fetchOrganicSearch` crawler.
* We created a helper `fetchYouTubeTrailer(name)` that searches the web for `${name} movie trailer youtube` using the user's configured organic search engine (either the self-hosted **SearXNG** instance or **Google Custom Search Engine**).
* It scans the search results and extracts the first valid YouTube watch URL, embedding it directly into the item detail record.

---

## 4. Cleaning up Settings and UI
With TMDB removed, we cleaned up the administration panel and API routes:
* **UI Cleanup**: We removed the *The Movie Database (TMDB) API Key* input field from the Settings page.
* **API Cleanups**: We removed `tmdbApiKey` from the backend settings configuration schemas (`/api/settings` GET and PUT routes).
* **Worker Cleanup**: We deleted all references to `process.env.TMDB_API_KEY` and the state-restoring environment logic in the background sync queue.

---

## 5. Implementing Unit Tests
To ensure the new Wikipedia and YouTube search integrations are robust, we created a new test suite at `web/tests/wikipedia-movie.test.js`. 

The test suite mocks `axios` web calls to:
* Validate that `fetchWikipediaMovieMetadata` queries Wikipedia search, resolves article pages, and correctly parses plots and thumbnail images.
* Validate that `fetchYouTubeTrailer` uses the organic search mapping to identify valid YouTube URLs.

All tests passed successfully:
```powershell
node --test tests/wikipedia-movie.test.js
```
```
▶ Wikipedia Movie Metadata & YouTube Trailer fetching
  ✔ fetchWikipediaMovieMetadata queries Wikipedia search and retrieve details/image (0.8853ms)
  ✔ fetchYouTubeTrailer finds youtube URLs in search results (1.5697ms)
  ✔ Cleanup and restore axios (0.1797ms)
✔ Wikipedia Movie Metadata & YouTube Trailer fetching (3.6609ms)
```

With these updates, the inventory system remains incredibly powerful, automatically enriching your scanned media catalogs with plots and artwork while keeping the codebase 100% compliant, keyless, and safe to sell.
