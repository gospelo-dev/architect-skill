#!/usr/bin/env bun
/**
 * Rebuild iconCatalog.ts from compressed version
 */

import { providerMetadata, compressedIcons, resolveIconUrl, CompressedIconEntry } from '../src/data/iconCatalogCompressed';
import { writeFileSync } from 'fs';

interface IconEntry {
  slug: string;
  displayName: string;
  category: string;
  externalUrl: string;
}

// Category mapping from URL category to display category
const CATEGORY_MAP: Record<string, string> = {
  'Analytics': 'Analytics',
  'Application-Integration': 'App Integration',
  'Blockchain': 'Blockchain',
  'Business-Applications': 'Business Applications',
  'Cloud-Financial-Management': 'Cloud Financial Management',
  'Compute': 'Compute',
  'Containers': 'Containers',
  'Customer-Enablement': 'Customer Enablement',
  'Database': 'Database',
  'Developer-Tools': 'Developer Tools',
  'End-User-Computing': 'End User Computing',
  'Front-End-Web-Mobile': 'Front-End Web & Mobile',
  'Game-Tech': 'Games',
  'General-Icons': 'General',
  'Internet-of-Things': 'Internet of Things',
  'IoT': 'Internet of Things',
  'Machine-Learning': 'Machine Learning',
  'Management-Governance': 'Management & Governance',
  'Media-Services': 'Media Services',
  'Migration-Transfer': 'Migration & Transfer',
  'Networking-Content-Delivery': 'Networking & Content Delivery',
  'Quantum-Technologies': 'Quantum Technologies',
  'Robotics': 'Robotics',
  'Satellite': 'Satellite',
  'Security-Identity-Compliance': 'Security, Identity & Compliance',
  'Serverless': 'Serverless',
  'Storage': 'Storage',
};

// Build iconCatalog
const iconCatalog: Record<string, Record<string, IconEntry[]>> = {};
const iconUrlMap: Record<string, string> = {};

for (const [provider, entries] of Object.entries(compressedIcons)) {
  iconCatalog[provider] = {};

  for (const entry of entries as CompressedIconEntry[]) {
    const url = resolveIconUrl(provider, entry);
    const iconId = `${provider}:${entry.d}`;
    iconUrlMap[iconId] = url;

    // Determine category
    let category = entry.c || 'General';
    if (CATEGORY_MAP[category]) {
      category = CATEGORY_MAP[category];
    }

    if (!iconCatalog[provider][category]) {
      iconCatalog[provider][category] = [];
    }

    iconCatalog[provider][category].push({
      slug: entry.d,
      displayName: entry.d.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      category,
      externalUrl: url,
    });
  }
}

// Generate TypeScript file
const sourceVersions = Object.fromEntries(
  Object.entries(providerMetadata).map(([key, val]) => [key, val.source])
);

const output = `/**
 * Auto-generated icon catalog
 * Run: bun run scripts/generate-icon-catalog.ts
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

export const iconSourceVersions: Record<string, IconSourceVersion> = ${JSON.stringify(sourceVersions, null, 2)};

/**
 * Icon catalog with external URLs for all providers
 */
export const iconCatalog: IconCatalog =
${JSON.stringify(iconCatalog, null, 2)};

/**
 * Direct URL mapping for quick icon lookup
 */
export const iconUrlMap: Record<string, string> = ${JSON.stringify(iconUrlMap, null, 2)};
`;

// Write file
writeFileSync('src/data/iconCatalog.ts', output);

console.log('Generated iconCatalog.ts');
console.log(`  Providers: ${Object.keys(iconCatalog).join(', ')}`);
console.log(`  Total icons: ${Object.keys(iconUrlMap).length}`);
