#!/usr/bin/env bun
/**
 * Split iconCatalog.ts into separate JSON files by provider and category
 *
 * Output structure:
 * src/icons/
 * ├── _providers.json      # Provider metadata
 * ├── aws/
 * │   ├── _meta.json       # AWS source info
 * │   ├── compute.json
 * │   ├── database.json
 * │   └── ...
 * ├── azure/
 * │   └── ...
 * └── ...
 */

import { iconCatalog, iconSourceVersions } from '../src/data/iconCatalog';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const ICONS_DIR = 'src/icons';

// Ensure directories exist
function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// Convert category name to filename
function categoryToFilename(category: string): string {
  return category
    .toLowerCase()
    .replace(/[&,]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
}

// Write JSON file with formatting
function writeJson(path: string, data: unknown) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

// Main
ensureDir(ICONS_DIR);

// Write providers metadata
const providersData = {
  providers: Object.keys(iconCatalog),
  sources: iconSourceVersions,
};
writeJson(join(ICONS_DIR, '_providers.json'), providersData);
console.log('Created _providers.json');

// Process each provider
for (const [provider, categories] of Object.entries(iconCatalog)) {
  const providerDir = join(ICONS_DIR, provider);
  ensureDir(providerDir);

  // Write provider metadata
  const meta = iconSourceVersions[provider] || {
    repository: '',
    commitId: '',
    commitDate: '',
    lastUpdated: new Date().toISOString().split('T')[0],
  };
  writeJson(join(providerDir, '_meta.json'), meta);

  let totalIcons = 0;
  const categoryFiles: string[] = [];

  // Write each category
  for (const [category, icons] of Object.entries(categories)) {
    const filename = categoryToFilename(category) + '.json';
    categoryFiles.push(filename);

    // Simplify icon entries (remove redundant category field)
    const simplifiedIcons = icons.map(icon => ({
      slug: icon.slug,
      displayName: icon.displayName,
      url: icon.externalUrl,
    }));

    const categoryData = {
      category,
      count: icons.length,
      icons: simplifiedIcons,
    };

    writeJson(join(providerDir, filename), categoryData);
    totalIcons += icons.length;
  }

  // Write index for this provider
  const indexData = {
    provider,
    totalIcons,
    categories: categoryFiles,
  };
  writeJson(join(providerDir, '_index.json'), indexData);

  console.log(`Created ${provider}/: ${categoryFiles.length} categories, ${totalIcons} icons`);
}

console.log('\nDone! JSON files created in src/icons/');
