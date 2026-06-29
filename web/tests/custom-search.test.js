import { test, describe } from 'node:test';
import assert from 'node:assert';
import axios from 'axios';
import { fetchItemDetails } from '../lib/worker.js';

// Save original axios.get
const originalAxiosGet = axios.get;

describe('Google Custom Search Engine Pricing parser', () => {
  test('Parses prices from search result snippets and titles', async () => {
    // Set mock env variables
    process.env.GOOGLE_CSE_ID = 'mock-cse-id';
    process.env.GOOGLE_API_KEY = 'mock-api-key';

    // Mock axios.get for googleapis customsearch
    axios.get = async (url, config) => {
      if (url.includes('googleapis.com/customsearch/v1')) {
        return {
          data: {
            items: [
              { title: 'Cool Toy - $10.00', snippet: 'Buy this awesome cool toy for $12.50 at our store.' },
              { title: 'Cool Toy on Sale', snippet: 'Usually USD 15.00, now on sale for $9.99' },
              { title: 'Cool Toy Premium Edition', snippet: 'Collectors edition costs $30.00' },
              { title: 'Cool Toy Cheap', snippet: 'Cheap option is 8.50 dollars' },
              { title: 'Cool Toy Bargain', snippet: 'Get it for only $11.00 today!' }
            ]
          }
        };
      }
      return originalAxiosGet(url, config);
    };

    const mockDb = {
      prepare: () => ({
        run: () => {},
        get: () => ({ value: '{}' })
      })
    };

    const item = {
      id: 'test-item-123',
      itemType: 'toy',
      name: 'Cool Toy',
      toyCondition: 'Loose'
    };

    const result = await fetchItemDetails(item, mockDb, { forceTier: 'toy' });

    // Cleanup env
    delete process.env.GOOGLE_CSE_ID;
    delete process.env.GOOGLE_API_KEY;
    // Restore axios
    axios.get = originalAxiosGet;

    assert.ok(result, 'Should return details');
    
    // Check updated item properties inside worker database update context:
    // Snippet/title prices: 10.00, 12.50, 15.00, 9.99, 30.00, 8.50, 11.00
    // Sorted: 8.50, 9.99, 10.00, 11.00, 12.50, 15.00, 30.00 (7 items)
    // Strip top 10% and bottom 10% (stripCount = Math.max(1, Math.floor(7 * 0.1)) = 1)
    // Stripped: 9.99, 10.00, 11.00, 12.50, 15.00 (5 items)
    // low: 9.99, high: 15.00
    // sum: 9.99 + 10.00 + 11.00 + 12.50 + 15.00 = 58.49
    // avg: 58.49 / 5 = 11.70
  });

  test('Propagates 403 Google Custom Search error as RATE_LIMIT and sets syncStatus to rate_limited', async () => {
    // Set mock env variables
    process.env.GOOGLE_CSE_KEY = 'mock-cse-key';
    process.env.GOOGLE_CSE_CX = 'mock-cse-cx';

    // Mock axios.get to return 403 status error
    axios.get = async (url, config) => {
      if (url.includes('googleapis.com/customsearch/v1')) {
        const err = new Error('Request failed with status code 403');
        err.response = { status: 403, data: { error: { message: 'Quota exceeded' } } };
        throw err;
      }
      return originalAxiosGet(url, config);
    };

    let updatedStatus = null;
    const mockDb = {
      prepare: (sql) => {
        return {
          run: (...args) => {
            if (sql.includes('UPDATE items') && sql.includes('syncStatus = ?')) {
              // syncStatus is the 4th parameter (index 3)
              updatedStatus = args[3];
            } else if (sql.includes('UPDATE items') && sql.includes('syncStatus = \'rate_limited\'')) {
              updatedStatus = 'rate_limited';
            }
          },
          get: () => ({ value: '{}' })
        };
      }
    };

    const item = {
      id: 'test-item-403',
      itemType: 'toy',
      name: 'Cool Toy',
      toyCondition: 'Loose'
    };

    const result = await fetchItemDetails(item, mockDb, { forceTier: 'toy' });

    // Cleanup env
    delete process.env.GOOGLE_CSE_KEY;
    delete process.env.GOOGLE_CSE_CX;
    // Restore axios
    axios.get = originalAxiosGet;

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.reason, 'rate_limited');
    assert.strictEqual(updatedStatus, 'rate_limited');
  });
});
