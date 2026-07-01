import { test, describe } from 'node:test';
import assert from 'node:assert';
import axios from 'axios';
import { fetchWikipediaMovieMetadata, fetchYouTubeTrailer } from '../lib/worker.js';

const originalAxiosGet = axios.get;

describe('Wikipedia Movie Metadata & YouTube Trailer fetching', () => {
  test('fetchWikipediaMovieMetadata queries Wikipedia search and retrieve details/image', async () => {
    axios.get = async (url) => {
      if (url.includes('action=query&list=search')) {
        return {
          data: {
            query: {
              search: [
                { title: 'The Matrix (film)' }
              ]
            }
          }
        };
      }
      if (url.includes('prop=extracts|pageimages|info')) {
        return {
          data: {
            query: {
              pages: {
                '12345': {
                  extract: 'The Matrix is a 1999 science fiction action film...',
                  thumbnail: {
                    source: 'https://upload.wikimedia.org/wikipedia/en/c/c1/The_Matrix_Poster.jpg'
                  },
                  canonicalurl: 'https://en.wikipedia.org/wiki/The_Matrix'
                }
              }
            }
          }
        };
      }
      return { data: {} };
    };

    const metadata = await fetchWikipediaMovieMetadata('The Matrix');

    assert.ok(metadata, 'Should return metadata');
    assert.strictEqual(metadata.moviePlot, 'The Matrix is a 1999 science fiction action film...');
    assert.strictEqual(metadata.movieImage, 'https://upload.wikimedia.org/wikipedia/en/c/c1/The_Matrix_Poster.jpg');
    assert.strictEqual(metadata.movieCast, null);
  });

  test('fetchYouTubeTrailer finds youtube URLs in search results', async () => {
    process.env.SEARXNG_URL = 'http://localhost:8080';

    axios.get = async (url) => {
      if (url.includes('/search?q=')) {
        return {
          data: {
            results: [
              {
                title: 'The Matrix Trailer',
                snippet: 'Watch the trailer on youtube',
                url: 'https://www.youtube.com/watch?v=m8e-FF8MzgU'
              }
            ]
          }
        };
      }
      return { data: {} };
    };

    const trailer = await fetchYouTubeTrailer('The Matrix');

    assert.strictEqual(trailer, 'https://www.youtube.com/watch?v=m8e-FF8MzgU');

    delete process.env.SEARXNG_URL;
  });

  test('Cleanup and restore axios', async () => {
    axios.get = originalAxiosGet;
  });
});
