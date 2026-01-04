#!/usr/bin/env bun
/**
 * Fix resource icon URLs in iconCatalog.ts
 * Resource icons are stored in a different location than Architecture-Service-Icons
 */

import { readFileSync, writeFileSync } from 'fs';

const CATALOG_PATH = 'src/data/iconCatalog.ts';

// Resource icon categories mapping
const RESOURCE_CATEGORIES = [
  'Res_Analytics',
  'Res_Application-Integration',
  'Res_Blockchain',
  'Res_Business-Applications',
  'Res_Compute',
  'Res_Containers',
  'Res_Database',
  'Res_Developer-Tools',
  'Res_End-User-Computing',
  'Res_Front-End-Web-Mobile',
  'Res_General-Icons',
  'Res_IoT',
  'Res_Machine-Learning',
  'Res_Management-Governance',
  'Res_Media-Services',
  'Res_Migration-Transfer',
  'Res_Networking-Content-Delivery',
  'Res_Quantum-Technologies',
  'Res_Robotics',
  'Res_Security-Identity-Compliance',
  'Res_Storage',
];

interface ResourceIconInfo {
  category: string;
  filename: string;
  url: string;
}

async function fetchResourceIcons(): Promise<ResourceIconInfo[]> {
  const icons: ResourceIconInfo[] = [];
  const BASE_URL = 'https://raw.githubusercontent.com/AwesomeLogos/aws-icons/main/docs/images/Resource-Icons';

  for (const category of RESOURCE_CATEGORIES) {
    console.log(`Fetching ${category}...`);

    try {
      const apiUrl = `https://api.github.com/repos/AwesomeLogos/aws-icons/contents/docs/images/Resource-Icons/${category}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        console.warn(`  Skipping ${category}: ${response.status}`);
        continue;
      }

      const items = await response.json();

      if (category === 'Res_General-Icons') {
        // General-Icons has subdirectories (Res_48_Light, Res_48_Dark)
        const lightDir = items.find((item: any) => item.name === 'Res_48_Light');
        if (lightDir) {
          const lightResponse = await fetch(lightDir.url);
          const lightItems = await lightResponse.json();

          for (const file of lightItems) {
            if (file.type === 'file' && file.name.endsWith('.svg')) {
              icons.push({
                category,
                filename: file.name,
                url: `${BASE_URL}/${category}/Res_48_Light/${file.name}`,
              });
            }
          }
        }
      } else {
        // Other categories have files directly
        for (const file of items) {
          if (file.type === 'file' && file.name.endsWith('.svg')) {
            icons.push({
              category,
              filename: file.name,
              url: `${BASE_URL}/${category}/${file.name}`,
            });
          }
        }
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`  Error fetching ${category}:`, error);
    }
  }

  return icons;
}

function filenameToSlug(filename: string): string {
  // Remove .svg extension
  let name = filename.replace('.svg', '');

  // Remove Res_ prefix
  name = name.replace(/^Res_/, '');

  // Remove size suffixes like _48, _48_Light
  name = name.replace(/_48(_Light)?$/, '');

  // Convert to lowercase with underscores
  return name
    .replace(/-/g, '_')
    .replace(/AWS_/gi, '')
    .replace(/Amazon_/gi, '')
    .toLowerCase();
}

async function main() {
  console.log('Fetching resource icons from GitHub...');
  const resourceIcons = await fetchResourceIcons();
  console.log(`Found ${resourceIcons.length} resource icons`);

  // Create slug to URL mapping
  const slugToUrl: Record<string, string> = {};

  for (const icon of resourceIcons) {
    const slug = `res_${filenameToSlug(icon.filename)}`;
    slugToUrl[slug] = icon.url;
    console.log(`  ${slug} => ${icon.url}`);
  }

  // Read current catalog
  const catalogContent = readFileSync(CATALOG_PATH, 'utf-8');

  // Fix URLs for res_ icons in both iconUrlMap and iconCatalog
  let fixedContent = catalogContent;
  let fixCount = 0;

  for (const [slug, correctUrl] of Object.entries(slugToUrl)) {
    const iconId = `aws:${slug}`;

    // Match the URL in iconUrlMap (format: "aws:res_xxx": "https://...")
    const urlMapPattern = new RegExp(
      `"${iconId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}":\\s*"[^"]+"`
    );

    if (urlMapPattern.test(fixedContent)) {
      fixedContent = fixedContent.replace(
        urlMapPattern,
        `"${iconId}": "${correctUrl}"`
      );
      fixCount++;
    }

    // Match the URL in iconCatalog externalUrl (format: "externalUrl": "https://...Arch_AWS-Res-...")
    // Find entries that match this slug pattern
    const escapedSlug = slug.replace(/_/g, '[_-]');
    const catalogPattern = new RegExp(
      `"externalUrl":\\s*"https://raw\\.githubusercontent\\.com/AwesomeLogos/aws-icons/main/docs/images/Architecture-Service-Icons/Arch_General-Icons/64/Arch_AWS-Res-[^"]+"`,
      'g'
    );

    // Replace all old-style res_ URLs with correct ones
    const oldUrlMatches = fixedContent.match(catalogPattern);
    if (oldUrlMatches) {
      for (const oldUrlMatch of oldUrlMatches) {
        // Extract the icon name from the old URL
        const match = oldUrlMatch.match(/Arch_AWS-Res-([^_]+)_64\.svg/);
        if (match) {
          const iconNameFromUrl = match[1].toLowerCase().replace(/-/g, '_');
          const matchingSlug = `res_${iconNameFromUrl}`;
          if (slugToUrl[matchingSlug]) {
            fixedContent = fixedContent.replace(
              oldUrlMatch,
              `"externalUrl": "${slugToUrl[matchingSlug]}"`
            );
            fixCount++;
          }
        }
      }
    }
  }

  // Additional pass: fix all remaining Arch_AWS-Res- URLs
  const allOldResUrls = fixedContent.match(/"externalUrl":\s*"https:\/\/raw\.githubusercontent\.com\/AwesomeLogos\/aws-icons\/main\/docs\/images\/Architecture-Service-Icons\/Arch_General-Icons\/64\/Arch_AWS-Res-[^"]+"/g) || [];
  console.log(`\nFound ${allOldResUrls.length} remaining old-format externalUrls to fix`);

  for (const oldUrl of allOldResUrls) {
    // Extract name from Arch_AWS-Res-{Name}_64.svg
    const match = oldUrl.match(/Arch_AWS-Res-(.+?)_64\.svg/);
    if (match) {
      const nameParts = match[1].split('-');
      const slug = 'res_' + nameParts.join('_').toLowerCase();
      if (slugToUrl[slug]) {
        fixedContent = fixedContent.replace(oldUrl, `"externalUrl": "${slugToUrl[slug]}"`);
        fixCount++;
      } else {
        console.log(`  No match for: ${slug}`);
      }
    }
  }

  console.log(`\nFixed ${fixCount} resource icon URLs total`);

  // Write fixed catalog
  writeFileSync(CATALOG_PATH, fixedContent, 'utf-8');
  console.log(`Updated ${CATALOG_PATH}`);
}

main().catch(console.error);
