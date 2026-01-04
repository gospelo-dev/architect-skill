#!/usr/bin/env bun
/**
 * Build iconCatalog.ts from split JSON files
 *
 * Reads from:
 * src/icons/
 * ├── _providers.json
 * ├── aws/
 * │   ├── _meta.json
 * │   ├── _index.json
 * │   ├── compute.json
 * │   └── ...
 * └── ...
 *
 * Generates:
 * src/data/iconCatalog.ts
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const ICONS_DIR = 'src/icons';
const OUTPUT_FILE = 'src/data/iconCatalog.ts';

interface IconEntry {
  slug: string;
  displayName: string;
  url: string;
}

interface CategoryFile {
  category: string;
  count: number;
  icons: IconEntry[];
}

interface ProviderMeta {
  repository: string;
  commitId: string;
  commitDate: string;
  lastUpdated: string;
}

interface ProviderIndex {
  provider: string;
  totalIcons: number;
  categories: string[];
}

interface ProvidersData {
  providers: string[];
  sources: Record<string, ProviderMeta>;
}

// Read JSON file
function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

// Main
console.log('Building iconCatalog.ts from JSON files...\n');

// Read providers data
const providersData = readJson<ProvidersData>(join(ICONS_DIR, '_providers.json'));

// Build catalog
const iconCatalog: Record<string, Record<string, Array<{
  slug: string;
  displayName: string;
  category: string;
  externalUrl: string;
}>>> = {};

const iconUrlMap: Record<string, string> = {};

let totalProviders = 0;
let totalCategories = 0;
let totalIcons = 0;

for (const provider of providersData.providers) {
  const providerDir = join(ICONS_DIR, provider);

  if (!existsSync(providerDir)) {
    console.warn(`Warning: Provider directory not found: ${providerDir}`);
    continue;
  }

  // Read provider index
  const indexPath = join(providerDir, '_index.json');
  if (!existsSync(indexPath)) {
    console.warn(`Warning: Index not found for ${provider}`);
    continue;
  }

  const index = readJson<ProviderIndex>(indexPath);
  iconCatalog[provider] = {};

  let providerIconCount = 0;

  // Read each category file
  for (const categoryFile of index.categories) {
    const categoryPath = join(providerDir, categoryFile);
    if (!existsSync(categoryPath)) {
      console.warn(`Warning: Category file not found: ${categoryPath}`);
      continue;
    }

    const categoryData = readJson<CategoryFile>(categoryPath);
    const category = categoryData.category;

    iconCatalog[provider][category] = categoryData.icons.map(icon => ({
      slug: icon.slug,
      displayName: icon.displayName,
      category,
      externalUrl: icon.url,
    }));

    // Add to URL map
    for (const icon of categoryData.icons) {
      iconUrlMap[`${provider}:${icon.slug}`] = icon.url;
    }

    providerIconCount += categoryData.icons.length;
    totalCategories++;
  }

  console.log(`  ${provider}: ${Object.keys(iconCatalog[provider]).length} categories, ${providerIconCount} icons`);
  totalProviders++;
  totalIcons += providerIconCount;
}

// Generate TypeScript
const output = `/**
 * Auto-generated icon catalog
 * Generated from src/icons/ JSON files
 * Run: bun scripts/build-catalog.ts
 */

export interface IconEntry {
  slug: string;
  displayName: string;
  category: string;
  externalUrl: string;
}

export interface ProviderCatalog {
  [category: string]: IconEntry[];
}

export interface IconCatalog {
  [provider: string]: ProviderCatalog;
}

/**
 * Icon source version information
 * Used to track upstream repository versions for reproducibility
 */
export interface IconSourceVersion {
  repository: string;
  commitId: string;
  commitDate: string;
  lastUpdated: string;
}

export const iconSourceVersions: Record<string, IconSourceVersion> = ${JSON.stringify(providersData.sources, null, 2)};

/**
 * Icon catalog with external URLs for all providers
 */
export const iconCatalog: IconCatalog = ${JSON.stringify(iconCatalog, null, 2)};

/**
 * Direct URL mapping for quick icon lookup
 */
export const iconUrlMap: Record<string, string> = ${JSON.stringify(iconUrlMap, null, 2)};
`;

writeFileSync(OUTPUT_FILE, output);

console.log(`\nGenerated ${OUTPUT_FILE}`);
console.log(`  Providers: ${totalProviders}`);
console.log(`  Categories: ${totalCategories}`);
console.log(`  Total icons: ${totalIcons}`);
console.log(`  File size: ${(output.length / 1024).toFixed(1)} KB`);
