# SearXNG Engine Stabilization, Year-Number Filters & Market Value Optimizations

We are excited to share a major update focusing on **SearXNG Engine Stabilization, Intelligent Year-Number Price Filtering, and Market Value Optimizations**! This update drastically improves market pricing accuracy and fixes connection issues during bulk inventory refreshes.

---

## ⚡ 1. SearXNG Engine Pacing & 10s Timeout Fixes
- **10-Second Engine Timeouts**: Updated `settings.yml` to increase SearXNG engine request timeouts from 3.0s to 10.0s, completely eliminating `httpx.ConnectTimeout` errors for DuckDuckGo, Bing, Yahoo, Startpage, and Qwant.
- **1000ms Request Pacing**: Added a 1-second pace delay between worker query executions to prevent search engines (Google, Startpage, Brave) from issuing CAPTCHA suspensions or rate-limiting IP addresses during bulk refreshes.
- **Container Health Warnings**: Added automatic `ECONNREFUSED` connection checks to log clear warnings in the console if the local SearXNG Docker container is stopped.
- **HTML Search Fallback**: Added automatic HTML search page parsing as a fallback if JSON API endpoints are disabled.

---

## 🎯 2. Intelligent Year-Number Price Filtering
- **Release Year Protection**: Fixed an issue where manufacturing/edition years in item titles (e.g. `1975`, `1998`, `1999`, `2001`, `2004`) were being extracted as `$1,999.00` price tags. Integer numbers between 1900 and 2035 are now recognized as dates rather than dollar values.
- **Preserving Exact Title Searches**: Queries for year-specific editions (e.g., `"1999 Coca Cola 600 Pace car"` vs `"2001 Coca Cola 600 Pace car"`) retain their full exact title for accurate active online listing lookups.
- **High-Value Item Preservation**: Ensured genuine high-end market prices (e.g., $12,000 for PSA-graded cards, rare uncirculated coins, or antique bottles) remain preserved in `valueHigh` without artificial caps.

---

## 🧹 3. Title Sanitization & Query Streamlining
- **Media Extension Stripping**: Implemented `sanitizeTitleForSearch` to automatically strip file extensions (`.MP`, `.MP4`, `.JPG`, `.PNG`) and bracketed file metadata before submitting search queries.
- **Loop Optimization**: Streamlined bottle, toy, video game, coin, comic, and card market value helpers to eliminate duplicate fallback query loops.
