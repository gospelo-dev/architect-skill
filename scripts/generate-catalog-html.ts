#!/usr/bin/env bun
/**
 * Generate icon catalog HTML with search/highlight functionality
 * Creates standalone HTML files with search box that highlights matching icons
 */

import { iconCatalog, iconSourceVersions } from '../src/data/iconCatalog';
import { writeFileSync } from 'fs';

interface IconInfo {
  slug: string;
  displayName: string;
  category: string;
}

// Provider configurations
const PROVIDER_CONFIG: Record<string, {
  title: string;
  prefix: string;
  outputPath: string;
  gradientEnd: string;
  themeColor: string;
}> = {
  aws: {
    title: 'AWS Icon Catalog',
    prefix: 'aws',
    outputPath: 'docs/icons/aws_catalog_full.html',
    gradientEnd: '#e0e0e0',
    themeColor: '#FF9900',
  },
  azure: {
    title: 'Azure Icon Catalog',
    prefix: 'azure',
    outputPath: 'docs/icons/azure_catalog_full.html',
    gradientEnd: '#e6f2ff',
    themeColor: '#0078D4',
  },
  'google-cloud': {
    title: 'Google Cloud Icon Catalog',
    prefix: 'gcp',
    outputPath: 'docs/icons/gcp_catalog_full.html',
    gradientEnd: '#fff3e0',
    themeColor: '#4285F4',
  },
  'tech-stack': {
    title: 'Tech Stack Icon Catalog',
    prefix: 'tech',
    outputPath: 'docs/icons/tech_stack_catalog_full.html',
    gradientEnd: '#f0fff0',
    themeColor: '#28a745',
  },
};

function generateCatalogHtml(provider: string): string | null {
  const config = PROVIDER_CONFIG[provider];
  if (!config) {
    console.error(`Unknown provider: ${provider}`);
    return null;
  }

  const providerCatalog = iconCatalog[provider];
  if (!providerCatalog) {
    console.error(`No catalog found for provider: ${provider}`);
    return null;
  }

  // Collect all icons with their categories
  const iconsByCategory: Record<string, IconInfo[]> = {};
  let totalIcons = 0;

  for (const [category, icons] of Object.entries(providerCatalog)) {
    for (const icon of icons) {
      const cat = icon.category || category;
      if (!iconsByCategory[cat]) {
        iconsByCategory[cat] = [];
      }
      iconsByCategory[cat].push({
        slug: icon.slug,
        displayName: icon.displayName,
        category: cat,
      });
      totalIcons++;
    }
  }

  // Sort categories alphabetically
  const sortedCategories = Object.keys(iconsByCategory).sort((a, b) => a.localeCompare(b));

  // Generate icon cards HTML
  let iconsHtml = '';
  for (const category of sortedCategories) {
    const icons = iconsByCategory[category];
    if (!icons || icons.length === 0) continue;

    iconsHtml += `
    <div class="category" data-category="${escapeHtml(category)}">
      <h2 class="category-title">${escapeHtml(category)} (${icons.length})</h2>
      <div class="icons-grid">`;

    for (const icon of icons) {
      const iconId = `${config.prefix}:${icon.slug}`;
      iconsHtml += `
        <div class="icon-card" data-icon-id="${escapeHtml(iconId)}" data-display-name="${escapeHtml(icon.displayName)}">
          <div class="icon-image">
            <img src="${getIconUrlFromCatalog(provider, icon.slug)}" alt="${escapeHtml(icon.displayName)}" loading="lazy" onerror="this.style.display='none'">
          </div>
          <div class="icon-id">${escapeHtml(iconId)}</div>
        </div>`;
    }

    iconsHtml += `
      </div>
    </div>`;
  }

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      background: linear-gradient(to bottom, #ffffff, ${config.gradientEnd});
      min-height: 100vh;
    }
    .header {
      position: sticky;
      top: 0;
      background: white;
      border-bottom: 1px solid #ddd;
      padding: 16px 24px;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header-content {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
    }
    .title {
      font-size: 24px;
      font-weight: 600;
      color: #333;
      margin: 0;
    }
    .subtitle {
      font-size: 14px;
      color: #666;
    }
    .search-container {
      flex: 1;
      min-width: 250px;
      max-width: 400px;
    }
    .search-input {
      width: 100%;
      padding: 10px 16px;
      font-size: 14px;
      border: 2px solid #ddd;
      border-radius: 8px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .search-input:focus {
      border-color: ${config.themeColor};
      box-shadow: 0 0 0 3px ${config.themeColor}33;
    }
    .search-info {
      font-size: 13px;
      color: #666;
      white-space: nowrap;
    }
    .match-count {
      font-weight: 600;
      color: ${config.themeColor};
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }
    .category {
      margin-bottom: 32px;
    }
    .category-title {
      font-size: 18px;
      font-weight: 600;
      color: #444;
      margin: 0 0 16px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #eee;
    }
    .icons-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 12px;
    }
    .icon-card {
      background: white;
      border: 2px solid transparent;
      border-radius: 8px;
      padding: 12px 8px;
      text-align: center;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .icon-card:hover {
      border-color: #ddd;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .icon-card.highlight {
      border-color: #3B82F6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(59, 130, 246, 0.2);
      background: white;
    }
    .icon-card.dimmed {
      opacity: 0.3;
    }
    .icon-image {
      width: 48px;
      height: 48px;
      margin: 0 auto 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-image img {
      width: 48px;
      height: 48px;
      object-fit: contain;
    }
    .icon-id {
      font-size: 10px;
      color: #666;
      word-break: break-all;
      line-height: 1.3;
    }
    .icon-card.highlight .icon-id {
      color: #1D4ED8;
      font-weight: 500;
    }
    .copied-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      opacity: 0;
      transition: opacity 0.3s;
      z-index: 1000;
    }
    .copied-toast.show {
      opacity: 1;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-content">
      <div>
        <h1 class="title">${config.title}</h1>
        <div class="subtitle">${totalIcons} icons</div>
      </div>
      <div class="search-container">
        <input type="text" class="search-input" placeholder="Search icons... (e.g. lambda, s3, storage)" id="searchInput">
      </div>
      <div class="search-info">
        <span id="matchCount"></span>
      </div>
    </div>
  </div>

  <div class="container">
    ${iconsHtml}
  </div>

  <div class="copied-toast" id="copiedToast">Copied to clipboard!</div>

  <script>
    const searchInput = document.getElementById('searchInput');
    const matchCountEl = document.getElementById('matchCount');
    const copiedToast = document.getElementById('copiedToast');
    const iconCards = document.querySelectorAll('.icon-card');

    let toastTimeout;

    // Search functionality
    searchInput.addEventListener('input', function() {
      const query = this.value.toLowerCase().trim();
      let matchCount = 0;

      iconCards.forEach(card => {
        const iconId = card.dataset.iconId.toLowerCase();
        const displayName = card.dataset.displayName.toLowerCase();

        if (query === '') {
          card.classList.remove('highlight', 'dimmed');
        } else {
          // AND search: all terms must match
          const terms = query.split(/\\s+/).filter(t => t.length > 0);
          const text = iconId + ' ' + displayName;
          const matches = terms.every(term => text.includes(term));
          if (matches) {
            card.classList.add('highlight');
            card.classList.remove('dimmed');
            matchCount++;
          } else {
            card.classList.remove('highlight');
            card.classList.add('dimmed');
          }
        }
      });

      if (query === '') {
        matchCountEl.textContent = '';
      } else {
        matchCountEl.innerHTML = '<span class="match-count">' + matchCount + '</span> matches';
      }
    });

    // Click to copy
    iconCards.forEach(card => {
      card.addEventListener('click', function() {
        const iconId = this.dataset.iconId;
        navigator.clipboard.writeText(iconId).then(() => {
          copiedToast.textContent = 'Copied: ' + iconId;
          copiedToast.classList.add('show');
          clearTimeout(toastTimeout);
          toastTimeout = setTimeout(() => {
            copiedToast.classList.remove('show');
          }, 2000);
        });
      });
    });

    // Focus search on page load
    searchInput.focus();
  </script>
</body>
</html>`;

  // Add license footer based on provider
  const licenseInfo: Record<string, string> = {
    aws: 'AWS Architecture Icons - Apache License 2.0 (Amazon Web Services, Inc.)',
    azure: 'Azure Icons - MIT License (Ben Coleman)',
    'google-cloud': 'Google Cloud Icons - Apache License 2.0 (Google LLC)',
    'tech-stack': 'Simple Icons - CC0 1.0 Universal (Simple Icons Collaborators)',
  };

  // Get version info
  const versionInfo = iconSourceVersions[provider];
  const commitId = versionInfo?.commitId ? versionInfo.commitId.slice(0, 7) : 'N/A';
  const lastUpdated = versionInfo?.lastUpdated || 'N/A';

  const licenseFooter = `
  <footer class="license-footer">
    <p>Icon Attribution: ${licenseInfo[provider] || 'See respective license'}</p>
    <p>Version: ${commitId} (Updated: ${lastUpdated})</p>
    <p>Generated with gospelo-architect</p>
  </footer>
  <style>
    .license-footer {
      max-width: 1400px;
      margin: 48px auto 24px;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #888;
      border-top: 1px solid #ddd;
    }
    .license-footer p {
      margin: 4px 0;
    }
  </style>`;

  // Insert footer before </body>
  html = html.replace('</body>', licenseFooter + '\n</body>');

  writeFileSync(config.outputPath, html);
  console.log(`Generated: ${config.outputPath} (${totalIcons} icons)`);

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Get icon URL from the actual icon catalog data
function getIconUrlFromCatalog(provider: string, slug: string): string {
  const providerCatalog = iconCatalog[provider];
  if (!providerCatalog) return '';

  for (const icons of Object.values(providerCatalog)) {
    for (const icon of icons) {
      if (icon.slug === slug && icon.externalUrl) {
        return icon.externalUrl;
      }
    }
  }
  return '';
}

// Generate for all providers or specified one
const targetProvider = process.argv[2];

if (targetProvider) {
  generateCatalogHtml(targetProvider);
} else {
  // Generate all
  for (const provider of Object.keys(PROVIDER_CONFIG)) {
    generateCatalogHtml(provider);
  }
}
