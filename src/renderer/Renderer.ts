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
} from '../core/types';
import { resolveIconUrl, generateFallbackSvg, loadIconUrlMap } from '../core/icons';
import { computeLayout, getNodeCenter } from '../layout/layout';
import {
  generateConnectionPath,
  generateArrowMarker,
  generateBidirectionalMarkers,
  determineAnchorSide,
  ConnectionAnchorInfo,
} from '../layout/connections';

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
   * Render complete SVG diagram
   * Z-order: コネクター → ノード（アイコン） → ラベル
   */
  renderSvg(): string {
    const { width, height } = this.options;

    const parts: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="gospelo-svg">`,
      this.renderDefs(),
      this.renderBackground(),
      this.renderBoundaryBox(width, height),
      this.renderTitle(),
      this.renderConnections(),        // 1. コネクター（一番下）
      this.renderNodes(this.computedNodes),  // 2. ノード（アイコン部分）
      this.renderNodeLabels(this.computedNodes),  // 3. ラベル（一番上）
      '</svg>',
    ];

    return parts.join('\n');
  }

  /**
   * Render boundary box with resize handle and meta toggle button
   */
  private renderBoundaryBox(width: number, height: number): string {
    const padding = 10;
    const handleSize = 16;
    const btnSize = 20;
    const btnX = width - padding - handleSize - btnSize - 8;
    const btnY = height - padding - btnSize - 2;

    return `<g class="boundary-box">
  <rect class="boundary-frame" x="${padding}" y="${padding}" width="${width - padding * 2}" height="${height - padding * 2}"
    fill="none" stroke="#D0D0D0" stroke-width="1" rx="4"/>
  <g class="meta-toggle" transform="translate(${btnX}, ${btnY})" style="cursor: pointer;">
    <rect width="${btnSize}" height="${btnSize}" rx="3" fill="#F0F0F0" stroke="#CCCCCC" stroke-width="0.5"/>
    <g transform="translate(3, 3)">
      <rect x="0" y="0" width="14" height="14" rx="2" fill="none" stroke="#666666" stroke-width="1.2"/>
      <line x1="9" y1="0" x2="9" y2="14" stroke="#666666" stroke-width="1.2"/>
      <path d="M5 5 L7 7 L5 9" fill="none" stroke="#666666" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </g>
  <polygon class="resize-handle"
    points="${width - padding},${height - padding - handleSize} ${width - padding},${height - padding} ${width - padding - handleSize},${height - padding}"
    fill="#CCCCCC" stroke="#AAAAAA" stroke-width="0.5" style="cursor: nwse-resize;"/>
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

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${this.escapeHtml(this.diagram.title)}</title>
  <style>${this.getCss()}</style>
</head>
<body>
  <div class="gospelo-diagram">
    ${this.renderSvg()}
  </div>
  <!-- AI調整用メタデータ: ノード位置・サイズ・接続情報 -->
  <script type="application/json" id="gospelo-diagram-meta">
${metaJson}
  </script>
  <script>${this.getViewerScript()}</script>
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

    // Tooltip and click-to-copy for node ID
    const tooltip = `<title>${this.escapeHtml(node.id)}</title>`;
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
   * Render group node
   */
  private renderGroupNode(node: ComputedNode): string {
    const { computedX: x, computedY: y, computedWidth: w, computedHeight: h } = node;
    const borderColor = this.resolveColor(node.borderColor) || DEFAULT_COLORS.orange;

    const children = node.children
      ? (node.children as ComputedNode[]).map(child => this.renderNode(child)).join('\n')
      : '';

    // Click-to-copy for group node ID
    const copyHandler = `onclick="event.stopPropagation();navigator.clipboard.writeText('${node.id}').then(()=>{const t=document.getElementById('copy-toast');t.textContent='Copied: ${node.id}';t.style.opacity='1';setTimeout(()=>t.style.opacity='0',1500)})"`;
    const tooltip = `<title>${this.escapeHtml(node.id)}</title>`;

    return `<g id="${node.id}" class="node group-node" transform="translate(${x}, ${y})">
  <rect class="group-box" width="${w}" height="${h}" rx="8" stroke="${borderColor}" stroke-width="2" fill="white" style="cursor:pointer" ${copyHandler}>${tooltip}</rect>
  <text class="group-label" data-node-id="${node.id}" data-field="label" x="${w / 2}" y="-8" text-anchor="middle" fill="${borderColor}" font-size="14" font-weight="bold" style="cursor:pointer" ${copyHandler}>${this.escapeHtml(node.label || '')}</text>
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
    const icons = (node.icons || []).map((iconRef, i) => {
      const iconUrl = resolveIconUrl(iconRef.icon);
      const iconY = 20 + i * (iconSize + labelHeight + iconGap);
      const iconX = (w - iconSize) / 2;
      const labelY = iconY + iconSize + 12;

      // Tooltip and click-to-copy for icon ID
      const iconTooltip = `<title>${this.escapeHtml(iconRef.id)}</title>`;
      const iconCopyHandler = `onclick="event.stopPropagation();navigator.clipboard.writeText('${iconRef.id}').then(()=>{const t=document.getElementById('copy-toast');t.textContent='Copied: ${iconRef.id}';t.style.opacity='1';setTimeout(()=>t.style.opacity='0',1500)})"`;

      const parts: string[] = [];
      parts.push(`<g id="${iconRef.id}" class="composite-icon" style="cursor:pointer" ${iconCopyHandler}>`);
      parts.push(iconTooltip);
      if (iconUrl) {
        const onerrorHandler = `onerror="console.error('[gospelo-architect] Icon load failed:', {id:'${node.id}',icon:'${iconRef.icon}',x:${x + iconX},y:${y + iconY},url:'${iconUrl}'}); this.style.display='none'"`;
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
    const tooltip = `<title>${this.escapeHtml(node.id)}</title>`;

    return `<g id="${node.id}" class="node composite-node" transform="translate(${x}, ${y})">
  ${labelParts.join('\n')}
  <rect class="composite-box" width="${w}" height="${h}" rx="4" stroke="${borderColor}" stroke-width="1" fill="white" style="cursor:pointer" ${copyHandler}>${tooltip}</rect>
  ${icons}
</g>`;
  }

  /**
   * Render text box node
   */
  private renderTextBoxNode(node: ComputedNode): string {
    const { computedX: x, computedY: y, computedWidth: w, computedHeight: h } = node;
    const borderColor = this.resolveColor(node.borderColor) || DEFAULT_COLORS.blue;

    // Tooltip and click-to-copy for text box node ID
    const tooltip = `<title>${this.escapeHtml(node.id)}</title>`;
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

    // Tooltip and click-to-copy for device node ID
    const tooltip = `<title>${this.escapeHtml(node.id)}</title>`;
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
   * Render all connections with distributed anchor points
   */
  private renderConnections(): string {
    if (!this.diagram.connections) return '';

    // First pass: calculate anchor info for all connections
    const anchorInfoMap = this.calculateAnchorDistribution();

    // Get all computed nodes for obstacle avoidance
    const allNodes = Array.from(this.nodeMap.values());

    return this.diagram.connections.map((conn, index) => {
      const fromNode = this.nodeMap.get(conn.from);
      const toNode = this.nodeMap.get(conn.to);

      if (!fromNode || !toNode) return '';

      const anchorInfo = anchorInfoMap.get(index);
      return this.renderConnection(conn, fromNode, toNode, anchorInfo, allNodes);
    }).join('\n');
  }

  /**
   * Calculate anchor distribution for all connections
   * Returns a map of connection index -> anchor info
   */
  private calculateAnchorDistribution(): Map<number, ConnectionAnchorInfo> {
    const result = new Map<number, ConnectionAnchorInfo>();
    if (!this.diagram.connections) return result;

    // Count connections per node per side
    // Key format: "nodeId:side" -> list of connection indices
    const fromSideConnections = new Map<string, number[]>();
    const toSideConnections = new Map<string, number[]>();

    // First pass: determine sides and count
    // 明示的な指定がある場合はそれを優先、なければ自動決定
    this.diagram.connections.forEach((conn, index) => {
      const fromNode = this.nodeMap.get(conn.from);
      const toNode = this.nodeMap.get(conn.to);
      if (!fromNode || !toNode) return;

      // 明示的な指定を優先、なければ自動決定
      const autoSides = determineAnchorSide(fromNode, toNode);
      const fromSide = conn.fromSide || autoSides.fromSide;
      const toSide = conn.toSide || autoSides.toSide;

      const fromKey = `${conn.from}:${fromSide}`;
      const toKey = `${conn.to}:${toSide}`;

      if (!fromSideConnections.has(fromKey)) {
        fromSideConnections.set(fromKey, []);
      }
      fromSideConnections.get(fromKey)!.push(index);

      if (!toSideConnections.has(toKey)) {
        toSideConnections.set(toKey, []);
      }
      toSideConnections.get(toKey)!.push(index);
    });

    // Sort connections on each side by target position
    // For bottom/top sides: sort by target's X position (left to right)
    // For left/right sides: sort by target's Y position (top to bottom)
    for (const [key, indices] of fromSideConnections) {
      const side = key.split(':')[1];
      indices.sort((a, b) => {
        const toNodeA = this.nodeMap.get(this.diagram.connections![a].to);
        const toNodeB = this.nodeMap.get(this.diagram.connections![b].to);
        if (!toNodeA || !toNodeB) return 0;

        if (side === 'bottom' || side === 'top') {
          // Sort by X position
          return toNodeA.computedX - toNodeB.computedX;
        } else {
          // Sort by Y position
          return toNodeA.computedY - toNodeB.computedY;
        }
      });
    }

    for (const [key, indices] of toSideConnections) {
      const side = key.split(':')[1];
      indices.sort((a, b) => {
        const fromNodeA = this.nodeMap.get(this.diagram.connections![a].from);
        const fromNodeB = this.nodeMap.get(this.diagram.connections![b].from);
        if (!fromNodeA || !fromNodeB) return 0;

        if (side === 'bottom' || side === 'top') {
          return fromNodeA.computedX - fromNodeB.computedX;
        } else {
          return fromNodeA.computedY - fromNodeB.computedY;
        }
      });
    }

    // Second pass: build anchor info for each connection
    this.diagram.connections.forEach((conn, index) => {
      const fromNode = this.nodeMap.get(conn.from);
      const toNode = this.nodeMap.get(conn.to);
      if (!fromNode || !toNode) return;

      // 明示的な指定を優先、なければ自動決定
      const autoSides = determineAnchorSide(fromNode, toNode);
      const fromSide = conn.fromSide || autoSides.fromSide;
      const toSide = conn.toSide || autoSides.toSide;

      const fromKey = `${conn.from}:${fromSide}`;
      const toKey = `${conn.to}:${toSide}`;

      const fromConnections = fromSideConnections.get(fromKey)!;
      const toConnections = toSideConnections.get(toKey)!;

      result.set(index, {
        fromSide,
        toSide,
        fromIndex: fromConnections.indexOf(index),
        fromTotal: fromConnections.length,
        toIndex: toConnections.indexOf(index),
        toTotal: toConnections.length,
      });
    });

    return result;
  }

  /**
   * Render single connection
   */
  private renderConnection(
    conn: Connection,
    fromNode: ComputedNode,
    toNode: ComputedNode,
    anchorInfo?: ConnectionAnchorInfo,
    allNodes?: ComputedNode[]
  ): string {
    const path = generateConnectionPath(conn, fromNode, toNode, anchorInfo, allNodes);
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
    return `.gospelo-diagram {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.gospelo-diagram svg {
  max-width: 100%;
  height: auto;
}
.node-label { font-weight: 500; }
.group-box { filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.1)); }
.connection { stroke-linecap: round; stroke-linejoin: round; }
.resize-handle { cursor: nwse-resize; }
.resize-handle:hover { fill: #AAAAAA; }`;
  }

  /**
   * Get JavaScript for viewer functionality (resize only)
   */
  protected getViewerScript(): string {
    return `
(function() {
  var svg = document.querySelector('.gospelo-svg');
  if (!svg) return;

  var handle = svg.querySelector('.resize-handle');
  if (!handle) return;

  var isResizing = false;
  var startX, startY, startWidth, startHeight;

  var viewBox = svg.getAttribute('viewBox').split(' ').map(Number);
  var originalWidth = viewBox[2];
  var originalHeight = viewBox[3];
  var aspectRatio = originalWidth / originalHeight;

  handle.addEventListener('mousedown', function(e) {
    e.preventDefault();
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseFloat(svg.getAttribute('width'));
    startHeight = parseFloat(svg.getAttribute('height'));
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', function(e) {
    if (!isResizing) return;
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    var delta = (dx + dy) / 2;
    var newWidth = Math.max(400, startWidth + delta);
    var newHeight = newWidth / aspectRatio;
    if (newHeight < 300) {
      newHeight = 300;
      newWidth = newHeight * aspectRatio;
    }
    svg.setAttribute('width', newWidth);
    svg.setAttribute('height', newHeight);
  });

  document.addEventListener('mouseup', function() {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
})();
`;
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
        const autoSides = determineAnchorSide(fromNode, toNode);
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
   * Get JavaScript for preview hover tooltip and copy functionality
   */
  private getPreviewScript(): string {
    // Build node ID to icon/desc mapping (use computedNodes which has resolved icons from resources)
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
        if (node.children) {
          collectNodes(node.children as ComputedNode[]);
        }
      }
    };
    collectNodes(this.computedNodes);

    return `
(function() {
  var nodeInfo = ${JSON.stringify(nodeIconMap)};
  var tooltip = document.getElementById('hover-tooltip');
  var toast = document.getElementById('copy-toast');
  var nodes = document.querySelectorAll('.node');

  nodes.forEach(function(node) {
    var nodeId = node.id;
    var info = nodeInfo[nodeId];

    node.addEventListener('mouseenter', function(e) {
      var html = '<strong>ID:</strong> ' + nodeId;
      if (info && info.icon) {
        html += '<br><strong>Icon:</strong> ' + info.icon;
      }
      if (info && info.license) {
        html += '<br><strong>License:</strong> ' + info.license;
      }
      if (info && info.desc) {
        html += '<br><strong>Desc:</strong> ' + info.desc;
      }
      tooltip.innerHTML = html;
      tooltip.style.opacity = '1';
      updateTooltipPosition(e);
    });

    node.addEventListener('mousemove', function(e) {
      updateTooltipPosition(e);
    });

    node.addEventListener('mouseleave', function() {
      tooltip.style.opacity = '0';
    });

    node.addEventListener('click', function() {
      navigator.clipboard.writeText(nodeId).then(function() {
        toast.textContent = 'Copied: ' + nodeId;
        toast.style.opacity = '1';
        setTimeout(function() { toast.style.opacity = '0'; }, 1500);
      });
    });
  });

  function updateTooltipPosition(e) {
    var x = e.clientX + 15;
    var y = e.clientY + 15;
    if (x + tooltip.offsetWidth > window.innerWidth - 10) {
      x = e.clientX - tooltip.offsetWidth - 15;
    }
    if (y + tooltip.offsetHeight > window.innerHeight - 10) {
      y = e.clientY - tooltip.offsetHeight - 15;
    }
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  }
})();
`;
  }

  /**
   * Get minimal CSS for preview (no edit panel styles)
   */
  private getPreviewCss(): string {
    return `.gospelo-diagram {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  margin: 0;
  padding: 20px;
  box-sizing: border-box;
  background: #f5f5f5;
}
.gospelo-diagram svg {
  max-width: 100%;
  height: auto;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border-radius: 4px;
}
.node-label { font-weight: 500; }
.group-box { filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.1)); }
.connection { stroke-linecap: round; stroke-linejoin: round; }
/* Hide UI elements in preview */
.boundary-box { display: none; }
/* Node hover effect */
.node { cursor: pointer; }
.node:hover { filter: brightness(1.1); }
/* Copy toast */
.copy-toast {
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 1001;
  pointer-events: none;
}
/* Hover tooltip */
.hover-tooltip {
  position: fixed;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 1002;
  pointer-events: none;
  max-width: 300px;
}
/* Confidential badge */
.confidential-badge {
  position: fixed;
  bottom: 16px;
  right: 16px;
  padding: 4px 10px;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 11px;
  font-weight: 300;
  font-style: italic;
  color: #333;
  border: 1px solid #333;
  border-radius: 2px;
  letter-spacing: 0.5px;
  background: rgba(255, 255, 255, 0.9);
  cursor: pointer;
}
.confidential-badge:hover {
  background: rgba(240, 240, 240, 0.95);
}
/* License popup */
.license-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.license-popup-overlay.visible {
  display: flex;
}
.license-popup {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
.license-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}
.license-popup-close {
  border: none;
  background: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
  padding: 0 4px;
}
.license-popup-close:hover {
  color: #333;
}
.license-popup-content {
  padding: 16px;
  overflow-y: auto;
}
.license-popup-content pre {
  margin: 0;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 12px;
  line-height: 1.6;
  color: #444;
  white-space: pre-wrap;
}`;
  }
}
