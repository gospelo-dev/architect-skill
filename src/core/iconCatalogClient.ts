/**
 * Icon Catalog CDN Client
 * Fetches icon catalog from gospelo-architect CDN
 *
 * Copyright (c) 2025 Gorosun (NoStudio LLC)
 */

import { CDN_URLS, CDN_DEFAULTS } from './config';

/**
 * CDN configuration
 */
export interface CdnConfig {
  /** Base URL for the icon catalog CDN */
  baseUrl: string;
  /** API version to use */
  version: string;
  /** Cache duration in milliseconds (default: 1 hour) */
  cacheDuration?: number;
}

/**
 * Default CDN configuration
 */
export const DEFAULT_CDN_CONFIG: CdnConfig = {
  baseUrl: CDN_URLS.ICON_CATALOG_BASE,
  version: CDN_DEFAULTS.VERSION,
  cacheDuration: CDN_DEFAULTS.CACHE_DURATION_MS,
};

/**
 * Icon catalog index response
 */
export interface CatalogIndex {
  name: string;
  description: string;
  copyright: string;
  license: string;
  latestVersion: string;
  versions: Record<string, {
    releaseDate: string;
    catalogUrl: string;
    providers: string[];
    totalIcons: number;
  }>;
  terms: {
    usage: string;
    restrictions: string[];
  };
}

/**
 * Provider source information
 */
export interface ProviderSource {
  repository: string;
  commitId: string;
  commitDate: string;
  lastUpdated: string;
}

/**
 * Providers response
 */
export interface ProvidersResponse {
  providers: string[];
  sources: Record<string, ProviderSource>;
}

/**
 * Icon entry in category
 */
export interface IconEntry {
  slug: string;
  displayName: string;
  url: string;
}

/**
 * Category response
 */
export interface CategoryResponse {
  category: string;
  count: number;
  icons: IconEntry[];
}

/**
 * Category index response
 */
export interface CategoryIndex {
  provider: string;
  categories: string[];
}

/**
 * Cached data with timestamp
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Icon Catalog CDN Client
 */
export class IconCatalogClient {
  private config: CdnConfig;
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  constructor(config: Partial<CdnConfig> = {}) {
    this.config = { ...DEFAULT_CDN_CONFIG, ...config };
  }

  /**
   * Get the base API URL
   */
  private getApiUrl(path: string): string {
    return `${this.config.baseUrl}/api/icons/${path}`;
  }

  /**
   * Get versioned API URL
   */
  private getVersionedUrl(path: string): string {
    return `${this.config.baseUrl}/api/icons/${this.config.version}/${path}`;
  }

  /**
   * Fetch with caching
   */
  private async fetchWithCache<T>(url: string): Promise<T> {
    const cached = this.cache.get(url) as CacheEntry<T> | undefined;
    const now = Date.now();

    if (cached && now - cached.timestamp < (this.config.cacheDuration || 0)) {
      return cached.data;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as T;
    this.cache.set(url, { data, timestamp: now });
    return data;
  }

  /**
   * Fetch catalog index
   */
  async fetchIndex(): Promise<CatalogIndex> {
    return this.fetchWithCache<CatalogIndex>(this.getApiUrl('index.json'));
  }

  /**
   * Fetch providers list
   */
  async fetchProviders(): Promise<ProvidersResponse> {
    return this.fetchWithCache<ProvidersResponse>(this.getVersionedUrl('_providers.json'));
  }

  /**
   * Fetch category index for a provider
   */
  async fetchCategoryIndex(provider: string): Promise<CategoryIndex> {
    return this.fetchWithCache<CategoryIndex>(this.getVersionedUrl(`${provider}/_index.json`));
  }

  /**
   * Fetch icons for a specific category
   */
  async fetchCategory(provider: string, category: string): Promise<CategoryResponse> {
    return this.fetchWithCache<CategoryResponse>(this.getVersionedUrl(`${provider}/${category}.json`));
  }

  /**
   * Fetch all icons for a provider
   */
  async fetchAllIcons(provider: string): Promise<Map<string, string>> {
    const iconMap = new Map<string, string>();
    const categoryIndex = await this.fetchCategoryIndex(provider);

    await Promise.all(
      categoryIndex.categories.map(async (categoryName) => {
        // Remove .json extension if present (CDN returns category names with .json)
        const category = categoryName.replace(/\.json$/, '');
        const categoryData = await this.fetchCategory(provider, category);
        for (const icon of categoryData.icons) {
          iconMap.set(`${provider}:${icon.slug}`, icon.url);
        }
      })
    );

    return iconMap;
  }

  /**
   * Fetch complete icon URL map for all providers
   */
  async fetchIconUrlMap(): Promise<Record<string, string>> {
    const providers = await this.fetchProviders();
    const urlMap: Record<string, string> = {};

    await Promise.all(
      providers.providers.map(async (provider) => {
        const icons = await this.fetchAllIcons(provider);
        icons.forEach((url, id) => {
          urlMap[id] = url;
        });
      })
    );

    return urlMap;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Set CDN configuration
   */
  setConfig(config: Partial<CdnConfig>): void {
    this.config = { ...this.config, ...config };
    this.clearCache();
  }
}

/**
 * Default client instance
 */
let defaultClient: IconCatalogClient | null = null;

/**
 * Get default client instance
 */
export function getIconCatalogClient(): IconCatalogClient {
  if (!defaultClient) {
    defaultClient = new IconCatalogClient();
  }
  return defaultClient;
}

/**
 * Configure the default client
 */
export function configureIconCatalog(config: Partial<CdnConfig>): void {
  getIconCatalogClient().setConfig(config);
}
