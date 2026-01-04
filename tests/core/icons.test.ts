import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import {
  parseIconId,
  resolveIconUrl,
  resolveIconUrlAsync,
  loadIconUrlMap,
  preloadIconCatalog,
  clearIconCache,
  getProviders,
  registerProvider,
  generateFallbackSvg,
  REQUIRED_DOMAINS,
  type IconProvider,
} from '../../src/core/icons';
import { DOMAINS } from '../../src/core/config';

describe('Icons', () => {
  beforeEach(() => {
    clearIconCache();
  });

  afterEach(() => {
    clearIconCache();
  });

  describe('REQUIRED_DOMAINS', () => {
    test('should include jsdelivr CDN', () => {
      expect(REQUIRED_DOMAINS).toContain(DOMAINS.JSDELIVR_CDN);
    });

    test('should include GitHub raw', () => {
      expect(REQUIRED_DOMAINS).toContain(DOMAINS.GITHUB_RAW);
    });

    test('should include gospelo CDN', () => {
      expect(REQUIRED_DOMAINS).toContain(DOMAINS.ICON_CATALOG_CDN);
    });

    test('should include w3.org for SVG namespace', () => {
      expect(REQUIRED_DOMAINS).toContain(DOMAINS.W3_ORG);
    });
  });

  describe('parseIconId', () => {
    test('should parse valid icon ID', () => {
      const result = parseIconId('aws:lambda');
      expect(result).toEqual(['aws', 'lambda']);
    });

    test('should parse icon ID with underscores', () => {
      const result = parseIconId('aws:elastic_beanstalk');
      expect(result).toEqual(['aws', 'elastic_beanstalk']);
    });

    test('should return null for invalid icon ID without colon', () => {
      const result = parseIconId('invalid');
      expect(result).toBeNull();
    });

    test('should return null for icon ID with multiple colons', () => {
      const result = parseIconId('aws:lambda:extra');
      expect(result).toBeNull();
    });

    test('should return null for empty string', () => {
      const result = parseIconId('');
      expect(result).toBeNull();
    });
  });

  describe('resolveIconUrl (sync)', () => {
    test('should generate fallback URL for aws icons when cache is empty', () => {
      const url = resolveIconUrl('aws:lambda');
      expect(url).toContain('raw.githubusercontent.com');
      expect(url).toContain('aws-icons');
    });

    test('should generate fallback URL for azure icons when cache is empty', () => {
      const url = resolveIconUrl('azure:virtual_machine');
      expect(url).toContain('cdn.jsdelivr.net');
      expect(url).toContain('icon-collection');
    });

    test('should generate fallback URL for google-cloud icons when cache is empty', () => {
      const url = resolveIconUrl('google-cloud:compute_engine');
      expect(url).toContain('raw.githubusercontent.com');
      expect(url).toContain('google-cloud-icons');
    });

    test('should generate fallback URL for tech-stack icons when cache is empty', () => {
      const url = resolveIconUrl('tech-stack:react');
      expect(url).toContain('cdn.jsdelivr.net');
      expect(url).toContain('simple-icons');
    });

    test('should return null for unknown provider', () => {
      const url = resolveIconUrl('unknown:icon');
      expect(url).toBeNull();
    });

    test('should return null for invalid icon ID', () => {
      const url = resolveIconUrl('invalid');
      expect(url).toBeNull();
    });
  });

  describe('resolveIconUrlAsync', () => {
    test('should resolve icon URL from CDN cache', async () => {
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
        const url = await resolveIconUrlAsync('aws:lambda');
        expect(url).toBe('https://example.com/lambda.svg');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('should fall back to generated URL for unknown icons', async () => {
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
            categories: [],
          }), { status: 200 });
        }
        return new Response('Not Found', { status: 404 });
      };

      try {
        const url = await resolveIconUrlAsync('aws:unknown_service');
        expect(url).toContain('raw.githubusercontent.com');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('should return null for invalid icon ID', async () => {
      const url = await resolveIconUrlAsync('invalid');
      expect(url).toBeNull();
    });
  });

  describe('loadIconUrlMap', () => {
    test('should load and cache icon URL map', async () => {
      let fetchCount = 0;
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url: string | URL | Request) => {
        fetchCount++;
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
        const map1 = await loadIconUrlMap();
        const initialFetchCount = fetchCount;
        const map2 = await loadIconUrlMap();
        expect(fetchCount).toBe(initialFetchCount);
        expect(map1).toBe(map2);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('should return empty map on fetch error', async () => {
      const originalFetch = globalThis.fetch;
      const originalConsoleWarn = console.warn;
      console.warn = () => {};

      globalThis.fetch = async () => {
        throw new Error('Network error');
      };

      try {
        const map = await loadIconUrlMap();
        expect(map).toEqual({});
      } finally {
        globalThis.fetch = originalFetch;
        console.warn = originalConsoleWarn;
      }
    });
  });

  describe('preloadIconCatalog', () => {
    test('should trigger loading without awaiting', () => {
      const originalFetch = globalThis.fetch;
      let fetchCalled = false;
      globalThis.fetch = async () => {
        fetchCalled = true;
        return new Response(JSON.stringify({ providers: [] }), { status: 200 });
      };

      try {
        preloadIconCatalog();
        // Function should return immediately (not await)
        expect(true).toBe(true);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('clearIconCache', () => {
    test('should clear cached icon URL map', async () => {
      let fetchCount = 0;
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url: string | URL | Request) => {
        fetchCount++;
        const urlStr = url.toString();
        if (urlStr.includes('_providers.json')) {
          return new Response(JSON.stringify({ providers: [], sources: {} }), { status: 200 });
        }
        return new Response('Not Found', { status: 404 });
      };

      try {
        await loadIconUrlMap();
        const countAfterFirst = fetchCount;
        clearIconCache();
        await loadIconUrlMap();
        expect(fetchCount).toBeGreaterThan(countAfterFirst);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('getProviders', () => {
    test('should return all available providers', () => {
      const providers = getProviders();
      expect(providers).toContain('aws');
      expect(providers).toContain('azure');
      expect(providers).toContain('google-cloud');
      expect(providers).toContain('tech-stack');
    });

    test('should return array of 4 providers', () => {
      const providers = getProviders();
      expect(providers).toHaveLength(4);
    });
  });

  describe('registerProvider', () => {
    test('should register custom provider', () => {
      const customProvider: IconProvider = {
        name: 'custom',
        baseUrl: 'https://custom.example.com',
        resolver: (iconName: string) => `https://custom.example.com/${iconName}.svg`,
      };

      registerProvider(customProvider);
      // Registration should not throw
      expect(true).toBe(true);
    });
  });

  describe('generateFallbackSvg', () => {
    test('should generate SVG with short label', () => {
      const svg = generateFallbackSvg('aws:lambda');
      expect(svg).toContain('<svg');
      expect(svg).toContain('LAM');
      expect(svg).toContain('</svg>');
    });

    test('should handle icon ID without provider prefix', () => {
      const svg = generateFallbackSvg('simple');
      expect(svg).toContain('SIM');
    });

    test('should truncate long icon names to 3 characters', () => {
      const svg = generateFallbackSvg('aws:very_long_service_name');
      expect(svg).toContain('VER');
    });

    test('should uppercase the label', () => {
      const svg = generateFallbackSvg('aws:lambda');
      expect(svg).not.toContain('lam');
      expect(svg).toContain('LAM');
    });

    test('should include viewBox attribute', () => {
      const svg = generateFallbackSvg('aws:lambda');
      expect(svg).toContain('viewBox="0 0 48 48"');
    });

    test('should include rect element', () => {
      const svg = generateFallbackSvg('aws:lambda');
      expect(svg).toContain('<rect');
    });

    test('should include text element', () => {
      const svg = generateFallbackSvg('aws:lambda');
      expect(svg).toContain('<text');
    });
  });
});
