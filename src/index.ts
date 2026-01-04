/**
 * gospelo-diagramjs
 * HTML/SVG-based diagram renderer for system architecture diagrams
 *
 * Zero dependencies - works in Web Claude environment
 *
 * Required external domains:
 * - cdn.jsdelivr.net (AWS, Azure, Tech Stack icons)
 * - raw.githubusercontent.com (Google Cloud icons)
 */

// Core types
export type {
  DiagramDefinition,
  Node,
  Connection,
  Background,
  RenderOptions,
  NodeType,
  ConnectionType,
  ConnectionStyle,
  LabelPosition,
  LayoutDirection,
  BackgroundType,
  ComputedNode,
  DiagramMeta,
  NodeMeta,
  ConnectionMeta,
  LayoutMeta,
} from './core/types';

export { DEFAULT_COLORS, DEFAULT_RENDER_OPTIONS } from './core/types';

// Parser
import { parseDiagram as _parseDiagram, type RawDiagramInput } from './core/parser';
export { parseDiagram, validateDiagram, type RawDiagramInput } from './core/parser';

// Builder
export {
  DiagramBuilder,
  createBuilder,
  type NodeInput,
  type ConnectionInput,
  type NodeUpdate,
  type ConnectionUpdate,
  type DiagramPatch,
} from './core/builder';

// Input type for convenience functions
type DiagramInput = RawDiagramInput | string;

// Icons
export type { IconProvider } from './core/icons';
export {
  resolveIconUrl,
  resolveIconUrlAsync,
  loadIconUrlMap,
  preloadIconCatalog,
  clearIconCache,
  parseIconId,
  getProviders,
  registerProvider,
  generateFallbackSvg,
  REQUIRED_DOMAINS,
} from './core/icons';

// Configuration
export {
  DOMAINS,
  CDN_URLS,
  REQUIRED_EXTERNAL_DOMAINS,
  CDN_DEFAULTS,
} from './core/config';

// Icon Catalog CDN Client
export type {
  CdnConfig,
  CatalogIndex,
  ProviderSource,
  ProvidersResponse,
  IconEntry,
  CategoryResponse,
  CategoryIndex,
} from './core/iconCatalogClient';
export {
  IconCatalogClient,
  getIconCatalogClient,
  configureIconCatalog,
  DEFAULT_CDN_CONFIG,
} from './core/iconCatalogClient';

// Renderer
import { Renderer as _Renderer } from './renderer/Renderer';
export { Renderer } from './renderer/Renderer';

// Layout utilities
export { computeLayout, getNodeCenter, getNodeAnchors } from './layout/layout';
export { generateConnectionPath } from './layout/connections';

// Types for function signatures
import type { RenderOptions, DiagramDefinition, DiagramMeta } from './core/types';

/**
 * Quick render function for simple usage
 *
 * @param input - JSON diagram definition (object or string)
 * @param options - Render options
 * @returns Inline HTML string (for Markdown embedding)
 *
 * @example
 * ```typescript
 * import { render } from 'gospelo-diagramjs';
 *
 * const diagram = {
 *   title: "My Architecture",
 *   nodes: [
 *     { id: "lambda", icon: "aws:lambda", label: "AWS Lambda" }
 *   ]
 * };
 *
 * const html = render(diagram);
 * // Returns: <div class="gospelo-diagram">...</div>
 * ```
 */
export function render(
  input: DiagramInput,
  options?: RenderOptions
): string {
  const diagram = _parseDiagram(input);
  const renderer = new _Renderer(diagram, options);
  return renderer.renderInline();
}

/**
 * Render to standalone HTML file
 * @param input - JSON diagram definition (object or string)
 * @param options - Render options
 * @param sourceFile - Optional source file path for metadata
 */
export function renderStandalone(
  input: DiagramInput,
  options?: RenderOptions,
  sourceFile?: string
): string {
  // Keep original source before parsing for reconstruction
  const originalSource = typeof input === 'string' ? JSON.parse(input) : input;
  const diagram = _parseDiagram(input);
  const renderer = new _Renderer(diagram, options);
  // Include render options in metadata for reconstruction
  const renderOptions = options ? { width: options.width, height: options.height } : undefined;
  return renderer.renderStandalone(sourceFile, renderOptions, originalSource);
}

/**
 * Render to SVG only (no wrapper div)
 */
export function renderSvg(
  input: DiagramInput,
  options?: RenderOptions
): string {
  const diagram = _parseDiagram(input);
  const renderer = new _Renderer(diagram, options);
  return renderer.renderSvg();
}

/**
 * Enrich diagram JSON with computed metadata
 * メタデータを含むダイアグラムJSONを生成
 *
 * @param input - JSON diagram definition (object or string)
 * @param options - Render options (width, height affect metadata calculation)
 * @returns Enriched diagram with meta field
 *
 * @example
 * ```typescript
 * import { enrichDiagram } from 'gospelo-diagramjs';
 *
 * const diagram = { title: "My Diagram", nodes: [...] };
 * const enriched = enrichDiagram(diagram, { width: 900, height: 600 });
 * // enriched.meta contains computed positions, sizes, connections
 * ```
 */
export function enrichDiagram(
  input: DiagramInput,
  options?: RenderOptions
): DiagramDefinition & { meta: DiagramMeta } {
  const diagram = _parseDiagram(input);
  const renderer = new _Renderer(diagram, options);
  const meta = renderer.generateDiagramMeta();

  return { ...diagram, meta };
}

/**
 * Generate metadata only (without modifying diagram)
 * メタデータのみを生成
 */
export function generateMeta(
  input: DiagramInput,
  options?: RenderOptions
): DiagramMeta {
  const diagram = _parseDiagram(input);
  const renderer = new _Renderer(diagram, options);
  return renderer.generateDiagramMeta();
}

/**
 * Render preview HTML with Base64 embedded icons
 * アイコンをBase64 Data URIとして埋め込んだプレビューHTMLを生成
 *
 * @param input - JSON diagram definition (object or string)
 * @param options - Render options
 * @returns Promise<string> - HTML string with embedded icons
 *
 * @example
 * ```typescript
 * import { renderPreviewHtml } from 'gospelo-diagramjs';
 *
 * const html = await renderPreviewHtml(diagram);
 * // Returns standalone HTML with all icons embedded as Base64
 * ```
 */
export async function renderPreviewHtml(
  input: DiagramInput,
  options?: RenderOptions
): Promise<string> {
  const diagram = _parseDiagram(input);
  const renderer = new _Renderer(diagram, options);
  return renderer.renderPreviewHtml();
}
