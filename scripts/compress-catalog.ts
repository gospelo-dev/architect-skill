#!/usr/bin/env bun
/**
 * Compress icon catalog using URL templates and provider metadata
 * This reduces file size by extracting common URL patterns
 */

import { readFileSync, writeFileSync } from 'fs';

const CATALOG_PATH = 'src/data/iconCatalog.ts';
const OUTPUT_PATH = 'src/data/iconCatalogCompressed.ts';

/**
 * URL Template definitions for each provider
 * Templates use placeholders: {category}, {subcategory}, {filename}, {size}
 */
interface UrlTemplate {
  /** Template pattern with placeholders */
  pattern: string;
  /** Default values for placeholders */
  defaults: Record<string, string>;
  /** Description of this template */
  description: string;
}

interface ProviderMetadata {
  /** Base URL for this provider */
  baseUrl: string;
  /** URL templates for different icon types */
  templates: Record<string, UrlTemplate>;
  /** Source repository information */
  source: {
    repository: string;
    commitId: string;
    commitDate: string;
    lastUpdated: string;
  };
}

// Provider metadata with URL templates
const PROVIDER_METADATA: Record<string, ProviderMetadata> = {
  aws: {
    baseUrl: 'https://raw.githubusercontent.com/AwesomeLogos/aws-icons/main/docs/images/',
    templates: {
      // Architecture service icons: {baseUrl}Architecture-Service-Icons/Arch_{category}/{size}/Arch_{filename}_{size}.svg
      'arch': {
        pattern: 'Architecture-Service-Icons/Arch_{category}/{size}/Arch_{filename}_{size}.svg',
        defaults: { size: '64' },
        description: 'AWS Architecture Service Icons',
      },
      // Resource icons: {baseUrl}Resource-Icons/Res_{category}/Res_{filename}_{size}.svg
      'res': {
        pattern: 'Resource-Icons/Res_{category}/Res_{filename}_{size}.svg',
        defaults: { size: '48' },
        description: 'AWS Resource Icons',
      },
      // General resource icons: {baseUrl}Resource-Icons/Res_General-Icons/Res_{size}_Light/Res_{filename}_{size}_Light.svg
      'res-general': {
        pattern: 'Resource-Icons/Res_General-Icons/Res_{size}_Light/Res_{filename}_{size}_Light.svg',
        defaults: { size: '48' },
        description: 'AWS General Resource Icons (Light theme)',
      },
    },
    source: {
      repository: 'https://github.com/AwesomeLogos/aws-icons',
      commitId: 'b60dadba55b9a04faf334401114d529cd93d9748',
      commitDate: '2024-03-11',
      lastUpdated: '2025-01-02',
    },
  },
  azure: {
    baseUrl: 'https://cdn.jsdelivr.net/gh/benc-uk/icon-collection/',
    templates: {
      'default': {
        pattern: 'azure-icons/{filename}.svg',
        defaults: {},
        description: 'Azure Icons',
      },
    },
    source: {
      repository: 'https://github.com/benc-uk/icon-collection',
      commitId: '',
      commitDate: '',
      lastUpdated: '2025-01-02',
    },
  },
  'google-cloud': {
    baseUrl: 'https://raw.githubusercontent.com/AwesomeLogos/google-cloud-icons/main/icons/',
    templates: {
      'default': {
        pattern: '{filename}.svg',
        defaults: {},
        description: 'Google Cloud Icons',
      },
    },
    source: {
      repository: 'https://github.com/AwesomeLogos/google-cloud-icons',
      commitId: '',
      commitDate: '',
      lastUpdated: '2025-01-02',
    },
  },
  'tech-stack': {
    baseUrl: 'https://cdn.jsdelivr.net/npm/simple-icons/icons/',
    templates: {
      'default': {
        pattern: '{filename}.svg',
        defaults: {},
        description: 'Tech Stack Icons (Simple Icons)',
      },
    },
    source: {
      repository: 'https://github.com/simple-icons/simple-icons',
      commitId: '',
      commitDate: '',
      lastUpdated: '2025-01-02',
    },
  },
};

/**
 * Compressed icon entry - stores only variable parts
 */
interface CompressedIconEntry {
  /** Template type (arch, res, res-general, default) */
  t: string;
  /** Category (for AWS icons) */
  c?: string;
  /** Filename (without extension) */
  f: string;
  /** Display name */
  d: string;
  /** Override values for template placeholders */
  o?: Record<string, string>;
}

// Read current catalog and extract iconUrlMap
const content = readFileSync(CATALOG_PATH, 'utf-8');

// Extract iconUrlMap section
const urlMapMatch = content.match(/export const iconUrlMap[^{]*(\{[\s\S]*?\n\};)/);
if (!urlMapMatch) {
  console.error('Could not find iconUrlMap');
  process.exit(1);
}

// Parse the iconUrlMap
const urlMapStr = urlMapMatch[1];
const entries: [string, string][] = [];
const urlMapRegex = /"([^"]+)":\s*"([^"]+)"/g;
let match;

while ((match = urlMapRegex.exec(urlMapStr)) !== null) {
  entries.push([match[1], match[2]]);
}

console.log(`Found ${entries.length} icon URLs`);

/**
 * Analyze URL and extract template type and variables
 */
function analyzeUrl(provider: string, iconId: string, fullUrl: string): CompressedIconEntry | null {
  const metadata = PROVIDER_METADATA[provider];
  if (!metadata) return null;

  const baseUrl = metadata.baseUrl;
  if (!fullUrl.startsWith(baseUrl)) {
    // Full URL doesn't match base, store as-is
    return {
      t: 'full',
      f: fullUrl,
      d: iconId.split(':')[1] || iconId,
    };
  }

  const relativePath = fullUrl.slice(baseUrl.length);

  // Try to match AWS templates
  if (provider === 'aws') {
    // Check for Architecture Service Icons
    const archMatch = relativePath.match(
      /Architecture-Service-Icons\/Arch_([^/]+)\/(\d+)\/Arch_(.+)_(\d+)\.svg/
    );
    if (archMatch) {
      return {
        t: 'arch',
        c: archMatch[1],
        f: archMatch[3],
        d: iconId.split(':')[1] || iconId,
        o: archMatch[2] !== '64' ? { size: archMatch[2] } : undefined,
      };
    }

    // Check for General Resource Icons
    const resGeneralMatch = relativePath.match(
      /Resource-Icons\/Res_General-Icons\/Res_(\d+)_Light\/Res_(.+)_(\d+)_Light\.svg/
    );
    if (resGeneralMatch) {
      return {
        t: 'res-general',
        f: resGeneralMatch[2],
        d: iconId.split(':')[1] || iconId,
        o: resGeneralMatch[1] !== '48' ? { size: resGeneralMatch[1] } : undefined,
      };
    }

    // Check for Resource Icons
    const resMatch = relativePath.match(
      /Resource-Icons\/Res_([^/]+)\/Res_(.+)_(\d+)\.svg/
    );
    if (resMatch) {
      return {
        t: 'res',
        c: resMatch[1],
        f: resMatch[2],
        d: iconId.split(':')[1] || iconId,
        o: resMatch[3] !== '48' ? { size: resMatch[3] } : undefined,
      };
    }
  }

  // Default: store relative path
  const filenameMatch = relativePath.match(/([^/]+)\.svg$/);
  return {
    t: 'default',
    f: filenameMatch ? filenameMatch[1] : relativePath,
    d: iconId.split(':')[1] || iconId,
  };
}

// Compress entries by provider
const compressedByProvider: Record<string, CompressedIconEntry[]> = {};
let savedBytes = 0;

for (const [iconId, fullUrl] of entries) {
  const [provider] = iconId.split(':');

  if (!compressedByProvider[provider]) {
    compressedByProvider[provider] = [];
  }

  const compressed = analyzeUrl(provider, iconId, fullUrl);
  if (compressed) {
    compressedByProvider[provider].push(compressed);
    // Estimate savings
    const compressedSize = JSON.stringify(compressed).length;
    savedBytes += fullUrl.length - compressedSize;
  }
}

console.log(`Estimated savings: ${(savedBytes / 1024).toFixed(1)} KB`);

// Generate compressed output
const output = `/**
 * Compressed icon catalog with URL templates
 * Auto-generated by scripts/compress-catalog.ts - do not edit manually
 *
 * Encoding scheme:
 * - Provider metadata contains base URLs and URL templates
 * - Each icon entry stores only variable parts (template type, category, filename)
 * - Full URLs are resolved at runtime using templates
 */

/**
 * URL Template definition
 */
export interface UrlTemplate {
  /** Template pattern with placeholders: {category}, {subcategory}, {filename}, {size} */
  pattern: string;
  /** Default values for placeholders */
  defaults: Record<string, string>;
  /** Description of this template */
  description: string;
}

/**
 * Provider metadata including base URL and templates
 */
export interface ProviderMetadata {
  /** Base URL for this provider's icons */
  baseUrl: string;
  /** URL templates for different icon types */
  templates: Record<string, UrlTemplate>;
  /** Source repository information */
  source: {
    repository: string;
    commitId: string;
    commitDate: string;
    lastUpdated: string;
  };
}

/**
 * Compressed icon entry
 * Uses short keys to minimize size: t=template, c=category, f=filename, d=displayName, o=overrides
 */
export interface CompressedIconEntry {
  /** Template type (arch, res, res-general, default, full) */
  t: string;
  /** Category (for categorized icons) */
  c?: string;
  /** Filename or full URL (for t='full') */
  f: string;
  /** Display name */
  d: string;
  /** Override values for template placeholders */
  o?: Record<string, string>;
}

/**
 * Provider metadata with URL templates and source information
 */
export const providerMetadata: Record<string, ProviderMetadata> = ${JSON.stringify(PROVIDER_METADATA, null, 2)};

/**
 * Compressed icon entries by provider
 */
export const compressedIcons: Record<string, CompressedIconEntry[]> = ${JSON.stringify(compressedByProvider, null, 2)};

/**
 * Resolve icon entry to full URL using templates
 */
export function resolveIconUrl(provider: string, entry: CompressedIconEntry): string {
  const metadata = providerMetadata[provider];
  if (!metadata) return entry.f;

  // Full URL stored directly
  if (entry.t === 'full') {
    return entry.f;
  }

  const template = metadata.templates[entry.t];
  if (!template) {
    // Fallback: treat f as relative path
    return metadata.baseUrl + entry.f + '.svg';
  }

  // Build URL from template
  let url = template.pattern;
  const values = { ...template.defaults, ...entry.o };

  // Replace placeholders
  url = url.replace(/{category}/g, entry.c || '');
  url = url.replace(/{filename}/g, entry.f);
  url = url.replace(/{size}/g, values.size || '');
  url = url.replace(/{subcategory}/g, values.subcategory || '');

  return metadata.baseUrl + url;
}

/**
 * Build icon ID to URL map (for compatibility with existing code)
 */
export function buildIconUrlMap(): Record<string, string> {
  const map: Record<string, string> = {};

  for (const [provider, entries] of Object.entries(compressedIcons)) {
    for (const entry of entries) {
      const iconId = \`\${provider}:\${entry.d}\`;
      map[iconId] = resolveIconUrl(provider, entry);
    }
  }

  return map;
}

/**
 * Get icon URL by icon ID
 */
export function getIconUrl(iconId: string): string | null {
  const [provider, slug] = iconId.split(':');
  const entries = compressedIcons[provider];
  if (!entries) return null;

  const entry = entries.find(e => e.d === slug);
  if (!entry) return null;

  return resolveIconUrl(provider, entry);
}
`;

writeFileSync(OUTPUT_PATH, output, 'utf-8');

const originalSize = content.length;
const compressedSize = output.length;
const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

console.log(`\nOriginal size: ${(originalSize / 1024).toFixed(1)} KB`);
console.log(`Compressed size: ${(compressedSize / 1024).toFixed(1)} KB`);
console.log(`Reduction: ${reduction}%`);
console.log(`\nWritten to ${OUTPUT_PATH}`);

// Also show template usage statistics
console.log('\nTemplate usage statistics:');
for (const [provider, entries] of Object.entries(compressedByProvider)) {
  const templateCounts: Record<string, number> = {};
  for (const entry of entries) {
    templateCounts[entry.t] = (templateCounts[entry.t] || 0) + 1;
  }
  console.log(`  ${provider}:`);
  for (const [template, count] of Object.entries(templateCounts)) {
    console.log(`    ${template}: ${count} icons`);
  }
}
