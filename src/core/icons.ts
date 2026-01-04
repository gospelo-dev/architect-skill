/**
 * Icon URL resolution for external icon references
 * Supports AWS, Azure, Google Cloud, and Tech Stack icons
 *
 * Icon catalog is fetched from CDN (configured in config.ts)
 * The catalog is cached in memory for performance.
 *
 * CDN Strategy for Web Claude compatibility:
 * - Primary: raw.githubusercontent.com (AWS, GCP icons)
 * - Secondary: cdn.jsdelivr.net (Azure, Tech Stack icons)
 *
 * Copyright (c) 2025 Gorosun (NoStudio LLC)
 */

import { getIconCatalogClient } from './iconCatalogClient';
import { REQUIRED_EXTERNAL_DOMAINS } from './config';

export interface IconProvider {
  name: string;
  baseUrl: string;
  resolver: (iconName: string) => string;
}

/**
 * Required external domains for Web Claude configuration
 * Re-exported from config for backwards compatibility
 */
export const REQUIRED_DOMAINS = REQUIRED_EXTERNAL_DOMAINS;

/**
 * In-memory cache for icon URL map (populated from CDN)
 */
let iconUrlMapCache: Record<string, string> | null = null;
let iconUrlMapPromise: Promise<Record<string, string>> | null = null;

/**
 * Load icon URL map from CDN
 * @returns Promise that resolves to icon URL map
 */
export async function loadIconUrlMap(): Promise<Record<string, string>> {
  if (iconUrlMapCache) {
    return iconUrlMapCache;
  }

  if (iconUrlMapPromise) {
    return iconUrlMapPromise;
  }

  iconUrlMapPromise = getIconCatalogClient()
    .fetchIconUrlMap()
    .then((urlMap) => {
      iconUrlMapCache = urlMap;
      return urlMap;
    })
    .catch((error) => {
      console.warn('Failed to load icon catalog from CDN:', error);
      iconUrlMapCache = {};
      return {};
    });

  return iconUrlMapPromise;
}

/**
 * Preload icon catalog from CDN (call this early to improve performance)
 */
export function preloadIconCatalog(): void {
  loadIconUrlMap();
}

/**
 * Parse icon ID into provider and name
 * @param iconId - Icon ID in format "provider:name" (e.g., "aws:lambda")
 * @returns Tuple of [provider, name] or null if invalid
 */
export function parseIconId(iconId: string): [string, string] | null {
  const parts = iconId.split(':');
  if (parts.length !== 2) {
    return null;
  }
  return [parts[0], parts[1]];
}

/**
 * Resolve icon ID to external URL (async version - uses CDN catalog)
 * @param iconId - Icon ID in format "provider:name"
 * @returns Promise that resolves to external URL or null if not found
 */
export async function resolveIconUrlAsync(iconId: string): Promise<string | null> {
  const urlMap = await loadIconUrlMap();
  const catalogUrl = urlMap[iconId];
  if (catalogUrl) {
    return catalogUrl;
  }

  // Fallback for icons not in catalog
  const parsed = parseIconId(iconId);
  if (!parsed) {
    return null;
  }

  const [providerName, iconName] = parsed;
  return generateFallbackUrl(providerName, iconName);
}

/**
 * Resolve icon ID to external URL (sync version - uses cached catalog or fallback)
 * Note: Call preloadIconCatalog() or loadIconUrlMap() early for best results
 * @param iconId - Icon ID in format "provider:name"
 * @returns External URL or null if not found
 */
export function resolveIconUrl(iconId: string): string | null {
  // Try cached catalog first
  if (iconUrlMapCache) {
    const catalogUrl = iconUrlMapCache[iconId];
    if (catalogUrl) {
      return catalogUrl;
    }
  }

  // Fallback for icons not in catalog or cache not loaded
  const parsed = parseIconId(iconId);
  if (!parsed) {
    return null;
  }

  const [providerName, iconName] = parsed;
  return generateFallbackUrl(providerName, iconName);
}

/**
 * Generate fallback URL for icons not in catalog
 */
function generateFallbackUrl(provider: string, iconName: string): string | null {
  const formatted = iconName
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');

  switch (provider) {
    case 'aws':
      return `https://raw.githubusercontent.com/AwesomeLogos/aws-icons/main/docs/images/Architecture-Service-Icons/Arch_Compute/64/Arch_AWS-${formatted}_64.svg`;
    case 'azure':
      return `https://cdn.jsdelivr.net/gh/benc-uk/icon-collection/azure-icons/${formatted}.svg`;
    case 'google-cloud':
      return `https://raw.githubusercontent.com/AwesomeLogos/google-cloud-icons/main/icons/${formatted}.svg`;
    case 'tech-stack':
      return `https://cdn.jsdelivr.net/npm/simple-icons/icons/${iconName.toLowerCase()}.svg`;
    default:
      return null;
  }
}

/**
 * Get all available providers
 */
export function getProviders(): string[] {
  return ['aws', 'azure', 'google-cloud', 'tech-stack'];
}

/**
 * Register a custom icon provider (for extensibility)
 */
const customProviders: Map<string, IconProvider> = new Map();

export function registerProvider(provider: IconProvider): void {
  customProviders.set(provider.name, provider);
}

/**
 * Generate SVG fallback placeholder for missing icons
 */
export function generateFallbackSvg(iconId: string): string {
  const label = iconId.split(':').pop() || '?';
  const shortLabel = label.substring(0, 3).toUpperCase();

  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <rect width="48" height="48" fill="#f5f5f5" stroke="#666" stroke-dasharray="4" rx="4"/>
  <text x="24" y="28" text-anchor="middle" font-size="10" fill="#666">${shortLabel}</text>
</svg>`;
}

/**
 * Clear the icon URL cache (useful for testing or forcing refresh)
 */
export function clearIconCache(): void {
  iconUrlMapCache = null;
  iconUrlMapPromise = null;
  getIconCatalogClient().clearCache();
}
