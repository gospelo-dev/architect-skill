#!/usr/bin/env bun
import { iconCatalog } from '../src/data/iconCatalog';
import { writeFileSync, mkdirSync } from 'fs';

const GCP_DIR = 'src/icons/google-cloud';
mkdirSync(GCP_DIR, { recursive: true });

const gcpCatalog = iconCatalog['google-cloud'];
if (!gcpCatalog) {
  console.error('Google Cloud catalog not found');
  process.exit(1);
}

const allIcons: Array<{ slug: string; displayName: string; url: string }> = [];
for (const [category, icons] of Object.entries(gcpCatalog)) {
  for (const icon of icons) {
    allIcons.push({
      slug: icon.slug,
      displayName: icon.displayName,
      url: icon.externalUrl,
    });
  }
}
allIcons.sort((a, b) => a.slug.localeCompare(b.slug));

const generalJson = {
  category: 'General',
  count: allIcons.length,
  icons: allIcons,
};

writeFileSync(`${GCP_DIR}/general.json`, JSON.stringify(generalJson, null, 2) + '\n');
console.log(`Regenerated general.json with ${allIcons.length} icons`);
