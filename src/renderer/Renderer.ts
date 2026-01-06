/**
 * SVG Diagram Renderer
 * Generates HTML/SVG output from diagram definitions
 *
 * Uses external URL references for icons (no embedding)
 * - AWS, Azure, GCP icons: external <image href="...">
 * - Compliant with vendor trademark guidelines
 */

import {
  DiagramDefinition,
  Connection,
  ComputedNode,
  BoundingBox,
  RenderOptions,
  DEFAULT_RENDER_OPTIONS,
  DEFAULT_COLORS,
  DiagramMeta,
  NodeMeta,
  ConnectionMeta,
  LayoutMeta,
  ConnectionSortStrategy,
} from '../core/types';
import { resolveIconUrl, generateFallbackSvg, loadIconUrlMap } from '../core/icons';
import { computeLayout, getNodeCenter } from '../layout/layout';
import {
  generateConnectionPath,
  generateArrowMarker,
  generateBidirectionalMarkers,
  determineAnchorSide,
  ConnectionAnchorInfo,
  ReservedVerticalLines,
  ReservedHorizontalLines,
  calculatePathLength,
} from '../layout/connections';
import {
  detectBidirectionalConnections,
  sortConnectionsByStrategy,
  registerIconAreaReservations,
  calculateAnchorDistribution,
  getSiblingNodesAndParentBounds,
} from '../utils/connection-utils';
import {
  getBaseCss,
  getShareableCss,
  getPreviewCss,
  getViewerScript,
  getInteractiveScript,
} from './templates';

/**
 * Main diagram renderer class
 */
export class Renderer {
  protected diagram: DiagramDefinition;
  protected options: Required<RenderOptions>;
  protected computedNodes: ComputedNode[];
  protected nodeMap: Map<string, ComputedNode>;

  constructor(diagram: DiagramDefinition, options: RenderOptions = {}) {
    this.diagram = diagram;
    this.options = { ...DEFAULT_RENDER_OPTIONS, ...options };
    this.computedNodes = computeLayout(diagram);
    this.nodeMap = this.buildNodeMap(this.computedNodes);
  }

  /**
   * Build node lookup map (recursive)
   * Child nodes have their coordinates converted to absolute positions
   * Also calculates bounding boxes for connection anchors
   */
  private buildNodeMap(nodes: ComputedNode[]): Map<string, ComputedNode> {
    const map = new Map<string, ComputedNode>();
    const iconSize = this.options.iconSize;

    const addNodes = (nodeList: ComputedNode[], parentOffsetX: number = 0, parentOffsetY: number = 0) => {
      for (const node of nodeList) {
        // Calculate absolute coordinates
        const absX = node.computedX + parentOffsetX;
        const absY = node.computedY + parentOffsetY;

        // Calculate bounding box based on node type
        const bounds = this.calculateBounds(node, absX, absY, iconSize);

        // Create a copy with absolute coordinates and bounds
        const absoluteNode: ComputedNode = {
          ...node,
          computedX: absX,
          computedY: absY,
          bounds,
        };
        map.set(node.id, absoluteNode);

        if (node.children) {
          // Pass the absolute position of this node as offset for children
          addNodes(
            node.children as ComputedNode[],
            absX,
            absY
          );
        }
      }
    };
    addNodes(nodes);
    return map;
  }

  /**
   * Calculate bounding box for a node
   * アイコンノード: アイコン部分のみ（ラベル除外）
   * グループ/コンポジット: 枠全体
   * テキストボックス: ボックス全体
   */
  private calculateBounds(
    node: ComputedNode,
    absX: number,
    absY: number,
    iconSize: number
  ): BoundingBox {
    let width: number;
    let height: number;

    switch (node.type) {
      case 'group':
      case 'composite':
      case 'text_box':
        // グループ、コンポジット、テキストボックスは全体サイズを使用
        width = node.computedWidth;
        height = node.computedHeight;
        break;
      default:
        // アイコンノード: アイコン部分のみ（ラベルを除く）
        width = iconSize;
        height = iconSize;
        break;
    }

    return {
      left: absX,
      top: absY,
      right: absX + width,
      bottom: absY + height,
      centerX: absX + width / 2,
      centerY: absY + height / 2,
      width,
      height,
    };
  }

  /**
   * Get license text for an icon based on its provider
   */
  private getIconLicense(iconId: string | undefined): string {
    if (!iconId) return '';
    const provider = iconId.split(':')[0];
    switch (provider) {
      case 'aws':
        return 'AWS Architecture Icons (Apache 2.0)';
      case 'azure':
        return 'Azure Icons (MIT)';
      case 'google-cloud':
        return 'Google Cloud Icons (Apache 2.0)';
      case 'tech-stack':
        return 'Simple Icons (CC0 1.0)';
      default:
        return '';
    }
  }

  /**
   * Build rich title content for icon tooltip
   * Includes: Resource ID, Description, Icon name, License
   */
  private buildIconTitle(nodeId: string, iconId: string | undefined): string {
    const resources = this.diagram.resources || {};
    const resource = resources[nodeId];
    const parts: string[] = [];

    // 1. Resource ID
    parts.push(`ID: ${nodeId}`);

    // 2. Icon identifier
    if (iconId) {
      parts.push(`Icon: ${iconId}`);
    }

    // 3. License
    const license = this.getIconLicense(iconId);
    if (license) {
      parts.push(`License: ${license}`);
    }

    // 4. Description from resource
    if (resource?.desc) {
      parts.push(`Desc: ${resource.desc}`);
    }

    return this.escapeHtml(parts.join('\n'));
  }

  /**
   * Calculate content bounding box from all nodes
   */
  private calculateContentBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const iconSize = this.options.iconSize;
    const labelPadding = 20; // Extra padding for labels below icons

    for (const node of this.nodeMap.values()) {
      const bounds = node.bounds;
      if (bounds && bounds.right > 0) {
        // BoundingBox uses left/right/top/bottom
        minX = Math.min(minX, bounds.left);
        minY = Math.min(minY, bounds.top);
        maxX = Math.max(maxX, bounds.right);
        maxY = Math.max(maxY, bounds.bottom + labelPadding);
      } else {
        // Fallback for nodes without bounds
        minX = Math.min(minX, node.computedX - iconSize / 2);
        minY = Math.min(minY, node.computedY - iconSize / 2);
        maxX = Math.max(maxX, node.computedX + iconSize / 2);
        maxY = Math.max(maxY, node.computedY + iconSize / 2 + labelPadding);
      }
    }

    // If no nodes found, return default bounds
    if (minX === Infinity) {
      return { minX: 0, minY: 0, maxX: this.options.width, maxY: this.options.height };
    }

    // Add some padding
    const padding = 20;
    return {
      minX: Math.max(0, minX - padding),
      minY: Math.max(0, minY - padding),
      maxX: maxX + padding,
      maxY: maxY + padding,
    };
  }

  /**
   * Render complete SVG diagram
   * Z-order: コネクター → ノード（アイコン） → ラベル
   * Fullscreen display with preserved aspect ratio
   */
  renderSvg(): string {
    const { width, height } = this.options;

    // Calculate content bounds and scaling if needed
    const contentBounds = this.calculateContentBounds();
    const contentWidth = contentBounds.maxX;
    const contentHeight = contentBounds.maxY;

    // Calculate scale to fit content within target dimensions
    // Leave room for title (80px top margin)
    const titleMargin = this.diagram.title ? 80 : 20;
    const availableWidth = width - 20; // 10px padding on each side
    const availableHeight = height - titleMargin - 20;

    // Larger paper = larger drawing area (no scale up)
    // Only scale down if content doesn't fit
    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down

    // Calculate translation (horizontally centered, vertically top-aligned)
    // Account for content minX/minY offset
    const translateX = -contentBounds.minX * scale + (width - (contentWidth - contentBounds.minX) * scale) / 2;
    const translateY = titleMargin - contentBounds.minY * scale; // Top-aligned after title

    // Apply transform when paper size is specified and (scale down needed OR content has offset)
    const hasPaperSize = this.options.paperOrientation !== undefined;
    const needsTransform = hasPaperSize && (scale < 1 || contentBounds.minX > 0 || contentBounds.minY > 0);
    const transform = needsTransform
      ? `transform="translate(${translateX.toFixed(2)}, ${translateY.toFixed(2)}) scale(${scale.toFixed(4)})"`
      : '';

    const parts: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" class="gospelo-svg">`,
      this.renderDefs(),
      this.renderBackground(),
      this.renderBoundaryBox(width, height),
      this.renderTitle(),
      needsTransform ? `<g ${transform}>` : '',
      this.renderGroupBackgrounds(this.computedNodes),  // 1. グループ背景（一番下）
      this.renderNodes(this.computedNodes),  // 2. ノード（アイコン部分）
      this.renderNodeLabels(this.computedNodes),  // 3. ラベル
      this.renderConnections(),        // 4. コネクター（一番上・ルーティング確認用）
      needsTransform ? '</g>' : '',
      '</svg>',
    ];

    return parts.join('\n');
  }

  /**
   * Render boundary box (frame only, no interactive elements for pure SVG output)
   */
  private renderBoundaryBox(width: number, height: number): string {
    const padding = 10;

    return `<g class="boundary-box">
  <rect class="boundary-frame" x="${padding}" y="${padding}" width="${width - padding * 2}" height="${height - padding * 2}"
    fill="none" stroke="#D0D0D0" stroke-width="1" rx="4"/>
</g><!-- /boundary-box -->`;
  }

  /**
   * Render title and subtitle
   */
  private renderTitle(): string {
    const { width } = this.options;
    const parts: string[] = [];

    if (this.diagram.title) {
      parts.push(`<text x="${width / 2}" y="40" text-anchor="middle" font-size="28" font-weight="bold" fill="#0073BB">${this.escapeHtml(this.diagram.title)}</text>`);
    }
    if (this.diagram.subtitle) {
      parts.push(`<text x="${width / 2}" y="70" text-anchor="middle" font-size="16" fill="#666666">${this.escapeHtml(this.diagram.subtitle)}</text>`);
    }

    return parts.join('\n');
  }

  /**
   * Render inline HTML (for Markdown embedding)
   */
  renderInline(): string {
    const css = this.options.embedCss ? `<style>${this.getCss()}</style>` : '';
    return `<div class="gospelo-diagram">${css}${this.renderSvg()}</div>`;
  }

  /**
   * Render standalone HTML page (viewer only, no editor)
   * @param sourceFile - optional source JSON file path for metadata
   * @param renderOptions - optional render options to include in metadata
   * @param originalSource - optional original JSON source (before parsing) for reconstruction
   */
  renderStandalone(sourceFile?: string, renderOptions?: { width?: number; height?: number }, originalSource?: unknown): string {
    const meta = this.generateDiagramMeta(sourceFile, renderOptions, originalSource);
    const metaJson = JSON.stringify(meta, null, 2);

    // Get SVG and add selection UI elements
    let svg = this.renderSvg();
    // Remove SVG <title> elements (we use JavaScript tooltip instead)
    svg = svg.replace(/<title>[^<]*<\/title>/g, '');
    // Add selection UI elements before closing </svg> tag
    const selectionUi = `
  <rect id="selection-rect" x="0" y="0" width="0" height="0" fill="rgba(0, 120, 215, 0.1)" stroke="#0078D7" stroke-width="1" stroke-dasharray="4 2" style="display:none; pointer-events:none;"/>
  <g id="copy-btn" style="display:none; cursor:pointer; pointer-events:all;">
    <rect x="0" y="0" width="32" height="32" rx="6" fill="#E3F2FD" stroke="#0078D7" stroke-width="1.5" style="pointer-events:all;"/>
    <g transform="translate(4, 4)" style="pointer-events:none;">
      <rect width="8" height="4" x="8" y="2" rx="1" fill="none" stroke="#0078D7" stroke-width="2"/>
      <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" fill="none" stroke="#0078D7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 4h2a2 2 0 0 1 2 2v4" fill="none" stroke="#0078D7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M21 14H11" fill="none" stroke="#0078D7" stroke-width="2" stroke-linecap="round"/>
      <path d="M15 10l-4 4 4 4" fill="none" stroke="#0078D7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </g>`;
    svg = svg.replace('</svg>', `${selectionUi}\n</svg>`);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${this.escapeHtml(this.diagram.title)}</title>
  <style>${this.getShareableCss()}</style>
</head>
<body>
  <div class="gospelo-diagram">
    ${svg}
  </div>
  <div id="copy-toast" class="copy-toast"></div>
  <div id="hover-tooltip" class="hover-tooltip"></div>
  <!-- AI調整用メタデータ: ノード位置・サイズ・接続情報 -->
  <script type="application/json" id="gospelo-diagram-meta">
${metaJson}
  </script>
  <script>${this.getShareableScript()}</script>
</body>
</html>`;
  }

  /**
   * Render defs section (markers, gradients)
   */
  private renderDefs(): string {
    const markers: string[] = [];
    const gradients: string[] = [];

    // Collect unique colors for arrow markers
    const colors = new Set<string>();
    colors.add(DEFAULT_COLORS.blue);

    for (const conn of this.diagram.connections || []) {
      const color = this.resolveColor(conn.color) ||
        (conn.type === 'auth' ? DEFAULT_COLORS.orange : DEFAULT_COLORS.blue);
      colors.add(color);
    }

    // Generate markers for each color
    for (const color of colors) {
      const id = `arrow-${color.replace('#', '')}`;
      markers.push(generateArrowMarker(id, color));
      markers.push(generateBidirectionalMarkers(id, color));
    }

    // Background gradient if needed
    if (this.diagram.background?.type === 'gradient') {
      const bg = this.diagram.background;
      gradients.push(this.renderGradient(
        'bg-gradient',
        bg.startColor || '#FFFFFF',
        bg.endColor || '#E8E8E8',
        bg.direction || 'south'
      ));
    }

    return `<defs>
${markers.join('\n')}
${gradients.join('\n')}
</defs>`;
  }

  /**
   * Render gradient definition
   */
  private renderGradient(
    id: string,
    startColor: string,
    endColor: string,
    direction: string
  ): string {
    const coords: Record<string, string> = {
      south: 'x1="0%" y1="0%" x2="0%" y2="100%"',
      north: 'x1="0%" y1="100%" x2="0%" y2="0%"',
      east: 'x1="0%" y1="0%" x2="100%" y2="0%"',
      west: 'x1="100%" y1="0%" x2="0%" y2="0%"',
    };

    return `<linearGradient id="${id}" ${coords[direction] || coords.south}>
  <stop offset="0%" stop-color="${startColor}"/>
  <stop offset="100%" stop-color="${endColor}"/>
</linearGradient>`;
  }

  /**
   * Render background
   */
  private renderBackground(): string {
    const { width, height } = this.options;
    const bg = this.diagram.background;

    if (!bg || bg.type === 'white') {
      return `<rect width="${width}" height="${height}" fill="white"/>`;
    }

    if (bg.type === 'solid') {
      return `<rect width="${width}" height="${height}" fill="${bg.color || '#F5F5F5'}"/>`;
    }

    if (bg.type === 'gradient') {
      return `<rect width="${width}" height="${height}" fill="url(#bg-gradient)"/>`;
    }

    return '';
  }

  /**
   * Render group backgrounds only (for z-order: below connections)
   */
  private renderGroupBackgrounds(nodes: ComputedNode[]): string {
    const backgrounds: string[] = [];
    this.collectGroupBackgrounds(nodes, backgrounds, 0, 0);
    return backgrounds.join('\n');
  }

  /**
   * Recursively collect group backgrounds
   */
  private collectGroupBackgrounds(nodes: ComputedNode[], backgrounds: string[], parentX: number, parentY: number): void {
    for (const node of nodes) {
      if (node.type === 'group') {
        const absX = parentX + node.computedX;
        const absY = parentY + node.computedY;
        backgrounds.push(this.renderGroupBackground(node, absX, absY));
        // Recursively collect nested group backgrounds
        if (node.children) {
          this.collectGroupBackgrounds(node.children as ComputedNode[], backgrounds, absX, absY);
        }
      }
    }
  }

  /**
   * Render group background (box and label only)
   */
  private renderGroupBackground(node: ComputedNode, absX: number, absY: number): string {
    const { computedWidth: w, computedHeight: h } = node;
    const borderColor = this.resolveColor(node.borderColor) || DEFAULT_COLORS.orange;
    const resources = this.diagram.resources || {};

    // Group icon in top-left corner
    const groupIconId = node.icon || resources[node.id]?.icon;
    const groupIconUrl = groupIconId ? resolveIconUrl(groupIconId) : null;
    const groupIconSize = 24;
    const groupIconPadding = 8;
    let groupIconSvg = '';
    if (groupIconUrl) {
      const onerrorHandler = `onerror="console.error('[gospelo-architect] Icon load failed:', {id:'${node.id}',icon:'${groupIconId}',url:'${groupIconUrl}'}); this.style.display='none'"`;
      const iconTitle = `<title>${this.buildIconTitle(node.id, groupIconId)}</title>`;
      groupIconSvg = `<g class="group-icon">${iconTitle}<image href="${groupIconUrl}" x="${groupIconPadding}" y="${groupIconPadding}" width="${groupIconSize}" height="${groupIconSize}" ${onerrorHandler}/></g>`;
    }

    const copyHandler = `onclick="event.stopPropagation();navigator.clipboard.writeText('${node.id}').then(()=>{const t=document.getElementById('copy-toast');t.textContent='Copied: ${node.id}';t.style.opacity='1';setTimeout(()=>t.style.opacity='0',1500)})"`;
    const tooltip = `<title>${this.buildIconTitle(node.id, groupIconId)}</title>`;

    // Create transparent fill with same color as border (10% opacity)
    const fillColor = `${borderColor}1A`; // 1A = 10% opacity in hex

    return `<g id="${node.id}-bg" class="group-background" transform="translate(${absX}, ${absY})">
  <rect class="group-box" width="${w}" height="${h}" rx="8" stroke="${borderColor}" stroke-width="2" fill="${fillColor}" style="cursor:pointer" ${copyHandler}>${tooltip}</rect>
  ${groupIconSvg}
  <text class="group-label" data-node-id="${node.id}" data-field="label" x="${w / 2}" y="-8" text-anchor="middle" fill="${borderColor}" font-size="14" font-weight="bold" style="cursor:pointer" ${copyHandler}>${this.escapeHtml(node.label || '')}</text>
</g>`;
  }

  /**
   * Render all nodes (icons only, no labels)
   */
  private renderNodes(nodes: ComputedNode[]): string {
    return nodes.map(node => this.renderNode(node)).join('\n');
  }

  /**
   * Render all node labels (separate layer for z-order)
   */
  private renderNodeLabels(nodes: ComputedNode[]): string {
    const labels: string[] = [];
    this.collectNodeLabels(nodes, labels);
    return labels.join('\n');
  }

  /**
   * Recursively collect labels from all nodes
   */
  private collectNodeLabels(nodes: ComputedNode[], labels: string[]): void {
    for (const node of nodes) {
      // アイコンノードのラベルのみ（グループ等は除外）
      if (!node.type || node.type === 'icon') {
        const label = this.renderNodeLabelOnly(node);
        if (label) labels.push(label);
      }
      // 子ノードのラベルも収集
      if (node.children) {
        this.collectNodeLabels(node.children as ComputedNode[], labels);
      }
    }
  }

  /**
   * Render label for a single node (absolute position)
   */
  private renderNodeLabelOnly(node: ComputedNode): string {
    const absNode = this.nodeMap.get(node.id);
    if (!absNode) return '';

    const { computedX: x, computedY: y } = absNode;
    const size = this.options.iconSize;
    const labelY = y + size + 12;
    const parts: string[] = [];

    if (node.label) {
      const lines = this.splitLabel(node.label, 12);
      lines.forEach((line, i) => {
        parts.push(`<text class="node-label" data-node-id="${node.id}" data-field="label" x="${x + size / 2}" y="${labelY + i * 13}" text-anchor="middle" font-size="11" fill="#232F3E">${this.escapeHtml(line)}</text>`);
      });
    }
    if (node.sublabel) {
      const labelLines = node.label ? this.splitLabel(node.label, 12).length : 0;
      parts.push(`<text class="node-sublabel" data-node-id="${node.id}" data-field="sublabel" x="${x + size / 2}" y="${labelY + labelLines * 13}" text-anchor="middle" font-size="10" fill="#666666">${this.escapeHtml(node.sublabel)}</text>`);
    }

    return parts.length > 0 ? `<g class="node-label-group" data-node="${node.id}">${parts.join('\n')}</g>` : '';
  }

  /**
   * Render single node
   */
  private renderNode(node: ComputedNode): string {
    switch (node.type) {
      case 'group':
        return this.renderGroupNode(node);
      case 'composite':
        return this.renderCompositeNode(node);
      case 'text_box':
        return this.renderTextBoxNode(node);
      case 'label':
        return this.renderLabelNode(node);
      case 'pc':
      case 'pc_mobile':
      case 'person':
      case 'person_pc_mobile':
        return this.renderDeviceNode(node);
      default:
        return this.renderIconNode(node);
    }
  }

  /**
   * Render icon node with external URL reference (icon only, no label)
   */
  private renderIconNode(node: ComputedNode): string {
    const { computedX: x, computedY: y } = node;
    const size = this.options.iconSize;
    const iconUrl = node.icon ? resolveIconUrl(node.icon) : null;

    // onerror handler with detailed error logging
    const onerrorHandler = iconUrl
      ? `onerror="console.error('[gospelo-architect] Icon load failed:', {id:'${node.id}',icon:'${node.icon}',x:${x},y:${y},url:'${iconUrl}'}); this.style.display='none'"`
      : '';

    // Rich tooltip with resource info and click-to-copy for node ID
    const tooltip = `<title>${this.buildIconTitle(node.id, node.icon)}</title>`;
    const copyHandler = `onclick="navigator.clipboard.writeText('${node.id}').then(()=>{const t=document.getElementById('copy-toast');t.textContent='Copied: ${node.id}';t.style.opacity='1';setTimeout(()=>t.style.opacity='0',1500)})"`;


    return `<g id="${node.id}" class="node icon-node" transform="translate(${x}, ${y})" style="cursor:pointer" ${copyHandler}>
  ${tooltip}
  <rect class="node-bg" width="${size}" height="${size}" fill="transparent"/>
  ${iconUrl
    ? `<image href="${iconUrl}" width="${size}" height="${size}" ${onerrorHandler}/>`
    : ''}
</g>`;
  }

  /**
   * Render group node (children only - background is rendered separately for z-order)
   */
  private renderGroupNode(node: ComputedNode): string {
    const { computedX: x, computedY: y } = node;

    // Render children only (background already rendered in renderGroupBackgrounds)
    const children = node.children
      ? (node.children as ComputedNode[]).map(child => this.renderNode(child)).join('\n')
      : '';

    return `<g id="${node.id}" class="node group-node" transform="translate(${x}, ${y})">
  <g class="children" transform="translate(0, 0)">
    ${children}
  </g>
</g>`;
  }

  /**
   * Render composite node
   */
  private renderCompositeNode(node: ComputedNode): string {
    const { computedX: x, computedY: y, computedWidth: w, computedHeight: h } = node;
    const borderColor = this.resolveColor(node.borderColor) || DEFAULT_COLORS.blue;

    const iconSize = 36;
    const labelHeight = 14;
    const iconGap = 12;
    const resources = this.diagram.resources || {};

    // Render composite node's own icon in top-left corner (from resource or explicit icon property)
    const compositeIconId = node.icon || resources[node.id]?.icon;
    const compositeIconUrl = compositeIconId ? resolveIconUrl(compositeIconId) : null;
    const compositeIconSize = 24;
    const compositeIconPadding = 6;
    let compositeIconSvg = '';
    if (compositeIconUrl) {
      const onerrorHandler = `onerror="console.error('[gospelo-architect] Icon load failed:', {id:'${node.id}',icon:'${compositeIconId}',url:'${compositeIconUrl}'}); this.style.display='none'"`;
      const iconTitle = `<title>${this.buildIconTitle(node.id, compositeIconId)}</title>`;
      compositeIconSvg = `<g class="composite-main-icon">${iconTitle}<image href="${compositeIconUrl}" x="${compositeIconPadding}" y="${compositeIconPadding}" width="${compositeIconSize}" height="${compositeIconSize}" ${onerrorHandler}/></g>`;
    }

    const icons = (node.icons || []).map((iconRef, i) => {
      // Resolve icon from resources if iconRef.icon is not set
      const iconId = iconRef.icon || resources[iconRef.id]?.icon;
      const iconUrl = iconId ? resolveIconUrl(iconId) : null;
      const iconY = 20 + i * (iconSize + labelHeight + iconGap);
      const iconX = (w - iconSize) / 2;
      const labelY = iconY + iconSize + 12;

      // Rich tooltip and click-to-copy for icon ID
      const iconTooltip = `<title>${this.buildIconTitle(iconRef.id, iconId)}</title>`;
      const iconCopyHandler = `onclick="event.stopPropagation();navigator.clipboard.writeText('${iconRef.id}').then(()=>{const t=document.getElementById('copy-toast');t.textContent='Copied: ${iconRef.id}';t.style.opacity='1';setTimeout(()=>t.style.opacity='0',1500)})"`;

      const parts: string[] = [];
      parts.push(`<g id="${iconRef.id}" class="composite-icon" style="cursor:pointer" ${iconCopyHandler}>`);
      parts.push(iconTooltip);
      if (iconUrl) {
        const onerrorHandler = `onerror="console.error('[gospelo-architect] Icon load failed:', {id:'${node.id}',icon:'${iconId}',x:${x + iconX},y:${y + iconY},url:'${iconUrl}'}); this.style.display='none'"`;
        parts.push(`<image href="${iconUrl}" x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" ${onerrorHandler}/>`);
      }
      if (iconRef.label) {
        parts.push(`<text x="${w / 2}" y="${labelY}" text-anchor="middle" font-size="10" fill="#232F3E">${this.escapeHtml(iconRef.label)}</text>`);
      }
      parts.push(`</g>`);
      return parts.join('\n');
    }).join('\n');

    // Render label above the box
    const labelParts: string[] = [];
    if (node.label) {
      labelParts.push(`<text class="composite-label" data-node-id="${node.id}" data-field="label" x="${w / 2}" y="-20" text-anchor="middle" font-size="11" fill="#232F3E">${this.escapeHtml(node.label)}</text>`);
    }
    if (node.sublabel) {
      labelParts.push(`<text class="composite-sublabel" data-node-id="${node.id}" data-field="sublabel" x="${w / 2}" y="-6" text-anchor="middle" font-size="10" fill="#666666">${this.escapeHtml(node.sublabel)}</text>`);
    }

    // Click-to-copy for composite node ID
    const copyHandler = `onclick="event.stopPropagation();navigator.clipboard.writeText('${node.id}').then(()=>{const t=document.getElementById('copy-toast');t.textContent='Copied: ${node.id}';t.style.opacity='1';setTimeout(()=>t.style.opacity='0',1500)})"`;
    const tooltip = `<title>${this.buildIconTitle(node.id, compositeIconId)}</title>`;

    return `<g id="${node.id}" class="node composite-node" transform="translate(${x}, ${y})">
  ${labelParts.join('\n')}
  <rect class="composite-box" width="${w}" height="${h}" rx="4" stroke="${borderColor}" stroke-width="1" fill="white" style="cursor:pointer" ${copyHandler}>${tooltip}</rect>
  ${compositeIconSvg}
  ${icons}
</g>`;
  }

  /**
   * Render text box node
   */
  private renderTextBoxNode(node: ComputedNode): string {
    const { computedX: x, computedY: y, computedWidth: w, computedHeight: h } = node;
    const borderColor = this.resolveColor(node.borderColor) || DEFAULT_COLORS.blue;

    // Rich tooltip and click-to-copy for text box node ID
    const tooltip = `<title>${this.buildIconTitle(node.id, undefined)}</title>`;
    const copyHandler = `onclick="navigator.clipboard.writeText('${node.id}').then(()=>{const t=document.getElementById('copy-toast');t.textContent='Copied: ${node.id}';t.style.opacity='1';setTimeout(()=>t.style.opacity='0',1500)})"`;

    return `<g id="${node.id}" class="node text-box-node" transform="translate(${x}, ${y})" style="cursor:pointer" ${copyHandler}>
  ${tooltip}
  <rect class="text-box" width="${w}" height="${h}" rx="4" stroke="${borderColor}" stroke-width="1" fill="white"/>
  <text class="text-box-label" data-node-id="${node.id}" data-field="label" x="${w / 2}" y="${h / 2 - 5}" text-anchor="middle" font-size="11" fill="#232F3E">${this.escapeHtml(node.label || '')}</text>
  ${node.sublabel ? `<text class="text-box-sublabel" data-node-id="${node.id}" data-field="sublabel" x="${w / 2}" y="${h / 2 + 10}" text-anchor="middle" font-size="10" fill="#666666">${this.escapeHtml(node.sublabel)}</text>` : ''}
</g>`;
  }

  /**
   * Render label node (simple text without border)
   */
  private renderLabelNode(node: ComputedNode): string {
    const { computedX: x, computedY: y } = node;
    const color = this.resolveColor(node.borderColor) || '#232F3E';
    const fontSize = 14;

    return `<g id="${node.id}" class="node label-node" transform="translate(${x}, ${y})">
  <text x="0" y="${fontSize}" font-size="${fontSize}" font-weight="bold" fill="${color}">${this.escapeHtml(node.label || '')}</text>
</g>`;
  }

  /**
   * Render device node (PC, mobile, person icons)
   */
  private renderDeviceNode(node: ComputedNode): string {
    const { computedX: x, computedY: y } = node;
    const size = this.options.iconSize;

    // Simple placeholder for device icons
    const deviceSvg = this.getDeviceSvg(node.type || 'pc', size);

    // Rich tooltip and click-to-copy for device node ID
    const tooltip = `<title>${this.buildIconTitle(node.id, undefined)}</title>`;
    const copyHandler = `onclick="navigator.clipboard.writeText('${node.id}').then(()=>{const t=document.getElementById('copy-toast');t.textContent='Copied: ${node.id}';t.style.opacity='1';setTimeout(()=>t.style.opacity='0',1500)})"`;

    return `<g id="${node.id}" class="node device-node" transform="translate(${x}, ${y})" style="cursor:pointer" ${copyHandler}>
  ${tooltip}
  ${deviceSvg}
  ${this.renderLabel(node, size)}
</g>`;
  }

  /**
   * Get device SVG (built-in, no external dependency)
   */
  private getDeviceSvg(type: string, size: number): string {
    // Simple built-in device icons
    const icons: Record<string, string> = {
      pc: `<rect x="4" y="4" width="${size - 8}" height="${size - 16}" rx="2" fill="#E0E0E0" stroke="#666"/>
           <rect x="${size / 2 - 8}" y="${size - 12}" width="16" height="4" fill="#666"/>`,
      pc_mobile: `<rect x="2" y="4" width="${size / 2 - 4}" height="${size - 16}" rx="2" fill="#E0E0E0" stroke="#666"/>
                  <rect x="${size / 2 + 2}" y="8" width="${size / 2 - 8}" height="${size - 20}" rx="2" fill="#E0E0E0" stroke="#666"/>`,
      person: `<circle cx="${size / 2}" cy="14" r="10" fill="#E0E0E0" stroke="#666"/>
               <path d="M ${size / 2 - 15} ${size - 8} Q ${size / 2} 28 ${size / 2 + 15} ${size - 8}" fill="#E0E0E0" stroke="#666"/>`,
      person_pc_mobile: `<circle cx="12" cy="12" r="8" fill="#E0E0E0" stroke="#666"/>
                         <rect x="24" y="8" width="12" height="20" rx="1" fill="#E0E0E0" stroke="#666"/>
                         <rect x="38" y="12" width="8" height="14" rx="1" fill="#E0E0E0" stroke="#666"/>`,
    };

    return `<g class="device-icon">${icons[type] || icons.pc}</g>`;
  }

  /**
   * Render node label with multiline support
   */
  private renderLabel(node: ComputedNode, width: number, yOffset: number = 0): string {
    const y = yOffset || this.options.iconSize + 12;
    const parts: string[] = [];

    if (node.label) {
      // Support multiline labels (split by \n or automatic word wrap)
      const lines = this.splitLabel(node.label, 12); // ~12 chars per line
      lines.forEach((line, i) => {
        parts.push(`<text class="node-label" data-node-id="${node.id}" data-field="label" x="${width / 2}" y="${y + i * 13}" text-anchor="middle" font-size="11" fill="#232F3E">${this.escapeHtml(line)}</text>`);
      });
    }
    if (node.sublabel) {
      const labelLines = node.label ? this.splitLabel(node.label, 12).length : 0;
      parts.push(`<text class="node-sublabel" data-node-id="${node.id}" data-field="sublabel" x="${width / 2}" y="${y + labelLines * 13}" text-anchor="middle" font-size="10" fill="#666666">${this.escapeHtml(node.sublabel)}</text>`);
    }

    return parts.join('\n');
  }

  /**
   * Split label into multiple lines
   */
  private splitLabel(label: string, maxCharsPerLine: number): string[] {
    // If label contains explicit newlines, use those
    if (label.includes('\n')) {
      return label.split('\n');
    }

    // Otherwise, wrap at spaces if too long
    if (label.length <= maxCharsPerLine) {
      return [label];
    }

    const words = label.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines;
  }

  /**
   * Calculate minimum Y coordinate for connection paths
   * to avoid overlapping with title and subtitle
   */
  private calculateMinYForConnections(): number {
    // Title is rendered at Y=40, subtitle at Y=70
    // Add margin to ensure connection paths don't overlap
    if (this.diagram.subtitle) {
      return 90; // Below subtitle with margin
    } else if (this.diagram.title) {
      return 60; // Below title with margin
    }
    return 0; // No constraint
  }

  /**
   * Render all connections with distributed anchor points
   * If connectionSortStrategy is not specified, tries all strategies and selects the optimal one
   */
  private renderConnections(): string {
    if (!this.diagram.connections) return '';

    // Get all computed nodes for obstacle avoidance
    const allNodes = Array.from(this.nodeMap.values());

    // Calculate minY to avoid title/subtitle overlap
    const minY = this.calculateMinYForConnections();

    // If strategy is specified, use it directly
    if (this.diagram.connectionSortStrategy) {
      return this.renderConnectionsWithStrategy(
        this.diagram.connectionSortStrategy,
        allNodes,
        minY
      );
    }

    // Auto-select: try all strategies and pick the shortest total path length
    const strategies: ConnectionSortStrategy[] = [
      'original',
      'vertical_length_desc',
      'vertical_length_asc',
      'target_y_asc',
      'target_y_desc',
      'source_x_asc',
      'source_x_desc',
      'bounding_box_aware',
    ];

    let bestStrategy: ConnectionSortStrategy = 'original';
    let bestLength = Infinity;
    let bestResult = '';

    for (const strategy of strategies) {
      const result = this.renderConnectionsWithStrategy(strategy, allNodes, minY);
      const totalLength = this.calculateTotalPathLength(result);

      if (totalLength < bestLength) {
        bestLength = totalLength;
        bestStrategy = strategy;
        bestResult = result;
      }
    }

    // Store the selected strategy in the diagram for reference
    this.diagram.connectionSortStrategy = bestStrategy;

    return bestResult;
  }

  /**
   * Calculate total path length from SVG content (connection paths only)
   */
  private calculateTotalPathLength(svgContent: string): number {
    // Extract path d attributes from connection elements only
    // Format: <path class="connection" ... d="M x y L x y ..." .../>
    // Use non-greedy [^>]*? and word boundary \b to match the first d= attribute
    const pathMatches = svgContent.matchAll(/<path class="connection"[^>]*?\bd="([^"]+)"/g);
    let totalLength = 0;

    for (const match of pathMatches) {
      totalLength += calculatePathLength(match[1]);
    }

    return totalLength;
  }

  /**
   * Render connections with a specific sort strategy
   */
  private renderConnectionsWithStrategy(
    strategy: ConnectionSortStrategy,
    allNodes: ComputedNode[],
    minY: number
  ): string {
    if (!this.diagram.connections) return '';

    // Sort connections based on strategy
    const sortedConnections = sortConnectionsByStrategy(
      this.diagram.connections,
      strategy,
      this.nodeMap
    );

    // First pass: calculate anchor info for all connections
    const anchorInfoMap = calculateAnchorDistribution(this.diagram.connections, this.nodeMap);

    // 双方向接続の検出: A→B と B→A が両方存在する場合、1つの双方向接続として扱う
    const bidirectionalPairs = detectBidirectionalConnections(sortedConnections);
    // スキップすべき逆方向接続のセット (例: B→A をスキップして A→B を双方向として描画)
    const skipConnections = new Set<Connection>();
    for (const [, reverseConn] of bidirectionalPairs) {
      skipConnections.add(reverseConn);
    }

    // 縦線予約リスト: X座標とY区間のペアで管理（Y区間が重ならなければ同じX座標を使用可能）
    const reservedVerticalLines: ReservedVerticalLines = [];
    // 水平線予約リスト: Y座標とX区間のペアで管理（X区間が重ならなければ同じY座標を使用可能）
    const reservedHorizontalLines: ReservedHorizontalLines = [];

    // アイコン面予約（最優先）: 全ノードのアイコン領域を予約として登録
    registerIconAreaReservations(allNodes, reservedVerticalLines, reservedHorizontalLines);

    return sortedConnections.map((conn) => {
      // スキップすべき逆方向接続は描画しない
      if (skipConnections.has(conn)) return '';

      const fromNode = this.nodeMap.get(conn.from);
      const toNode = this.nodeMap.get(conn.to);

      if (!fromNode || !toNode) return '';

      // 双方向接続かどうかチェック
      const isBidirectional = bidirectionalPairs.has(conn);
      const effectiveConn = isBidirectional ? { ...conn, bidirectional: true } : conn;

      // Find original index for anchor info lookup
      const originalIndex = this.diagram.connections!.indexOf(conn);
      const anchorInfo = anchorInfoMap.get(originalIndex);
      return this.renderConnection(effectiveConn, fromNode, toNode, anchorInfo, allNodes, minY, reservedVerticalLines, reservedHorizontalLines);
    }).join('\n');
  }

  /**
   * Render single connection
   */
  private renderConnection(
    conn: Connection,
    fromNode: ComputedNode,
    toNode: ComputedNode,
    anchorInfo?: ConnectionAnchorInfo,
    allNodes?: ComputedNode[],
    minY?: number,
    reservedVerticalLines?: ReservedVerticalLines,
    reservedHorizontalLines?: ReservedHorizontalLines
  ): string {
    const path = generateConnectionPath(conn, fromNode, toNode, anchorInfo, allNodes, minY, reservedVerticalLines, reservedHorizontalLines);
    const color = this.resolveColor(conn.color) ||
      (conn.type === 'auth' ? DEFAULT_COLORS.orange : DEFAULT_COLORS.blue);
    const width = conn.width || 2;
    const markerId = `arrow-${color.replace('#', '')}`;

    let markerAttr = `marker-end="url(#${markerId})"`;
    if (conn.bidirectional) {
      markerAttr = `marker-start="url(#${markerId}-start)" marker-end="url(#${markerId}-end)"`;
    }

    return `<path class="connection" data-from="${conn.from}" data-to="${conn.to}" d="${path}" stroke="${color}" stroke-width="${width}" fill="none" ${markerAttr}/>`;
  }

  /**
   * Resolve color reference
   */
  private resolveColor(colorRef?: string): string | undefined {
    if (!colorRef) return undefined;
    if (colorRef.startsWith('#')) return colorRef;
    return this.diagram.colors?.[colorRef] || DEFAULT_COLORS[colorRef as keyof typeof DEFAULT_COLORS];
  }

  /**
   * Get embedded CSS (viewer only)
   */
  protected getCss(): string {
    return getBaseCss();
  }

  /**
   * Get JavaScript for viewer functionality (resize only)
   */
  protected getViewerScript(): string {
    return getViewerScript();
  }

  /**
   * Get CSS for shareable HTML (interactive features)
   */
  private getShareableCss(): string {
    const orientation = this.options.paperOrientation;
    const pageSize = orientation ? `A4 ${orientation}` : 'auto';
    return getShareableCss(pageSize);
  }

  /**
   * Build node icon and bounds data for interactive scripts
   */
  private buildInteractiveScriptData(): {
    nodeIconMap: Record<string, { icon: string; desc?: string; license: string }>;
    nodeBoundsMap: Record<string, { left: number; top: number; right: number; bottom: number }>;
  } {
    const nodeIconMap: Record<string, { icon: string; desc?: string; license: string }> = {};
    const resources = this.diagram.resources || {};

    const getLicense = (icon: string): string => {
      if (icon.startsWith('aws:')) return 'AWS Architecture Icons - Apache License 2.0';
      if (icon.startsWith('azure:')) return 'Azure Icons - MIT License';
      if (icon.startsWith('gcp:')) return 'Google Cloud Icons - Apache License 2.0';
      if (icon.startsWith('tech-stack:')) return 'Simple Icons - CC0 1.0 Universal';
      return '';
    };

    const truncate = (text: string, maxLen: number): string => {
      if (text.length <= maxLen) return text;
      return text.slice(0, maxLen - 3) + '...';
    };

    const collectNodes = (nodes: ComputedNode[]) => {
      for (const node of nodes) {
        if (node.icon) {
          const resource = resources[node.id];
          nodeIconMap[node.id] = {
            icon: node.icon,
            desc: resource?.desc ? truncate(resource.desc, 50) : undefined,
            license: getLicense(node.icon),
          };
        }
        if (node.type === 'composite' && node.icons) {
          for (const iconRef of node.icons) {
            const iconId = iconRef.icon || resources[iconRef.id]?.icon;
            if (iconId) {
              nodeIconMap[iconRef.id] = {
                icon: iconId,
                desc: resources[iconRef.id]?.desc ? truncate(resources[iconRef.id].desc!, 50) : undefined,
                license: getLicense(iconId),
              };
            }
          }
        }
        if (node.children) {
          collectNodes(node.children as ComputedNode[]);
        }
      }
    };
    collectNodes(this.computedNodes);

    const nodeBoundsMap: Record<string, { left: number; top: number; right: number; bottom: number }> = {};
    for (const [id, node] of this.nodeMap) {
      if (node.bounds) {
        nodeBoundsMap[id] = {
          left: node.bounds.left,
          top: node.bounds.top,
          right: node.bounds.right,
          bottom: node.bounds.bottom,
        };
      }
      if (node.type === 'composite' && node.icons) {
        const iconSize = 36;
        const labelHeight = 14;
        const iconGap = 12;
        const nodeAbsX = node.computedX;
        const nodeAbsY = node.computedY;
        const w = node.computedWidth || 100;
        for (let i = 0; i < node.icons.length; i++) {
          const iconRef = node.icons[i];
          const iconY = 20 + i * (iconSize + labelHeight + iconGap);
          const iconX = (w - iconSize) / 2;
          nodeBoundsMap[iconRef.id] = {
            left: nodeAbsX + iconX,
            top: nodeAbsY + iconY,
            right: nodeAbsX + iconX + iconSize,
            bottom: nodeAbsY + iconY + iconSize,
          };
        }
      }
    }

    return { nodeIconMap, nodeBoundsMap };
  }

  /**
   * Get JavaScript for shareable HTML (hover, click-to-copy, area selection)
   */
  private getShareableScript(): string {
    const { nodeIconMap, nodeBoundsMap } = this.buildInteractiveScriptData();
    return getInteractiveScript(nodeIconMap, nodeBoundsMap);
  }

  /**
   * Generate diagram metadata for AI adjustment
   * AIがダイアグラムを理解・調整するためのメタデータを生成
   */
  generateDiagramMeta(sourceFile?: string, renderOptions?: { width?: number; height?: number }, originalSource?: unknown): DiagramMeta {
    const { width, height } = this.options;

    // ノードメタデータを収集
    const nodes: NodeMeta[] = [];
    this.collectNodeMeta(this.computedNodes, nodes);

    // 接続メタデータを収集
    const connections: ConnectionMeta[] = this.collectConnectionMeta();

    // レイアウト情報を解析
    const layout = this.analyzeLayout(nodes);

    // 元のソースを保存（再構築用）
    // originalSource があればそれを使用（元のJSONそのまま）、なければパース後のダイアグラムを使用
    let source: DiagramMeta['source'];
    if (originalSource && typeof originalSource === 'object') {
      const orig = originalSource as Record<string, unknown>;
      if (renderOptions && !orig.render) {
        source = { ...orig, render: renderOptions } as unknown as DiagramMeta['source'];
      } else {
        source = orig as unknown as DiagramMeta['source'];
      }
    } else {
      source = { ...this.diagram };
      if (renderOptions) {
        source.render = renderOptions;
      }
    }

    return {
      version: '1.0',
      title: this.diagram.title,
      subtitle: this.diagram.subtitle,
      canvas: {
        width,
        height,
        gridSize: 50, // デフォルトグリッドサイズ
      },
      nodes,
      connections,
      layout,
      sourceFile,
      source,
    };
  }

  /**
   * Collect node metadata recursively
   * @param nodes - List of computed nodes
   * @param result - Array to collect results
   * @param parentId - Parent node ID (for child nodes)
   */
  private collectNodeMeta(nodes: ComputedNode[], result: NodeMeta[], parentId?: string): void {
    const iconSize = this.options.iconSize;

    for (const node of nodes) {
      const absNode = this.nodeMap.get(node.id);
      if (!absNode) continue;

      const { computedX: x, computedY: y, computedWidth: w, computedHeight: h } = absNode;
      const isIconNode = !node.type || node.type === 'icon';
      const nodeWidth = isIconNode ? iconSize : w;
      const nodeHeight = isIconNode ? iconSize : h;

      result.push({
        id: node.id,
        label: node.label,
        sublabel: node.sublabel,
        icon: node.icon,
        type: node.type,
        position: { x, y },
        size: { width: nodeWidth, height: nodeHeight },
        center: { x: x + nodeWidth / 2, y: y + nodeHeight / 2 },
        parentId,
      });

      // 子ノードも収集（現在のノードIDを親として渡す）
      if (node.children) {
        this.collectNodeMeta(node.children as ComputedNode[], result, node.id);
      }
    }
  }

  /**
   * Collect connection metadata
   */
  private collectConnectionMeta(): ConnectionMeta[] {
    if (!this.diagram.connections) return [];

    return this.diagram.connections.map(conn => {
      const fromNode = this.nodeMap.get(conn.from);
      const toNode = this.nodeMap.get(conn.to);

      // アンカー辺を決定
      let fromSide = conn.fromSide;
      let toSide = conn.toSide;
      if (fromNode && toNode && (!fromSide || !toSide)) {
        // 兄弟ノードと親グループ境界を取得（グループ内ノードの場合）
        const { siblingNodes, parentGroupBounds } = getSiblingNodesAndParentBounds(fromNode, this.nodeMap);
        const autoSides = determineAnchorSide(fromNode, toNode, siblingNodes, parentGroupBounds);
        fromSide = fromSide || autoSides.fromSide;
        toSide = toSide || autoSides.toSide;
      }

      return {
        from: conn.from,
        to: conn.to,
        fromSide,
        toSide,
        color: conn.color,
        type: conn.type,
      };
    });
  }

  /**
   * Analyze layout to detect rows and columns
   * Y座標・X座標が近いノードをグループ化
   */
  private analyzeLayout(nodes: NodeMeta[]): LayoutMeta {
    const TOLERANCE = 30; // 座標の許容誤差

    // 行を解析（Y座標でグループ化）
    const rowMap = new Map<number, string[]>();
    for (const node of nodes) {
      const y = node.center.y;
      let foundRow = false;
      for (const [rowY, nodeIds] of rowMap) {
        if (Math.abs(y - rowY) < TOLERANCE) {
          nodeIds.push(node.id);
          foundRow = true;
          break;
        }
      }
      if (!foundRow) {
        rowMap.set(y, [node.id]);
      }
    }

    // 列を解析（X座標でグループ化）
    const colMap = new Map<number, string[]>();
    for (const node of nodes) {
      const x = node.center.x;
      let foundCol = false;
      for (const [colX, nodeIds] of colMap) {
        if (Math.abs(x - colX) < TOLERANCE) {
          nodeIds.push(node.id);
          foundCol = true;
          break;
        }
      }
      if (!foundCol) {
        colMap.set(x, [node.id]);
      }
    }

    // ソートして返す
    const rows = Array.from(rowMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([y, nodeIds]) => ({ y: Math.round(y), nodes: nodeIds }));

    const columns = Array.from(colMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([x, nodeIds]) => ({ x: Math.round(x), nodes: nodeIds }));

    return { rows, columns };
  }

  /**
   * Escape HTML entities
   */
  protected escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Render preview HTML with Base64 embedded icons
   * No edit functionality, icons are fetched and embedded as data URIs
   */
  async renderPreviewHtml(): Promise<string> {
    // Preload icon catalog from CDN before rendering
    await loadIconUrlMap();
    const svg = this.renderSvg();

    // Collect all icon URLs from SVG
    const urlRegex = /<image href="([^"]+)"/g;
    const urls = new Set<string>();
    let match;
    while ((match = urlRegex.exec(svg)) !== null) {
      urls.add(match[1]);
    }

    // Fetch all icons and convert to Base64
    const iconDataMap = new Map<string, string>();
    await Promise.all(
      Array.from(urls).map(async (url) => {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            console.error(`[gospelo-architect] Failed to fetch icon: ${url} (${response.status})`);
            return;
          }
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');

          // Determine MIME type
          let mimeType = 'image/svg+xml';
          if (url.endsWith('.png')) {
            mimeType = 'image/png';
          } else if (url.endsWith('.jpg') || url.endsWith('.jpeg')) {
            mimeType = 'image/jpeg';
          }

          iconDataMap.set(url, `data:${mimeType};base64,${base64}`);
        } catch (error) {
          console.error(`[gospelo-architect] Error fetching icon: ${url}`, error);
        }
      })
    );

    // Replace all icon URLs with Base64 data URIs
    let embeddedSvg = svg;
    for (const [url, dataUri] of iconDataMap) {
      embeddedSvg = embeddedSvg.split(`href="${url}"`).join(`href="${dataUri}"`);
    }

    // Remove SVG <title> elements (we use JavaScript tooltip instead)
    embeddedSvg = embeddedSvg.replace(/<title>[^<]*<\/title>/g, '');

    // Add selection UI elements before closing </svg> tag
    // These elements are added at the end of SVG so they render on top (SVG z-order is document order)
    const selectionUi = `
  <rect id="selection-rect" x="0" y="0" width="0" height="0" fill="rgba(0, 120, 215, 0.1)" stroke="#0078D7" stroke-width="1" stroke-dasharray="4 2" style="display:none; pointer-events:none;"/>
  <g id="copy-btn" style="display:none; cursor:pointer; pointer-events:all;">
    <rect x="0" y="0" width="32" height="32" rx="6" fill="#E3F2FD" stroke="#0078D7" stroke-width="1.5" style="pointer-events:all;"/>
    <g transform="translate(4, 4)" style="pointer-events:none;">
      <rect width="8" height="4" x="8" y="2" rx="1" fill="none" stroke="#0078D7" stroke-width="2"/>
      <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" fill="none" stroke="#0078D7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 4h2a2 2 0 0 1 2 2v4" fill="none" stroke="#0078D7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M21 14H11" fill="none" stroke="#0078D7" stroke-width="2" stroke-linecap="round"/>
      <path d="M15 10l-4 4 4 4" fill="none" stroke="#0078D7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </g>`;
    embeddedSvg = embeddedSvg.replace('</svg>', `${selectionUi}\n</svg>`);

    // License text for popup (preview HTML only - no redistribution)
    const licenseText = `CONFIDENTIAL - INTERNAL USE ONLY

This preview file is for internal review purposes only.
Redistribution of this file is strictly prohibited.

Generated with gospelo-architect

---

Third-Party Icon Attributions

AWS Architecture Icons - Apache License 2.0 (Amazon Web Services, Inc.)
Azure Icons - MIT License (Ben Coleman)
Google Cloud Icons - Apache License 2.0 (Google LLC)
Simple Icons - CC0 1.0 Universal (Simple Icons Collaborators)`;

    // Generate minimal HTML without edit functionality
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${this.escapeHtml(this.diagram.title || 'Diagram Preview')}</title>
  <style>${this.getPreviewCss()}</style>
</head>
<body>
  <div class="gospelo-diagram">
    ${embeddedSvg}
  </div>
  <div id="copy-toast" class="copy-toast"></div>
  <div id="hover-tooltip" class="hover-tooltip"></div>
  <div class="confidential-badge" onclick="document.getElementById('license-popup').classList.add('visible')">Confidential</div>
  <div class="license-popup-overlay" id="license-popup" onclick="if(event.target===this)this.classList.remove('visible')">
    <div class="license-popup">
      <div class="license-popup-header">
        <span>License</span>
        <button class="license-popup-close" onclick="document.getElementById('license-popup').classList.remove('visible')">&times;</button>
      </div>
      <div class="license-popup-content">
        <pre>${this.escapeHtml(licenseText)}</pre>
      </div>
    </div>
  </div>
  <script>${this.getPreviewScript()}</script>
</body>
</html>`;
  }

  /**
   * Render SVG with Base64 embedded icons
   * Pure SVG output with all icons embedded as data URIs
   * Fullscreen display with preserved aspect ratio
   */
  async renderSvgEmbed(): Promise<string> {
    // Preload icon catalog from CDN before rendering
    await loadIconUrlMap();
    const svg = this.renderSvg();

    // Collect all icon URLs from SVG
    const urlRegex = /<image href="([^"]+)"/g;
    const urls = new Set<string>();
    let match;
    while ((match = urlRegex.exec(svg)) !== null) {
      urls.add(match[1]);
    }

    // Fetch all icons and convert to Base64
    const iconDataMap = new Map<string, string>();
    await Promise.all(
      Array.from(urls).map(async (url) => {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            console.error(`[gospelo-architect] Failed to fetch icon: ${url} (${response.status})`);
            return;
          }
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');

          // Determine MIME type
          let mimeType = 'image/svg+xml';
          if (url.endsWith('.png')) {
            mimeType = 'image/png';
          } else if (url.endsWith('.jpg') || url.endsWith('.jpeg')) {
            mimeType = 'image/jpeg';
          }

          iconDataMap.set(url, `data:${mimeType};base64,${base64}`);
        } catch (error) {
          console.error(`[gospelo-architect] Error fetching icon: ${url}`, error);
        }
      })
    );

    // Replace all icon URLs with Base64 data URIs
    let embeddedSvg = svg;
    for (const [url, dataUri] of iconDataMap) {
      embeddedSvg = embeddedSvg.split(`href="${url}"`).join(`href="${dataUri}"`);
    }

    // Add Confidential badge with hover tooltip (bottom-right corner)
    const { width, height } = this.options;
    const badgeX = width - 90;
    const badgeY = height - 30;
    const licenseText = `CONFIDENTIAL - INTERNAL USE ONLY

This file is for internal review purposes only.
Redistribution is strictly prohibited.

Generated with gospelo-architect

Third-Party Icon Attributions:
- AWS Architecture Icons (Apache 2.0)
- Azure Icons (MIT)
- Google Cloud Icons (Apache 2.0)
- Simple Icons (CC0 1.0)`;

    const confidentialBadge = `
  <g id="confidential-badge" transform="translate(${badgeX}, ${badgeY})" style="cursor:pointer;">
    <title>${this.escapeHtml(licenseText)}</title>
    <rect x="0" y="0" width="80" height="24" rx="4" fill="#f5f5f5" stroke="#999" stroke-width="1"/>
    <text x="40" y="16" text-anchor="middle" font-size="10" font-family="sans-serif" fill="#666">Confidential</text>
  </g>`;

    embeddedSvg = embeddedSvg.replace('</svg>', `${confidentialBadge}\n</svg>`);

    return embeddedSvg;
  }

  /**
   * Get JavaScript for preview hover tooltip, copy functionality, and area selection
   */
  private getPreviewScript(): string {
    const { nodeIconMap, nodeBoundsMap } = this.buildInteractiveScriptData();
    return getInteractiveScript(nodeIconMap, nodeBoundsMap);
  }

  /**
   * Get minimal CSS for preview (no edit panel styles)
   */
  private getPreviewCss(): string {
    return getPreviewCss();
  }
}
