#!/usr/bin/env bun
/**
 * Fix icon categories based on URL paths
 * Resource icons should be categorized by their actual service category, not "General"
 */

import { readFileSync, writeFileSync } from 'fs';

const CATALOG_PATH = 'src/data/iconCatalog.ts';

// Category mapping from URL path to display name
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

// Extract category from URL
function getCategoryFromUrl(url: string): string | null {
  // Architecture icons: .../Arch_{Category}/...
  const archMatch = url.match(/Architecture-Service-Icons\/Arch_([^/]+)\//);
  if (archMatch) {
    return CATEGORY_MAP[archMatch[1]] || archMatch[1];
  }

  // Resource icons: .../Res_{Category}/...
  const resMatch = url.match(/Resource-Icons\/Res_([^/]+)\//);
  if (resMatch) {
    return CATEGORY_MAP[resMatch[1]] || resMatch[1];
  }

  return null;
}

// Read catalog
let content = readFileSync(CATALOG_PATH, 'utf-8');

// Parse and fix entries in iconCatalog section
// Find entries with "General" category and URL that suggests different category
const entryRegex = /\{\s*"slug":\s*"([^"]+)",\s*"displayName":\s*"([^"]+)",\s*"category":\s*"General",\s*"externalUrl":\s*"([^"]+)"\s*\}/g;

let fixCount = 0;
const categoryStats: Record<string, number> = {};

content = content.replace(entryRegex, (match, slug, displayName, url) => {
  const newCategory = getCategoryFromUrl(url);

  if (newCategory && newCategory !== 'General') {
    fixCount++;
    categoryStats[newCategory] = (categoryStats[newCategory] || 0) + 1;
    return `{
        "slug": "${slug}",
        "displayName": "${displayName}",
        "category": "${newCategory}",
        "externalUrl": "${url}"
      }`;
  }
  return match;
});

writeFileSync(CATALOG_PATH, content, 'utf-8');

console.log(`Fixed ${fixCount} icon categories`);
console.log('\nCategory distribution:');
Object.entries(categoryStats)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });
