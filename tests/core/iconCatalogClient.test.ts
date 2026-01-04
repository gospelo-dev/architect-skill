import { describe, expect, test, beforeEach, mock } from 'bun:test';
import {
  IconCatalogClient,
  DEFAULT_CDN_CONFIG,
  type CatalogIndex,
  type ProvidersResponse,
  type CategoryIndex,
  type CategoryResponse,
} from '../../src/core/iconCatalogClient';
import { CDN_URLS, CDN_DEFAULTS } from '../../src/core/config';

describe('IconCatalogClient', () => {
  describe('DEFAULT_CDN_CONFIG', () => {
    test('should have correct baseUrl from config', () => {
      expect(DEFAULT_CDN_CONFIG.baseUrl).toBe(CDN_URLS.ICON_CATALOG_BASE);
    });

    test('should have version from config', () => {
      expect(DEFAULT_CDN_CONFIG.version).toBe(CDN_DEFAULTS.VERSION);
    });

    test('should have cache duration from config', () => {
      expect(DEFAULT_CDN_CONFIG.cacheDuration).toBe(CDN_DEFAULTS.CACHE_DURATION_MS);
    });
  });

  describe('constructor', () => {
    test('should create client with default config', () => {
      const client = new IconCatalogClient();
      expect(client).toBeDefined();
    });

    test('should create client with custom config', () => {
      const client = new IconCatalogClient({
        baseUrl: 'https://custom.example.com',
        version: 'v2',
      });
      expect(client).toBeDefined();
    });

    test('should merge custom config with defaults', () => {
      const client = new IconCatalogClient({
        version: 'v2',
      });
      expect(client).toBeDefined();
    });
  });

  describe('URL generation', () => {
    test('should generate correct index URL', async () => {
      const client = new IconCatalogClient();
      let fetchedUrl = '';

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url: string | URL | Request) => {
        fetchedUrl = url.toString();
        return new Response(JSON.stringify({ name: 'test' }), { status: 200 });
      };

      try {
        await client.fetchIndex();
        expect(fetchedUrl).toBe(`${CDN_URLS.ICON_CATALOG_BASE}/api/icons/index.json`);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('should generate correct providers URL', async () => {
      const client = new IconCatalogClient();
      let fetchedUrl = '';

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url: string | URL | Request) => {
        fetchedUrl = url.toString();
        return new Response(JSON.stringify({ providers: [] }), { status: 200 });
      };

      try {
        await client.fetchProviders();
        expect(fetchedUrl).toBe(`${CDN_URLS.ICON_CATALOG_BASE}/api/icons/${CDN_DEFAULTS.VERSION}/_providers.json`);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('should generate correct category index URL', async () => {
      const client = new IconCatalogClient();
      let fetchedUrl = '';

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url: string | URL | Request) => {
        fetchedUrl = url.toString();
        return new Response(JSON.stringify({ provider: 'aws', categories: [] }), { status: 200 });
      };

      try {
        await client.fetchCategoryIndex('aws');
        expect(fetchedUrl).toBe(`${CDN_URLS.ICON_CATALOG_BASE}/api/icons/${CDN_DEFAULTS.VERSION}/aws/_index.json`);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('should generate correct category URL', async () => {
      const client = new IconCatalogClient();
      let fetchedUrl = '';

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url: string | URL | Request) => {
        fetchedUrl = url.toString();
        return new Response(JSON.stringify({ category: 'compute', count: 0, icons: [] }), { status: 200 });
      };

      try {
        await client.fetchCategory('aws', 'compute');
        expect(fetchedUrl).toBe(`${CDN_URLS.ICON_CATALOG_BASE}/api/icons/${CDN_DEFAULTS.VERSION}/aws/compute.json`);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('caching', () => {
    test('should cache responses', async () => {
      const client = new IconCatalogClient({ cacheDuration: 60000 });
      let fetchCount = 0;

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        fetchCount++;
        return new Response(JSON.stringify({ name: 'test' }), { status: 200 });
      };

      try {
        await client.fetchIndex();
        await client.fetchIndex();
        expect(fetchCount).toBe(1);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('should clear cache', async () => {
      const client = new IconCatalogClient({ cacheDuration: 60000 });
      let fetchCount = 0;

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        fetchCount++;
        return new Response(JSON.stringify({ name: 'test' }), { status: 200 });
      };

      try {
        await client.fetchIndex();
        client.clearCache();
        await client.fetchIndex();
        expect(fetchCount).toBe(2);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('error handling', () => {
    test('should throw error on failed fetch', async () => {
      const client = new IconCatalogClient();

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        return new Response('Not Found', { status: 404, statusText: 'Not Found' });
      };

      try {
        await expect(client.fetchIndex()).rejects.toThrow('Failed to fetch');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('setConfig', () => {
    test('should update config and clear cache', async () => {
      const client = new IconCatalogClient();
      let fetchCount = 0;

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        fetchCount++;
        return new Response(JSON.stringify({ name: 'test' }), { status: 200 });
      };

      try {
        await client.fetchIndex();
        client.setConfig({ version: 'v2' });
        await client.fetchIndex();
        expect(fetchCount).toBe(2);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('fetchAllIcons', () => {
    test('should fetch all icons for a provider', async () => {
      const client = new IconCatalogClient();

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes('_index.json')) {
          return new Response(JSON.stringify({
            provider: 'aws',
            categories: ['compute', 'storage'],
          }), { status: 200 });
        }
        if (urlStr.includes('compute.json')) {
          return new Response(JSON.stringify({
            category: 'compute',
            count: 1,
            icons: [{ slug: 'lambda', displayName: 'Lambda', url: 'https://example.com/lambda.svg' }],
          }), { status: 200 });
        }
        if (urlStr.includes('storage.json')) {
          return new Response(JSON.stringify({
            category: 'storage',
            count: 1,
            icons: [{ slug: 's3', displayName: 'S3', url: 'https://example.com/s3.svg' }],
          }), { status: 200 });
        }
        return new Response('Not Found', { status: 404 });
      };

      try {
        const icons = await client.fetchAllIcons('aws');
        expect(icons.size).toBe(2);
        expect(icons.get('aws:lambda')).toBe('https://example.com/lambda.svg');
        expect(icons.get('aws:s3')).toBe('https://example.com/s3.svg');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('fetchIconUrlMap', () => {
    test('should fetch complete icon URL map', async () => {
      const client = new IconCatalogClient();

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes('_providers.json')) {
          return new Response(JSON.stringify({
            providers: ['aws'],
            sources: {},
          }), { status: 200 });
        }
        if (urlStr.includes('_index.json')) {
          return new Response(JSON.stringify({
            provider: 'aws',
            categories: ['compute'],
          }), { status: 200 });
        }
        if (urlStr.includes('compute.json')) {
          return new Response(JSON.stringify({
            category: 'compute',
            count: 1,
            icons: [{ slug: 'lambda', displayName: 'Lambda', url: 'https://example.com/lambda.svg' }],
          }), { status: 200 });
        }
        return new Response('Not Found', { status: 404 });
      };

      try {
        const urlMap = await client.fetchIconUrlMap();
        expect(urlMap['aws:lambda']).toBe('https://example.com/lambda.svg');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
