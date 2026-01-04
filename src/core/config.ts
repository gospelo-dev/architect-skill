/**
 * Configuration constants for gospelo-architect
 *
 * This file centralizes all configurable values like domains, URLs, and settings.
 * Update this file when domain names or CDN endpoints change.
 *
 * Copyright (c) 2025 Gorosun (NoStudio LLC)
 */

/**
 * Domain configuration
 */
export const DOMAINS = {
  /** Icon catalog CDN domain */
  ICON_CATALOG_CDN: 'architect.gospelo.dev',

  /** External CDN for Azure and Tech Stack icons */
  JSDELIVR_CDN: 'cdn.jsdelivr.net',

  /** External CDN for AWS and Google Cloud icons */
  GITHUB_RAW: 'raw.githubusercontent.com',

  /** W3C domain for SVG namespace definitions */
  W3_ORG: 'w3.org',
} as const;

/**
 * Full URLs for CDN endpoints
 */
export const CDN_URLS = {
  /** Icon catalog API base URL */
  ICON_CATALOG_BASE: `https://${DOMAINS.ICON_CATALOG_CDN}`,
} as const;

/**
 * Required external domains for Web Claude configuration
 * These domains must be allowed for icons to load correctly
 */
export const REQUIRED_EXTERNAL_DOMAINS = [
  DOMAINS.JSDELIVR_CDN,      // Azure, Tech Stack icons
  DOMAINS.GITHUB_RAW,        // AWS, Google Cloud icons
  DOMAINS.ICON_CATALOG_CDN,  // Icon catalog CDN
  DOMAINS.W3_ORG,            // SVG namespace definitions
] as const;

/**
 * Default CDN configuration values
 */
export const CDN_DEFAULTS = {
  /** Default API version */
  VERSION: 'v1',

  /** Default cache duration in milliseconds (1 hour) */
  CACHE_DURATION_MS: 60 * 60 * 1000,
} as const;
