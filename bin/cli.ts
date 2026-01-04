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

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, basename, join } from 'path';
import { enrichDiagram, generateMeta, renderStandalone, renderSvg, renderPreviewHtml, createBuilder, IconCatalogClient, loadIconUrlMap } from '../src/index';
import type { RenderOptions } from '../src/core/types';
import type { DiagramPatch, NodeInput, NodeUpdate } from '../src/core/builder';

// CDN client for icon search
const catalogClient = new IconCatalogClient();

// Simple obfuscation using XOR (deobfuscation happens in browser via inline script)
function obfuscate(input: string): string {
  const key = 42;
  let result = '';
  for (let i = 0; i < input.length; i++) {
    result += String.fromCharCode(input.charCodeAt(i) ^ key);
  }
  return Buffer.from(result).toString('base64');
}

// Generate embed code for markdown
function generateEmbedCode(html: string, options: { obfuscate?: boolean; width?: number; height?: number }): string {
  const { width = 1200, height = 600 } = options;

  // sandbox属性: allow-scripts + allow-same-origin で外部リソース読み込みを許可
  // ただしdata URIではCORSの制限があるため、srcdocを使用
  const sandboxAttr = 'sandbox="allow-scripts allow-same-origin"';
  const iframeStyle = `style="width:100%;height:${height}px;border:1px solid #ddd;border-radius:4px;"`;

  if (options.obfuscate) {
    // Obfuscated version with deobfuscation script
    const obfuscatedHtml = obfuscate(html);
    const deobfuscateScript = `
(function(){
  var k=42,d=atob('${obfuscatedHtml}'),r='';
  for(var i=0;i<d.length;i++)r+=String.fromCharCode(d.charCodeAt(i)^k);
  var f=document.currentScript.parentElement.querySelector('iframe');
  f.srcdoc=r;
})();`;

    return `<div style="width:100%;max-width:${width}px;">
<iframe ${iframeStyle} ${sandboxAttr}></iframe>
<script>${deobfuscateScript.replace(/\n/g, '')}</script>
</div>`;
  } else {
    // srcdoc版: 外部リソース読み込みが可能
    // HTMLをエスケープしてsrcdoc属性に直接埋め込み
    const escapedHtml = html
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;');

    return `<div style="width:100%;max-width:${width}px;">
<iframe srcdoc="${escapedHtml}" ${iframeStyle} ${sandboxAttr}></iframe>
</div>`;
  }
}

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
  render <input.json> [output.html]  Render diagram to standalone HTML
  svg <input.json> [output.svg]      Render diagram to SVG only
  meta <input.json>                  Output metadata only (JSON to stdout)
  preview <input.json> [output.html] Generate HTML with Base64 embedded icons ({name}_preview.html)
  embed <input.json|html|svg> [--obfuscate]  Generate markdown embed code for diagram

Edit Commands:
  eval <input.json> '<expr>' [output.json]           Evaluate JS expression with builder 'b'
  edit <input.json> <patch.json> [output.json]       Apply patch to diagram
  add-node <input.json> <node.json> [output.json]    Add a node from JSON
  remove-node <input.json> <node-id> [output.json]   Remove a node by ID
  move-node <input.json> <node-id> <x> <y> [output]  Move node to position
  add-connection <input.json> <from> <to> [output]   Add a connection

Options:
  --width <number>   Diagram width (default: 800)
  --height <number>  Diagram height (default: 600)
  --pretty           Pretty-print JSON output
  --in-place         Modify input file in place
  --diagram <file>   Target diagram file (for flag-style commands)
  --output-dir <dir> Output directory (creates if not exists)
  --node '<json>'    Node data as JSON string
  --obfuscate        Obfuscate embedded HTML (for embed command)
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

interface Options {
  width?: number;
  height?: number;
  widthSpecified: boolean;
  heightSpecified: boolean;
  pretty: boolean;
  inPlace: boolean;
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
}

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

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
  // Priority: CLI options > diagram.render > defaults
  const width = options.widthSpecified
    ? options.width!
    : (diagramRender.width ?? DEFAULT_WIDTH);
  const height = options.heightSpecified
    ? options.height!
    : (diagramRender.height ?? DEFAULT_HEIGHT);
  return { width, height };
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

  case 'render': {
    if (positionalArgs.length < 1) {
      console.error('Error: Input file required');
      console.error('Usage: gospelo-architect render <input.json> [output.html]');
      process.exit(1);
    }

    const inputPath = positionalArgs[0];
    const outputPath = positionalArgs[1] || inputPath.replace('.json', '.html');

    const diagram = readJsonFile(inputPath) as any;
    const effectiveOptions = getEffectiveRenderOptions(diagram);

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
      console.error('Usage: gospelo-architect preview <input.json> [output.html]');
      process.exit(1);
    }

    const inputPath = positionalArgs[0];
    const outputPath = positionalArgs[1] || inputPath.replace('.json', '_preview.html');

    const diagram = readJsonFile(inputPath) as any;
    const effectiveOptions = getEffectiveRenderOptions(diagram);

    console.log('Fetching icons and generating preview HTML...');
    const html = await renderPreviewHtml(diagram, effectiveOptions);

    writeFile(outputPath, html);
    console.log('Icons are embedded as Base64 data URIs.');
    console.log('[AI] Display in Artifact, then ask user: "Would you like to edit anything?"');
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

  case 'embed': {
    if (positionalArgs.length < 1) {
      console.error('Error: Input file required');
      console.error('Usage: gospelo-architect embed <input.json|input.html|input.svg> [--obfuscate]');
      console.error('  Generates markdown embed code for the diagram');
      console.error('  --obfuscate: Obfuscate the embedded HTML to prevent easy copying');
      process.exit(1);
    }

    const inputPath = positionalArgs[0];
    let html: string;

    if (inputPath.endsWith('.html')) {
      // Read existing HTML file
      html = readFileSync(inputPath, 'utf-8');
    } else if (inputPath.endsWith('.svg')) {
      // Wrap SVG in minimal HTML for iframe embedding
      const svg = readFileSync(inputPath, 'utf-8');
      html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5}svg{max-width:100%;height:auto}</style>
</head>
<body>${svg}</body>
</html>`;
    } else if (inputPath.endsWith('.json')) {
      // Render from JSON
      const diagram = readJsonFile(inputPath) as any;
      const effectiveOptions = getEffectiveRenderOptions(diagram);
      html = renderStandalone(diagram, effectiveOptions, inputPath);
    } else {
      console.error('Error: Input must be .json, .html, or .svg file');
      process.exit(1);
    }

    // Extract dimensions from HTML or use defaults
    const widthMatch = html.match(/viewBox="0 0 (\d+)/);
    const heightMatch = html.match(/viewBox="0 0 \d+ (\d+)/);
    const embedWidth = options.width || (widthMatch ? parseInt(widthMatch[1], 10) : 1200);
    const embedHeight = options.height || (heightMatch ? parseInt(heightMatch[1], 10) : 600);

    const embedCode = generateEmbedCode(html, {
      obfuscate: options.embedObfuscate,
      width: embedWidth,
      height: embedHeight,
    });

    console.log(embedCode);
    break;
  }

  default:
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
