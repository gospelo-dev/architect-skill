#!/usr/bin/env bun
/**
 * Generate icon catalog JSON for visual display
 * Creates diagram JSONs showing all icons organized by category for each provider
 */

import { iconCatalog } from '../src/data/iconCatalog';
import { writeFileSync } from 'fs';

interface DiagramNode {
  id: string;
  type?: string;
  icon?: string;
  label: string;
  sublabel?: string;
  position: [number, number];
}

interface DiagramJson {
  title: string;
  subtitle: string;
  background: {
    type: string;
    startColor: string;
    endColor: string;
    direction: string;
  };
  nodes: DiagramNode[];
  render: {
    width: number;
    height: number;
  };
}

const COLS = 10;
const ICON_WIDTH = 95;
const ICON_HEIGHT = 140;  // Increased to accommodate multi-line labels
const CATEGORY_GAP = 40;
const START_X = 50;
const START_Y = 80;
const LABEL_MAX_CHARS = 12;  // Max characters per line

/**
 * Split text into lines with fixed character width
 */
function wrapText(text: string, maxChars: number): string {
  const lines: string[] = [];
  let remaining = text;

  while (remaining.length > maxChars) {
    lines.push(remaining.substring(0, maxChars));
    remaining = remaining.substring(maxChars);
  }
  if (remaining.length > 0) {
    lines.push(remaining);
  }

  return lines.join('\n');
}

// Provider configurations
const PROVIDER_CONFIG: Record<string, { title: string; outputPath: string; gradientEnd: string }> = {
  aws: {
    title: 'AWS Icon Catalog',
    outputPath: 'docs/icons/aws_catalog_full.json',
    gradientEnd: '#e0e0e0',
  },
  azure: {
    title: 'Azure Icon Catalog',
    outputPath: 'docs/icons/azure_catalog_full.json',
    gradientEnd: '#e6f2ff',
  },
  'google-cloud': {
    title: 'Google Cloud Icon Catalog',
    outputPath: 'docs/icons/gcp_catalog_full.json',
    gradientEnd: '#fff3e0',
  },
  'tech-stack': {
    title: 'Tech Stack Icon Catalog',
    outputPath: 'docs/icons/tech_stack_catalog_full.json',
    gradientEnd: '#f0fff0',
  },
};

function generateCatalogForProvider(provider: string): void {
  const config = PROVIDER_CONFIG[provider];
  if (!config) {
    console.error(`Unknown provider: ${provider}`);
    return;
  }

  const providerCatalog = iconCatalog[provider];
  if (!providerCatalog) {
    console.error(`No catalog found for provider: ${provider}`);
    return;
  }

  // Collect all icons with their categories
  const iconsByCategory: Record<string, Array<{ slug: string; displayName: string }>> = {};

  for (const [category, icons] of Object.entries(providerCatalog)) {
    for (const icon of icons) {
      const cat = icon.category || category;
      if (!iconsByCategory[cat]) {
        iconsByCategory[cat] = [];
      }
      iconsByCategory[cat].push({
        slug: icon.slug,
        displayName: icon.displayName,
      });
    }
  }

  // Sort categories alphabetically
  const sortedCategories = Object.keys(iconsByCategory).sort((a, b) => a.localeCompare(b));

  // Generate nodes
  const nodes: DiagramNode[] = [];
  let currentY = START_Y;
  let totalIcons = 0;

  for (const category of sortedCategories) {
    const icons = iconsByCategory[category];
    if (!icons || icons.length === 0) continue;

    totalIcons += icons.length;

    // Category label
    nodes.push({
      id: `cat_${category.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      type: 'label',
      label: `${category} (${icons.length})`,
      position: [START_X, currentY],
    });

    currentY += 35;

    // Icons in grid
    let col = 0;
    for (const icon of icons) {
      const x = START_X + col * ICON_WIDTH;
      const y = currentY;

      // Wrap label at fixed character width for SVG display
      const iconId = `${provider}:${icon.slug}`;
      const label = wrapText(iconId, LABEL_MAX_CHARS);

      nodes.push({
        id: `${provider}_${category.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${icon.slug}`,
        icon: iconId,
        label,
        position: [x, y],
      });

      col++;
      if (col >= COLS) {
        col = 0;
        currentY += ICON_HEIGHT;
      }
    }

    // Move to next row if not at start of row
    if (col > 0) {
      currentY += ICON_HEIGHT;
    }

    // Gap between categories
    currentY += CATEGORY_GAP;
  }

  // Calculate dimensions
  const diagramWidth = START_X + COLS * ICON_WIDTH + 50;
  const diagramHeight = currentY + 100;

  const diagram: DiagramJson = {
    title: config.title,
    subtitle: `All Services by Category (${totalIcons} icons)`,
    background: {
      type: 'gradient',
      startColor: '#ffffff',
      endColor: config.gradientEnd,
      direction: 'south',
    },
    nodes,
    render: {
      width: diagramWidth,
      height: diagramHeight,
    },
  };

  writeFileSync(config.outputPath, JSON.stringify(diagram, null, 2));
  console.log(`\n${config.title}`);
  console.log(`  Generated: ${config.outputPath}`);
  console.log(`  Total icons: ${totalIcons}`);
  console.log(`  Categories: ${sortedCategories.length}`);
}

// Generate for all providers or specified one
const targetProvider = process.argv[2];

if (targetProvider) {
  generateCatalogForProvider(targetProvider);
} else {
  // Generate all
  for (const provider of Object.keys(PROVIDER_CONFIG)) {
    generateCatalogForProvider(provider);
  }
}
