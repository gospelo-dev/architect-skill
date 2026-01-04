#!/usr/bin/env bun
/**
 * Regenerate Azure general.json from iconCatalog.ts
 */

import { iconCatalog } from '../src/data/iconCatalog';
import { writeFileSync, mkdirSync } from 'fs';

const AZURE_DIR = 'src/icons/azure';

mkdirSync(AZURE_DIR, { recursive: true });

const azureCatalog = iconCatalog['azure'];
if (!azureCatalog) {
  console.error('Azure catalog not found');
  process.exit(1);
}

// Collect all icons
const allIcons: Array<{ slug: string; displayName: string; url: string }> = [];

for (const [category, icons] of Object.entries(azureCatalog)) {
  for (const icon of icons) {
    allIcons.push({
      slug: icon.slug,
      displayName: icon.displayName,
      url: icon.externalUrl,
    });
  }
}

// Sort alphabetically
allIcons.sort((a, b) => a.slug.localeCompare(b.slug));

const generalJson = {
  category: 'General',
  count: allIcons.length,
  icons: allIcons,
};

writeFileSync(`${AZURE_DIR}/general.json`, JSON.stringify(generalJson, null, 2) + '\n');
console.log(`Regenerated general.json with ${allIcons.length} icons`);
