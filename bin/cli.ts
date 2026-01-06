#!/usr/bin/env bun
/**
 * gospelo-architect CLI (ESM/Bun)
 *
 * AI-powered diagram generator for system architecture, UML, and infrastructure visualization.
 *
 * Flag-style Commands (recommended for Agent Skills):
 *   --output html <diagram.json>        - Render diagram to HTML
 *   --output svg <diagram.json>         - Render diagram to SVG
 *   --open <diagram.json>               - Open diagram and show structure
 *   --insert-above <node-id> <node.json> - Insert node above reference node
 *   --insert-below <node-id> <node.json> - Insert node below reference node
 *   --update-node <node-id> <update.json> - Update existing node
 *   --remove-node <node-id>             - Remove a node
 *
 * Traditional Commands:
 *   enrich <input.json> [output.json] - Add computed metadata to diagram JSON
 *   render <input.json> [output.html]  - Render diagram to HTML
 *   svg <input.json> [output.svg]      - Render diagram to SVG
 *   meta <input.json>                  - Output metadata only (JSON)
 *   edit <input.json> <patch.json> [output.json] - Apply patch to diagram
 *   add-node <input.json> <node.json> [output.json] - Add a node
 *   remove-node <input.json> <node-id> [output.json] - Remove a node
 *   add-connection <input.json> <from> <to> [output.json] - Add a connection
 *
 * Options:
 *   --width <number>   - Diagram width (default: 800)
 *   --height <number>  - Diagram height (default: 600)
 *   --pretty           - Pretty-print JSON output
 *   --diagram <path>   - Target diagram file (for flag-style commands)
 *   --help             - Show help
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { dirname, basename, join } from 'path';
import { enrichDiagram, generateMeta, renderStandalone, renderSvg, renderSvgEmbed, renderPreviewHtml, createBuilder, IconCatalogClient, loadIconUrlMap, validateDiagram, parseDiagram } from '../src/index';
import { createZip } from '../src/utils/zip';
import type { RenderOptions } from '../src/core/types';
import type { DiagramPatch, NodeInput, NodeUpdate } from '../src/core/builder';

// CDN client for icon search
const catalogClient = new IconCatalogClient();

// Parse arguments
const args = process.argv.slice(2);

function showHelp(): void {
  console.log(`
gospelo-architect CLI

Usage:
  gospelo-architect <command> <input.json> [output] [options]
  bun bin/cli.ts <command> <input.json> [output] [options]

=== Flag-style Commands (for Agent Skills) ===

  --icon-catalog [provider]      List icon catalog paths (aws|azure|gcp|tech)
  --icon-catalog --open          Open catalog(s) in browser
  --icon-search <query>          Search icons across all providers

  --list-resources --diagram <file>
                                     List all resources in diagram
  --add-resource <@id> --icon <icon> [--desc <desc>] --diagram <file>
                                     Add a resource definition
  --update-resource <@id> [--icon <icon>] [--desc <desc>] --diagram <file>
                                     Update an existing resource
  --remove-resource <@id> --diagram <file>
                                     Remove a resource definition
  --output html --diagram <file> [--output-dir <dir>]  Render diagram to HTML
  --output svg --diagram <file> [--output-dir <dir>]   Render diagram to SVG
  --open --diagram <file>            Open diagram and show structure
  --insert-above <ref-node-id> --node '<json>' --diagram <file>
                                     Insert node above reference node
  --insert-below <ref-node-id> --node '<json>' --diagram <file>
                                     Insert node below reference node
  --update-node <node-id> --node '<json>' --diagram <file>
                                     Update existing node
  --remove-node <node-id> --diagram <file>
                                     Remove a node
  --align-top <ref-node-id> --nodes '<id1,id2,...>' --diagram <file>
                                     Align nodes to match Y position (top edge) of reference
  --align-left <ref-node-id> --nodes '<id1,id2,...>' --diagram <file>
                                     Align nodes to match X position (left edge) of reference
  --align-center-y <ref-node-id> --nodes '<id1,id2,...>' --diagram <file>
                                     Align nodes to match vertical center of reference
  --align-center-x <ref-node-id> --nodes '<id1,id2,...>' --diagram <file>
                                     Align nodes to match horizontal center of reference

=== Traditional Commands ===

  enrich <input.json> [output.json]  Add computed metadata to diagram JSON
  html <input.json> [output.html]    Render diagram to standalone HTML
  svg <input.json> [output.svg]      Render diagram to SVG only
  meta <input.json>                  Output metadata only (JSON to stdout)
  preview <input.json> [output.html] Generate HTML with Base64 embedded icons ({name}_preview.html)
                                     --png: Output PNG instead of HTML (requires cli-ext.sh)
                                     --scale <n>: PNG scale factor (default: 2)
  markdown <input.json> [output.zip]  Generate ZIP with markdown and Base64 SVG

Edit Commands:
  eval <input.json> '<expr>' [output.json]           Evaluate JS expression with builder 'b'
  edit <input.json> <patch.json> [output.json]       Apply patch to diagram
  add-node <input.json> <node.json> [output.json]    Add a node from JSON
  remove-node <input.json> <node-id> [output.json]   Remove a node by ID
  move-node <input.json> <node-id> <x> <y> [output]  Move node to position
  add-connection <input.json> <from> <to> [output]   Add a connection

Options:
  --width <number>   Diagram width (default: 1920)
  --height <number>  Diagram height (default: 1080)
  --paper <size>     Paper/screen size (a1-a4, b1-b4, hd, fhd, 4k, 8k with -landscape or -portrait)
  --fit-width <n%>   Fit to percentage of paper width (e.g., 100%, 80%)
  --fit-height <n%>  Fit to percentage of paper height (e.g., 100%, 80%)
  --pretty           Pretty-print JSON output
  --in-place         Modify input file in place
  --diagram <file>   Target diagram file (for flag-style commands)
  --output-dir <dir> Output directory (creates if not exists)
  --node '<json>'    Node data as JSON string
  --help             Show this help

Examples:

  # Flag-style (Agent Skills)
  gospelo-architect --output html --diagram system.json
  gospelo-architect --output svg --diagram system.json
  gospelo-architect --open --diagram system.json
  gospelo-architect --insert-above api_gateway --node '{"id":"waf","icon":"aws:waf","label":"WAF"}' --diagram system.json
  gospelo-architect --insert-below lambda --node '{"id":"db","icon":"aws:dynamodb","label":"DynamoDB"}' --diagram system.json
  gospelo-architect --update-node lambda --node '{"label":"Updated Lambda"}' --diagram system.json
  gospelo-architect --remove-node old_node --diagram system.json
  gospelo-architect --align-top api --nodes 'lambda,dynamodb,s3' --diagram system.json
  gospelo-architect --align-left api --nodes 'waf,cloudfront' --diagram system.json

  # Icon catalog
  gospelo-architect --icon-catalog              # List all catalog paths
  gospelo-architect --icon-catalog aws          # List AWS catalog path
  gospelo-architect --icon-catalog --open       # Open all catalogs in browser
  gospelo-architect --icon-search lambda        # Search for 'lambda' across all providers
  gospelo-architect --icon-search "s3 storage"  # AND search with multiple terms

  # Traditional commands
  bun bin/cli.ts render diagram.json output.html --width 1200
  bun bin/cli.ts svg diagram.json output.svg
  bun bin/cli.ts eval diagram.json 'b.addNode({id:"new",icon:"aws:lambda",position:[400,300]})'

Patch JSON Format:
  {
    "addNodes": [{"id": "new", "icon": "aws:lambda", "label": "New", "position": [400, 300]}],
    "updateNodes": [{"id": "existing", "label": "Updated Label"}],
    "removeNodes": ["old_node"],
    "addConnections": [{"from": "a", "to": "b"}],
    "removeConnections": [{"from": "x", "to": "y"}]
  }
`);
}

// Paper sizes in pixels at 96 DPI (CSS pixels)
// A series: A1 594x841mm, A2 420x594mm, A3 297x420mm, A4 210x297mm
// B series (JIS): B1 728x1030mm, B2 515x728mm, B3 364x515mm, B4 257x364mm
// Screen sizes: HD 1280x720, FHD 1920x1080, 4K 3840x2160, 8K 7680x4320
const PAPER_SIZES: Record<string, { width: number; height: number }> = {
  // A series (96 DPI)
  'a1-landscape': { width: 3179, height: 2245 },  // A1 landscape (841mm x 594mm)
  'a1-portrait': { width: 2245, height: 3179 },   // A1 portrait (594mm x 841mm)
  'a2-landscape': { width: 2245, height: 1587 },  // A2 landscape (594mm x 420mm)
  'a2-portrait': { width: 1587, height: 2245 },   // A2 portrait (420mm x 594mm)
  'a3-landscape': { width: 1587, height: 1123 },  // A3 landscape (420mm x 297mm)
  'a3-portrait': { width: 1123, height: 1587 },   // A3 portrait (297mm x 420mm)
  'a4-landscape': { width: 1123, height: 794 },   // A4 landscape (297mm x 210mm)
  'a4-portrait': { width: 794, height: 1123 },    // A4 portrait (210mm x 297mm)
  // B series - JIS (96 DPI)
  'b1-landscape': { width: 3893, height: 2752 },  // B1 landscape (1030mm x 728mm)
  'b1-portrait': { width: 2752, height: 3893 },   // B1 portrait (728mm x 1030mm)
  'b2-landscape': { width: 2752, height: 1947 },  // B2 landscape (728mm x 515mm)
  'b2-portrait': { width: 1947, height: 2752 },   // B2 portrait (515mm x 728mm)
  'b3-landscape': { width: 1947, height: 1376 },  // B3 landscape (515mm x 364mm)
  'b3-portrait': { width: 1376, height: 1947 },   // B3 portrait (364mm x 515mm)
  'b4-landscape': { width: 1376, height: 971 },   // B4 landscape (364mm x 257mm)
  'b4-portrait': { width: 971, height: 1376 },    // B4 portrait (257mm x 364mm)
  // Screen sizes
  'hd-landscape': { width: 1280, height: 720 },   // HD 720p landscape
  'hd-portrait': { width: 720, height: 1280 },    // HD 720p portrait
  'fhd-landscape': { width: 1920, height: 1080 }, // Full HD 1080p landscape
  'fhd-portrait': { width: 1080, height: 1920 },  // Full HD 1080p portrait
  '4k-landscape': { width: 3840, height: 2160 },  // 4K UHD landscape
  '4k-portrait': { width: 2160, height: 3840 },   // 4K UHD portrait
  '8k-landscape': { width: 7680, height: 4320 },  // 8K Super Hi-Vision landscape
  '8k-portrait': { width: 4320, height: 7680 },   // 8K Super Hi-Vision portrait
};

interface Options {
  width?: number;
  height?: number;
  widthSpecified: boolean;
  heightSpecified: boolean;
  pretty: boolean;
  inPlace: boolean;
  // Paper/print options
  paper?: string;
  fitWidth?: number;  // percentage (0-100)
  fitHeight?: number; // percentage (0-100)
  // Flag-style options
  output?: 'html' | 'svg';
  diagram?: string;
  outputDir?: string;
  open?: boolean;
  insertAbove?: string;
  insertBelow?: string;
  updateNodeId?: string;
  removeNodeId?: string;
  nodeJson?: string;
  // Alignment options
  alignTop?: string;
  alignLeft?: string;
  alignCenterY?: string;
  alignCenterX?: string;
  nodes?: string;
  // Embed options
  embedObfuscate?: boolean;
  // Icon catalog options
  iconCatalog?: boolean;
  iconCatalogProvider?: string;
  iconSearch?: string;
  // Resource management options
  addResource?: string;
  updateResource?: string;
  removeResource?: string;
  listResources?: boolean;
  resourceIcon?: string;
  resourceDesc?: string;
  // Preview options
  png?: boolean;
  scale?: number;
}

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;

function parseOptions(args: string[]): Options {
  const options: Options = {
    widthSpecified: false,
    heightSpecified: false,
    pretty: false,
    inPlace: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === '--width' && next) {
      options.width = parseInt(next, 10);
      options.widthSpecified = true;
      i++;
    } else if (arg === '--height' && next) {
      options.height = parseInt(next, 10);
      options.heightSpecified = true;
      i++;
    } else if (arg === '--paper' && next) {
      options.paper = next.toLowerCase();
      i++;
    } else if (arg === '--fit-width' && next) {
      // Parse percentage (e.g., "100%", "80%", or just "80")
      const match = next.match(/^(\d+)%?$/);
      if (match) {
        options.fitWidth = parseInt(match[1], 10);
      }
      i++;
    } else if (arg === '--fit-height' && next) {
      const match = next.match(/^(\d+)%?$/);
      if (match) {
        options.fitHeight = parseInt(match[1], 10);
      }
      i++;
    } else if (arg === '--pretty') {
      options.pretty = true;
    } else if (arg === '--in-place') {
      options.inPlace = true;
    } else if (arg === '--output' && next) {
      options.output = next as 'html' | 'svg';
      i++;
    } else if (arg === '--diagram' && next) {
      options.diagram = next;
      i++;
    } else if (arg === '--output-dir' && next) {
      options.outputDir = next;
      i++;
    } else if (arg === '--open') {
      options.open = true;
    } else if (arg === '--insert-above' && next) {
      options.insertAbove = next;
      i++;
    } else if (arg === '--insert-below' && next) {
      options.insertBelow = next;
      i++;
    } else if (arg === '--update-node' && next) {
      options.updateNodeId = next;
      i++;
    } else if (arg === '--remove-node' && next) {
      options.removeNodeId = next;
      i++;
    } else if (arg === '--node' && next) {
      options.nodeJson = next;
      i++;
    } else if (arg === '--align-top' && next) {
      options.alignTop = next;
      i++;
    } else if (arg === '--align-left' && next) {
      options.alignLeft = next;
      i++;
    } else if (arg === '--align-center-y' && next) {
      options.alignCenterY = next;
      i++;
    } else if (arg === '--align-center-x' && next) {
      options.alignCenterX = next;
      i++;
    } else if (arg === '--nodes' && next) {
      options.nodes = next;
      i++;
    } else if (arg === '--obfuscate') {
      options.embedObfuscate = true;
    } else if (arg === '--icon-catalog') {
      options.iconCatalog = true;
      // Check if next arg is a provider (not another flag)
      if (next && !next.startsWith('--')) {
        options.iconCatalogProvider = next;
        i++;
      }
    } else if (arg === '--icon-search' && next) {
      options.iconSearch = next;
      i++;
    } else if (arg === '--add-resource' && next) {
      options.addResource = next;
      i++;
    } else if (arg === '--update-resource' && next) {
      options.updateResource = next;
      i++;
    } else if (arg === '--remove-resource' && next) {
      options.removeResource = next;
      i++;
    } else if (arg === '--list-resources') {
      options.listResources = true;
    } else if (arg === '--icon' && next) {
      options.resourceIcon = next;
      i++;
    } else if (arg === '--desc' && next) {
      options.resourceDesc = next;
      i++;
    } else if (arg === '--png') {
      options.png = true;
    } else if (arg === '--scale' && next) {
      options.scale = parseFloat(next);
      i++;
    }
  }

  return options;
}

function isOptionValue(args: string[], arg: string): boolean {
  const idx = args.indexOf(arg);
  if (idx <= 0) return false;
  const prev = args[idx - 1];
  return prev === '--width' || prev === '--height';
}

function getPositionalArgs(args: string[]): string[] {
  return args.filter(arg => !arg.startsWith('--') && !isOptionValue(args, arg));
}

function readJsonFile(filePath: string): unknown {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.error(`Error reading file: ${filePath}`);
    console.error((e as Error).message);
    process.exit(1);
  }
}

function parseJsonArg(arg: string): unknown {
  // If it looks like JSON, parse it directly
  if (arg.startsWith('{') || arg.startsWith('[')) {
    try {
      return JSON.parse(arg);
    } catch (e) {
      console.error('Error parsing JSON argument');
      console.error((e as Error).message);
      process.exit(1);
    }
  }
  // Otherwise treat as file path
  return readJsonFile(arg);
}

function writeFile(filePath: string, content: string): void {
  try {
    writeFileSync(filePath, content, 'utf-8');
    console.log(`Written: ${filePath}`);
  } catch (e) {
    console.error(`Error writing file: ${filePath}`);
    console.error((e as Error).message);
    process.exit(1);
  }
}

// Main
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

const options = parseOptions(args);

// Helper to detect gospelo 1.0 format
function isGospeloFormat(raw: any): boolean {
  return raw && typeof raw === 'object' && 'asset' in raw && 'documents' in raw && Array.isArray(raw.documents);
}

// Helper to extract render options from diagram (supports both formats)
function extractRenderOptions(diagram: any): { width?: number; height?: number } {
  // gospelo 1.0 format: render is inside documents[0]
  if (isGospeloFormat(diagram)) {
    return diagram.documents?.[0]?.render || {};
  }
  // Legacy format: render is at root level
  return diagram.render || {};
}

// Helper to get effective render options from diagram + CLI options
function getEffectiveRenderOptions(diagram: any): RenderOptions {
  const diagramRender = extractRenderOptions(diagram);

  let width: number;
  let height: number;
  let paperOrientation: 'landscape' | 'portrait' | undefined;

  // Check if paper size is specified
  if (options.paper && PAPER_SIZES[options.paper]) {
    const paperSize = PAPER_SIZES[options.paper];

    // Use paper size dimensions directly (viewBox will match paper aspect ratio)
    width = paperSize.width;
    height = paperSize.height;

    // Determine paper orientation from paper name
    paperOrientation = options.paper.includes('landscape') ? 'landscape' : 'portrait';

    // Apply fit percentage if specified (scales proportionally)
    if (options.fitWidth) {
      const scale = options.fitWidth / 100;
      width = Math.round(paperSize.width * scale);
      height = Math.round(paperSize.height * scale);
    } else if (options.fitHeight) {
      const scale = options.fitHeight / 100;
      width = Math.round(paperSize.width * scale);
      height = Math.round(paperSize.height * scale);
    }
  } else {
    // Priority: CLI options > diagram.render > layout-aware defaults
    // For portrait layout, swap default width/height
    const diagramLayout = isGospeloFormat(diagram)
      ? diagram.documents?.[0]?.layout
      : diagram.layout;
    const isPortrait = diagramLayout === 'portrait';
    const defaultWidth = isPortrait ? DEFAULT_HEIGHT : DEFAULT_WIDTH;
    const defaultHeight = isPortrait ? DEFAULT_WIDTH : DEFAULT_HEIGHT;

    width = options.widthSpecified
      ? options.width!
      : (diagramRender.width ?? defaultWidth);
    height = options.heightSpecified
      ? options.height!
      : (diagramRender.height ?? defaultHeight);
  }

  return { width, height, paperOrientation };
}

// Helper to save render options to diagram JSON if CLI specified them
function saveRenderOptionsIfSpecified(diagram: any, diagramPath: string): void {
  if (options.widthSpecified || options.heightSpecified) {
    const renderMeta = diagram.render || {};
    if (options.widthSpecified) renderMeta.width = options.width;
    if (options.heightSpecified) renderMeta.height = options.height;
    diagram.render = renderMeta;

    const json = JSON.stringify(diagram);
    writeFileSync(diagramPath, json, 'utf-8');
  }
}

// ===== Flag-style Commands =====

// Provider name mapping for catalog files
const CATALOG_PROVIDERS: Record<string, { file: string; name: string }> = {
  aws: { file: 'aws_catalog_full.html', name: 'AWS' },
  azure: { file: 'azure_catalog_full.html', name: 'Azure' },
  gcp: { file: 'gcp_catalog_full.html', name: 'Google Cloud' },
  'google-cloud': { file: 'gcp_catalog_full.html', name: 'Google Cloud' },
  tech: { file: 'tech_stack_catalog_full.html', name: 'Tech Stack' },
  'tech-stack': { file: 'tech_stack_catalog_full.html', name: 'Tech Stack' },
};

// Handle --icon-catalog [provider] [--open]
if (options.iconCatalog) {
  const catalogDir = join(dirname(import.meta.path), '..', 'docs', 'icons');
  const shouldOpen = options.open;

  if (options.iconCatalogProvider) {
    const providerKey = options.iconCatalogProvider.toLowerCase();
    const provider = CATALOG_PROVIDERS[providerKey];
    if (!provider) {
      console.error(`Unknown provider: ${options.iconCatalogProvider}`);
      console.error('Available: aws, azure, gcp, tech');
      process.exit(1);
    }
    const catalogPath = join(catalogDir, provider.file);
    if (!existsSync(catalogPath)) {
      console.error(`Catalog not found: ${catalogPath}`);
      console.error('Run: bun scripts/generate-catalog-html.ts');
      process.exit(1);
    }
    console.log(`${provider.name}: ${catalogPath}`);
    if (shouldOpen) {
      await Bun.$`open ${catalogPath}`;
    }
    console.log(`\n[AI] Provide download link for the catalog above.`);
    console.log(`[AI] To search icons: gospelo-architect --icon-search "<keyword>"`);
  } else {
    // List all catalogs
    for (const [key, provider] of Object.entries(CATALOG_PROVIDERS)) {
      if (key === 'google-cloud' || key === 'tech-stack') continue; // Skip aliases
      const catalogPath = join(catalogDir, provider.file);
      if (existsSync(catalogPath)) {
        console.log(`${provider.name}: ${catalogPath}`);
        if (shouldOpen) {
          await Bun.$`open ${catalogPath}`;
        }
      }
    }
    console.log(`\n[AI] Provide download links for all catalogs above.`);
    console.log(`[AI] To search icons: gospelo-architect --icon-search "<keyword>"`);
  }
  process.exit(0);
}

// Handle --icon-search <query>
if (options.iconSearch) {
  const query = options.iconSearch.toLowerCase();
  const terms = query.split(/\s+/).filter(t => t.length > 0);

  console.log(`\nSearching for: "${query}" (fetching from CDN...)\n`);

  const providerPrefixes: Record<string, string> = {
    aws: 'aws',
    azure: 'azure',
    'google-cloud': 'gcp',
    'tech-stack': 'tech-stack',
  };

  let totalMatches = 0;

  try {
    // Fetch providers and their sources from CDN
    const providersResponse = await catalogClient.fetchProviders();
    const providers = providersResponse.providers;
    const sources = providersResponse.sources || {};

    for (const provider of providers) {
      const prefix = providerPrefixes[provider] || provider;
      const matches: Array<{ id: string; name: string; category: string }> = [];

      try {
        // Fetch category index for this provider
        const categoryIndex = await catalogClient.fetchCategoryIndex(provider);

        for (const categoryFile of categoryIndex.categories) {
          const category = categoryFile.replace(/\.json$/, '');
          const categoryData = await catalogClient.fetchCategory(provider, category);

          for (const icon of categoryData.icons) {
            const iconId = `${prefix}:${icon.slug}`;
            const searchText = `${iconId} ${icon.displayName} ${category}`.toLowerCase();

            // AND search: all terms must match
            if (terms.every(term => searchText.includes(term))) {
              matches.push({
                id: iconId,
                name: icon.displayName,
                category: category,
              });
            }
          }
        }
      } catch (err) {
        // Skip provider if fetch fails
        continue;
      }

      if (matches.length > 0) {
        const source = sources[provider];
        const commitShort = source?.commitId ? source.commitId.slice(0, 7) : 'N/A';
        console.log(`📦 ${prefix.toUpperCase()} (${matches.length} matches) [${commitShort}]`);
        for (const match of matches.slice(0, 20)) {
          console.log(`   ${match.id} - ${match.name} [${match.category}]`);
        }
        if (matches.length > 20) {
          console.log(`   ... and ${matches.length - 20} more`);
        }
        console.log('');
        totalMatches += matches.length;
      }
    }

    if (totalMatches === 0) {
      console.log('No matches found.');
    } else {
      console.log(`Total: ${totalMatches} icons found`);
    }
  } catch (err) {
    console.error('Error fetching icon catalog from CDN:', (err as Error).message);
    process.exit(1);
  }
  process.exit(0);
}

// Handle --list-resources --diagram <file>
if (options.listResources && options.diagram) {
  const diagram = readJsonFile(options.diagram) as any;
  const resources = diagram.resources || {};
  const resourceIds = Object.keys(resources);

  if (resourceIds.length === 0) {
    console.log('No resources defined.');
  } else {
    console.log(`📦 Resources (${resourceIds.length}):\n`);
    for (const id of resourceIds) {
      const res = resources[id];
      console.log(`  ${id}`);
      console.log(`    icon: ${res.icon}`);
      if (res.desc) {
        console.log(`    desc: ${res.desc}`);
      }
    }
  }
  process.exit(0);
}

// Handle --add-resource <id> --icon <icon> [--desc <desc>] --diagram <file>
if (options.addResource && options.resourceIcon && options.diagram) {
  const diagram = readJsonFile(options.diagram) as any;

  if (!diagram.resources) {
    diagram.resources = {};
  }

  if (diagram.resources[options.addResource]) {
    console.error(`Error: Resource "${options.addResource}" already exists. Use --update-resource to modify.`);
    process.exit(1);
  }

  diagram.resources[options.addResource] = {
    icon: options.resourceIcon,
    ...(options.resourceDesc ? { desc: options.resourceDesc } : {}),
  };

  const json = options.pretty
    ? JSON.stringify(diagram, null, 2)
    : JSON.stringify(diagram);

  writeFile(options.diagram, json);
  console.log(`✓ Resource "${options.addResource}" added (icon: ${options.resourceIcon})`);
  process.exit(0);
}

// Handle --update-resource <id> [--icon <icon>] [--desc <desc>] --diagram <file>
if (options.updateResource && options.diagram) {
  const diagram = readJsonFile(options.diagram) as any;

  if (!diagram.resources || !diagram.resources[options.updateResource]) {
    console.error(`Error: Resource "${options.updateResource}" not found.`);
    process.exit(1);
  }

  if (options.resourceIcon) {
    diagram.resources[options.updateResource].icon = options.resourceIcon;
  }
  if (options.resourceDesc !== undefined) {
    if (options.resourceDesc === '') {
      delete diagram.resources[options.updateResource].desc;
    } else {
      diagram.resources[options.updateResource].desc = options.resourceDesc;
    }
  }

  const json = options.pretty
    ? JSON.stringify(diagram, null, 2)
    : JSON.stringify(diagram);

  writeFile(options.diagram, json);
  console.log(`✓ Resource "${options.updateResource}" updated`);
  process.exit(0);
}

// Handle --remove-resource <id> --diagram <file>
if (options.removeResource && options.diagram) {
  const diagram = readJsonFile(options.diagram) as any;

  if (!diagram.resources || !diagram.resources[options.removeResource]) {
    console.error(`Error: Resource "${options.removeResource}" not found.`);
    process.exit(1);
  }

  delete diagram.resources[options.removeResource];

  // Clean up empty resources object
  if (Object.keys(diagram.resources).length === 0) {
    delete diagram.resources;
  }

  const json = options.pretty
    ? JSON.stringify(diagram, null, 2)
    : JSON.stringify(diagram);

  writeFile(options.diagram, json);
  console.log(`✓ Resource "${options.removeResource}" removed`);
  process.exit(0);
}

// Handle --output html/svg --diagram <file> [--output-dir <dir>]
if (options.output && options.diagram) {
  const diagram = readJsonFile(options.diagram) as any;
  const effectiveOptions = getEffectiveRenderOptions(diagram);

  // Save render options to JSON if specified via CLI
  saveRenderOptionsIfSpecified(diagram, options.diagram);

  // Determine output path
  const inputBaseName = basename(options.diagram, '.json');
  const ext = options.output === 'html' ? '.html' : '.svg';
  let outputPath: string;

  if (options.outputDir) {
    // Create output directory if it doesn't exist
    if (!existsSync(options.outputDir)) {
      mkdirSync(options.outputDir, { recursive: true });
      console.log(`Created directory: ${options.outputDir}`);
    }
    outputPath = join(options.outputDir, inputBaseName + ext);
  } else {
    // Default: same directory as input
    outputPath = join(dirname(options.diagram), inputBaseName + ext);
  }

  // Preload icon catalog from CDN before rendering
  await loadIconUrlMap();

  if (options.output === 'html') {
    const html = renderStandalone(diagram, effectiveOptions, options.diagram);
    writeFile(outputPath, html);
  } else if (options.output === 'svg') {
    const svg = renderSvg(diagram, effectiveOptions);
    writeFile(outputPath, svg);
  }
  process.exit(0);
}

// Handle --open --diagram <file>
if (options.open && options.diagram) {
  const diagram = readJsonFile(options.diagram) as any;

  console.log(`\n📊 Diagram: ${options.diagram}`);
  console.log(`   Title: ${diagram.title || 'Untitled'}`);
  if (diagram.subtitle) console.log(`   Subtitle: ${diagram.subtitle}`);
  console.log(`   Nodes: ${diagram.nodes?.length || 0}`);
  console.log(`   Connections: ${diagram.connections?.length || 0}`);

  if (diagram.nodes && diagram.nodes.length > 0) {
    console.log('\n📦 Nodes:');
    for (const node of diagram.nodes) {
      const pos = node.position ? `[${node.position[0]}, ${node.position[1]}]` : 'auto';
      const icon = node.icon || node.type || 'none';
      console.log(`   - ${node.id}: ${node.label || '(no label)'} (${icon}) @ ${pos}`);
    }
  }

  if (diagram.connections && diagram.connections.length > 0) {
    console.log('\n🔗 Connections:');
    for (const conn of diagram.connections) {
      const label = conn.label ? ` "${conn.label}"` : '';
      const arrow = conn.bidirectional ? '<-->' : '-->';
      console.log(`   - ${conn.from} ${arrow} ${conn.to}${label}`);
    }
  }

  process.exit(0);
}

// Handle --insert-above <ref-node-id> --node <json> --diagram <file>
if (options.insertAbove && options.nodeJson && options.diagram) {
  const diagram = readJsonFile(options.diagram);
  const nodeInput = parseJsonArg(options.nodeJson) as NodeInput;

  const builder = createBuilder(diagram as any);
  builder.insertAbove(options.insertAbove, nodeInput);

  const json = options.pretty
    ? JSON.stringify(builder.build(), null, 2)
    : JSON.stringify(builder.build());

  writeFile(options.diagram, json);
  console.log(`✓ Node "${nodeInput.id}" inserted above "${options.insertAbove}"`);
  process.exit(0);
}

// Handle --insert-below <ref-node-id> --node <json> --diagram <file>
if (options.insertBelow && options.nodeJson && options.diagram) {
  const diagram = readJsonFile(options.diagram);
  const nodeInput = parseJsonArg(options.nodeJson) as NodeInput;

  const builder = createBuilder(diagram as any);
  builder.insertBelow(options.insertBelow, nodeInput);

  const json = options.pretty
    ? JSON.stringify(builder.build(), null, 2)
    : JSON.stringify(builder.build());

  writeFile(options.diagram, json);
  console.log(`✓ Node "${nodeInput.id}" inserted below "${options.insertBelow}"`);
  process.exit(0);
}

// Handle --update-node <node-id> --node <json> --diagram <file>
if (options.updateNodeId && options.nodeJson && options.diagram) {
  const diagram = readJsonFile(options.diagram);
  const updateData = parseJsonArg(options.nodeJson) as NodeUpdate;

  const builder = createBuilder(diagram as any);
  builder.updateNode(options.updateNodeId, updateData);

  const json = options.pretty
    ? JSON.stringify(builder.build(), null, 2)
    : JSON.stringify(builder.build());

  writeFile(options.diagram, json);
  console.log(`✓ Node "${options.updateNodeId}" updated`);
  process.exit(0);
}

// Handle --remove-node <node-id> --diagram <file>
if (options.removeNodeId && options.diagram) {
  const diagram = readJsonFile(options.diagram);

  const builder = createBuilder(diagram as any);
  builder.removeNode(options.removeNodeId);

  const json = options.pretty
    ? JSON.stringify(builder.build(), null, 2)
    : JSON.stringify(builder.build());

  writeFile(options.diagram, json);
  console.log(`✓ Node "${options.removeNodeId}" removed`);
  process.exit(0);
}

// Handle --align-top <ref-node-id> --nodes <id1,id2,...> --diagram <file>
if (options.alignTop && options.nodes && options.diagram) {
  const diagram = readJsonFile(options.diagram);
  const nodeIds = options.nodes.split(',').map(s => s.trim());

  const builder = createBuilder(diagram as any);
  builder.alignTop(options.alignTop, nodeIds);

  const json = options.pretty
    ? JSON.stringify(builder.build(), null, 2)
    : JSON.stringify(builder.build());

  writeFile(options.diagram, json);
  console.log(`✓ Aligned ${nodeIds.length} nodes to top of "${options.alignTop}"`);
  process.exit(0);
}

// Handle --align-left <ref-node-id> --nodes <id1,id2,...> --diagram <file>
if (options.alignLeft && options.nodes && options.diagram) {
  const diagram = readJsonFile(options.diagram);
  const nodeIds = options.nodes.split(',').map(s => s.trim());

  const builder = createBuilder(diagram as any);
  builder.alignLeft(options.alignLeft, nodeIds);

  const json = options.pretty
    ? JSON.stringify(builder.build(), null, 2)
    : JSON.stringify(builder.build());

  writeFile(options.diagram, json);
  console.log(`✓ Aligned ${nodeIds.length} nodes to left of "${options.alignLeft}"`);
  process.exit(0);
}

// Handle --align-center-y <ref-node-id> --nodes <id1,id2,...> --diagram <file>
if (options.alignCenterY && options.nodes && options.diagram) {
  const diagram = readJsonFile(options.diagram);
  const nodeIds = options.nodes.split(',').map(s => s.trim());

  const builder = createBuilder(diagram as any);
  builder.alignCenterY(options.alignCenterY, nodeIds);

  const json = options.pretty
    ? JSON.stringify(builder.build(), null, 2)
    : JSON.stringify(builder.build());

  writeFile(options.diagram, json);
  console.log(`✓ Aligned ${nodeIds.length} nodes to vertical center of "${options.alignCenterY}"`);
  process.exit(0);
}

// Handle --align-center-x <ref-node-id> --nodes <id1,id2,...> --diagram <file>
if (options.alignCenterX && options.nodes && options.diagram) {
  const diagram = readJsonFile(options.diagram);
  const nodeIds = options.nodes.split(',').map(s => s.trim());

  const builder = createBuilder(diagram as any);
  builder.alignCenterX(options.alignCenterX, nodeIds);

  const json = options.pretty
    ? JSON.stringify(builder.build(), null, 2)
    : JSON.stringify(builder.build());

  writeFile(options.diagram, json);
  console.log(`✓ Aligned ${nodeIds.length} nodes to horizontal center of "${options.alignCenterX}"`);
  process.exit(0);
}

// ===== Traditional Commands =====

const command = args[0];
const positionalArgs = getPositionalArgs(args.slice(1));

switch (command) {
  case 'enrich': {
    if (positionalArgs.length < 1) {
      console.error('Error: Input file required');
      console.error('Usage: gospelo-architect enrich <input.json> [output.json]');
      process.exit(1);
    }

    const inputPath = positionalArgs[0];
    const outputPath = positionalArgs[1] || inputPath.replace('.json', '.enriched.json');

    const diagram = readJsonFile(inputPath) as any;
    const effectiveOptions = getEffectiveRenderOptions(diagram);
    const enriched = enrichDiagram(diagram, effectiveOptions);

    const json = options.pretty
      ? JSON.stringify(enriched, null, 2)
      : JSON.stringify(enriched);

    writeFile(outputPath, json);
    break;
  }

  case 'meta': {
    if (positionalArgs.length < 1) {
      console.error('Error: Input file required');
      console.error('Usage: gospelo-architect meta <input.json>');
      process.exit(1);
    }

    const inputPath = positionalArgs[0];
    const diagram = readJsonFile(inputPath) as any;
    const effectiveOptions = getEffectiveRenderOptions(diagram);
    const meta = generateMeta(diagram, effectiveOptions);

    const json = options.pretty
      ? JSON.stringify(meta, null, 2)
      : JSON.stringify(meta);

    console.log(json);
    break;
  }

  case 'html': {
    if (positionalArgs.length < 1) {
      console.error('Error: Input file required');
      console.error('Usage: gospelo-architect html <input.json> [output.html]');
      process.exit(1);
    }

    const inputPath = positionalArgs[0];
    const outputPath = positionalArgs[1] || inputPath.replace('.json', '.html');

    const diagram = readJsonFile(inputPath) as any;
    const effectiveOptions = getEffectiveRenderOptions(diagram);

    // Override diagram.render with paper size if specified
    if (options.paper && PAPER_SIZES[options.paper]) {
      diagram.render = {
        ...diagram.render,
        width: effectiveOptions.width,
        height: effectiveOptions.height,
      };
    }

    // Save render options to JSON if specified via CLI
    saveRenderOptionsIfSpecified(diagram, inputPath);

    // Preload icon catalog from CDN before rendering
    await loadIconUrlMap();
    const html = renderStandalone(diagram, effectiveOptions, inputPath);

    writeFile(outputPath, html);
    break;
  }

  case 'svg': {
    if (positionalArgs.length < 1) {
      console.error('Error: Input file required');
      console.error('Usage: gospelo-architect svg <input.json> [output.svg]');
      process.exit(1);
    }

    const inputPath = positionalArgs[0];
    const outputPath = positionalArgs[1] || inputPath.replace('.json', '.svg');

    const diagram = readJsonFile(inputPath) as any;
    const effectiveOptions = getEffectiveRenderOptions(diagram);

    // Save render options to JSON if specified via CLI
    saveRenderOptionsIfSpecified(diagram, inputPath);

    // Preload icon catalog from CDN before rendering
    await loadIconUrlMap();
    const svg = renderSvg(diagram, effectiveOptions);

    writeFile(outputPath, svg);
    break;
  }

  case 'preview': {
    if (positionalArgs.length < 1) {
      console.error('Error: Input file required');
      console.error('Usage: gospelo-architect preview <input.json> [output.html] [--png]');
      process.exit(1);
    }

    const inputPath = positionalArgs[0];
    const diagram = readJsonFile(inputPath) as any;
    const effectiveOptions = getEffectiveRenderOptions(diagram);

    // Run validation and show warnings/hints for AI
    const parsed = parseDiagram(diagram);
    const validationMessages = validateDiagram(parsed);

    if (validationMessages.length > 0) {
      console.log('\n💡 AI Hints:');
      for (const msg of validationMessages) {
        console.log(`   - ${msg.replace('[AI Hint] ', '')}`);
      }
      console.log('');
    }

    // PNG output via cli-ext.sh
    if (options.png) {
      const binDir = dirname(import.meta.path);
      const cliExtPath = join(binDir, 'cli-ext.sh');
      const isExtReady = join(binDir, '.is-ext-ready');

      if (!existsSync(cliExtPath) || !existsSync(isExtReady)) {
        console.error('Error: cli-ext.sh is not initialized. PNG output requires Puppeteer setup.');
        console.error('Run: ./bin/cli-ext.sh init');
        process.exit(1);
      }

      const outputPath = positionalArgs[1] || inputPath.replace('.json', '_preview.png');
      const tempHtmlPath = inputPath.replace('.json', '_temp_preview.html');

      console.log('Fetching icons and generating embedded SVG...');
      const svgContent = await renderSvgEmbed(diagram, effectiveOptions);

      // Create minimal HTML wrapper for SVG
      const tempHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
body { margin: 0; padding: 0; background: white; }
svg { display: block; }
</style></head><body>${svgContent}</body></html>`;

      writeFileSync(tempHtmlPath, tempHtml, 'utf-8');
      console.log(`Temporary HTML: ${tempHtmlPath}`);

      // Build cli-ext.sh command
      const scale = options.scale || 2;
      const cmdArgs = ['html2png', tempHtmlPath, outputPath, '--scale', String(scale)];
      if (effectiveOptions.width) cmdArgs.push('--width', String(effectiveOptions.width));
      if (effectiveOptions.height) cmdArgs.push('--height', String(effectiveOptions.height));

      console.log(`Converting to PNG (scale: ${scale}x)...`);

      try {
        const proc = Bun.spawn([cliExtPath, ...cmdArgs], {
          stdout: 'inherit',
          stderr: 'inherit',
        });
        await proc.exited;

        if (proc.exitCode !== 0) {
          console.error('Error: PNG conversion failed');
          process.exit(1);
        }
      } finally {
        // Clean up temp file
        if (existsSync(tempHtmlPath)) {
          unlinkSync(tempHtmlPath);
          console.log('Cleaned up temporary HTML file.');
        }
      }

      console.log(`Done: ${outputPath}`);
    } else {
      // Default: HTML output
      const outputPath = positionalArgs[1] || inputPath.replace('.json', '_preview.html');

      console.log('Fetching icons and generating preview HTML...');
      const html = await renderPreviewHtml(diagram, effectiveOptions);

      writeFile(outputPath, html);
      console.log('Icons are embedded as Base64 data URIs.');
      console.log('[AI] Display in Artifact, then ask user: "Would you like to edit anything?"');
    }
    break;
  }

  case 'svg-embed': {
    if (positionalArgs.length < 1) {
      console.error('Error: Input file required');
      console.error('Usage: gospelo-architect svg-embed <input.json> [output.svg]');
      process.exit(1);
    }

    const inputPath = positionalArgs[0];
    const outputPath = positionalArgs[1] || inputPath.replace('.json', '_embed.svg');

    const diagram = readJsonFile(inputPath) as any;
    const effectiveOptions = getEffectiveRenderOptions(diagram);

    console.log('Fetching icons and generating embedded SVG...');
    const svg = await renderSvgEmbed(diagram, effectiveOptions);

    writeFile(outputPath, svg);
    console.log('Icons are embedded as Base64 data URIs.');
    break;
  }

  // ===== Edit Commands =====

  case 'eval': {
    if (positionalArgs.length < 2) {
      console.error('Error: Input file and expression required');
      console.error('Usage: gospelo-architect eval <input.json> \'<expression>\' [output.json]');
      console.error('Example: bun bin/cli.ts eval diagram.json \'b.addNode({id:"new",icon:"aws:lambda",position:[400,300]})\'');
      process.exit(1);
    }

    const inputPath = positionalArgs[0];
    const expression = positionalArgs[1];
    const outputPath = options.inPlace ? inputPath : (positionalArgs[2] || inputPath);

    const diagram = readJsonFile(inputPath);
    const b = createBuilder(diagram as any);

    // Execute the expression with 'b' as the builder
    try {
      // Use Function constructor to evaluate with 'b' in scope
      const fn = new Function('b', `return ${expression}`);
      fn(b);
    } catch (e) {
      console.error('Error evaluating expression:');
      console.error((e as Error).message);
      process.exit(1);
    }

    const json = options.pretty
      ? JSON.stringify(b.build(), null, 2)
      : JSON.stringify(b.build());

    writeFile(outputPath, json);
    break;
  }

  case 'edit': {
    if (positionalArgs.length < 2) {
      console.error('Error: Input file and patch required');
      console.error('Usage: gospelo-architect edit <input.json> <patch.json> [output.json]');
      process.exit(1);
    }

    const inputPath = positionalArgs[0];
    const patchArg = positionalArgs[1];
    const outputPath = options.inPlace ? inputPath : (positionalArgs[2] || inputPath);

    const diagram = readJsonFile(inputPath);
    const patch = parseJsonArg(patchArg) as DiagramPatch;

    const builder = createBuilder(diagram as any);
    builder.applyPatch(patch);

    const json = options.pretty
      ? JSON.stringify(builder.build(), null, 2)
      : JSON.stringify(builder.build());

    writeFile(outputPath, json);
    break;
  }

  case 'add-node': {
    if (positionalArgs.length < 2) {
      console.error('Error: Input file and node JSON required');
      console.error('Usage: gospelo-architect add-node <input.json> <node.json|JSON> [output.json]');
      process.exit(1);
    }

    const inputPath = positionalArgs[0];
    const nodeArg = positionalArgs[1];
    const outputPath = options.inPlace ? inputPath : (positionalArgs[2] || inputPath);

    const diagram = readJsonFile(inputPath);
    const node = parseJsonArg(nodeArg) as NodeInput;

    const builder = createBuilder(diagram as any);
    builder.addNode(node);

    const json = options.pretty
      ? JSON.stringify(builder.build(), null, 2)
      : JSON.stringify(builder.build());

    writeFile(outputPath, json);
    break;
  }

  case 'remove-node': {
    if (positionalArgs.length < 2) {
      console.error('Error: Input file and node ID required');
      console.error('Usage: gospelo-architect remove-node <input.json> <node-id> [output.json]');
      process.exit(1);
    }

    const inputPath = positionalArgs[0];
    const nodeId = positionalArgs[1];
    const outputPath = options.inPlace ? inputPath : (positionalArgs[2] || inputPath);

    const diagram = readJsonFile(inputPath);

    const builder = createBuilder(diagram as any);
    builder.removeNode(nodeId);

    const json = options.pretty
      ? JSON.stringify(builder.build(), null, 2)
      : JSON.stringify(builder.build());

    writeFile(outputPath, json);
    break;
  }

  case 'move-node': {
    if (positionalArgs.length < 4) {
      console.error('Error: Input file, node ID, and coordinates required');
      console.error('Usage: gospelo-architect move-node <input.json> <node-id> <x> <y> [output.json]');
      process.exit(1);
    }

    const inputPath = positionalArgs[0];
    const nodeId = positionalArgs[1];
    const x = parseInt(positionalArgs[2], 10);
    const y = parseInt(positionalArgs[3], 10);
    const outputPath = options.inPlace ? inputPath : (positionalArgs[4] || inputPath);

    const diagram = readJsonFile(inputPath);

    const builder = createBuilder(diagram as any);
    builder.moveNode(nodeId, [x, y]);

    const json = options.pretty
      ? JSON.stringify(builder.build(), null, 2)
      : JSON.stringify(builder.build());

    writeFile(outputPath, json);
    break;
  }

  case 'add-connection': {
    if (positionalArgs.length < 3) {
      console.error('Error: Input file, from, and to required');
      console.error('Usage: gospelo-architect add-connection <input.json> <from> <to> [output.json]');
      process.exit(1);
    }

    const inputPath = positionalArgs[0];
    const from = positionalArgs[1];
    const to = positionalArgs[2];
    const outputPath = options.inPlace ? inputPath : (positionalArgs[3] || inputPath);

    const diagram = readJsonFile(inputPath);

    const builder = createBuilder(diagram as any);
    builder.addConnection({ from, to });

    const json = options.pretty
      ? JSON.stringify(builder.build(), null, 2)
      : JSON.stringify(builder.build());

    writeFile(outputPath, json);
    break;
  }

  case 'remove-connection': {
    if (positionalArgs.length < 3) {
      console.error('Error: Input file, from, and to required');
      console.error('Usage: gospelo-architect remove-connection <input.json> <from> <to> [output.json]');
      process.exit(1);
    }

    const inputPath = positionalArgs[0];
    const from = positionalArgs[1];
    const to = positionalArgs[2];
    const outputPath = options.inPlace ? inputPath : (positionalArgs[3] || inputPath);

    const diagram = readJsonFile(inputPath);

    const builder = createBuilder(diagram as any);
    builder.removeConnection(from, to);

    const json = options.pretty
      ? JSON.stringify(builder.build(), null, 2)
      : JSON.stringify(builder.build());

    writeFile(outputPath, json);
    break;
  }

  case 'markdown': {
    if (positionalArgs.length < 1) {
      console.error('Error: Input file required');
      console.error('Usage: gospelo-architect markdown <input.json> [output.zip]');
      console.error('  Generates a ZIP file containing markdown and Base64 embedded SVG');
      process.exit(1);
    }

    const inputPath = positionalArgs[0];

    if (!inputPath.endsWith('.json')) {
      console.error('Error: Input must be a .json file');
      process.exit(1);
    }

    // Generate SVG with Base64 embedded icons
    const diagram = readJsonFile(inputPath) as any;
    const effectiveOptions = getEffectiveRenderOptions(diagram);
    const svgContent = await renderSvgEmbed(diagram, effectiveOptions);

    // Get diagram title for filenames
    const diagramTitle = diagram.title || basename(inputPath, '.json');
    const safeTitle = diagramTitle.replace(/[^a-zA-Z0-9_-]/g, '_');

    // Create markdown content with relative SVG link
    const mdContent = `# ${diagramTitle}

${diagram.subtitle ? `> ${diagram.subtitle}\n\n` : ''}![${diagramTitle}](./${safeTitle}.svg)
`;

    // Create ZIP with markdown and SVG
    const zipData = createZip([
      { name: `${safeTitle}.md`, content: mdContent },
      { name: `${safeTitle}.svg`, content: svgContent },
    ]);

    // Determine output path
    const outputPath = positionalArgs[1] || inputPath.replace('.json', '.zip');

    writeFileSync(outputPath, zipData);
    console.log(`Written: ${outputPath}`);
    console.log(`  - ${safeTitle}.md`);
    console.log(`  - ${safeTitle}.svg (Base64 embedded icons)`);
    break;
  }

  default:
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
