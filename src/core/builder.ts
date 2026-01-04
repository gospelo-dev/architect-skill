/**
 * DiagramBuilder - Fluent interface for incremental diagram manipulation
 * ダイアグラムをインクリメンタルに編集するためのビルダークラス
 *
 * Usage:
 * ```typescript
 * const builder = new DiagramBuilder(existingDiagram)
 *   .addNode({ id: 'lambda', icon: 'aws:lambda', label: 'Lambda', position: [400, 250] })
 *   .addConnection({ from: 'api', to: 'lambda' })
 *   .updateNode('lambda', { sublabel: 'Python 3.9' })
 *   .moveNode('lambda', [500, 300])
 *   .removeNode('old_node');
 *
 * const diagram = builder.build();
 * ```
 */

import type {
  DiagramDefinition,
  Node,
  Connection,
  Background,
  NodeType,
  ConnectionType,
  AnchorSide,
  LabelPosition,
  LayoutDirection,
  RenderOptions,
} from './types';

/**
 * Node input for adding new nodes (simplified)
 */
export interface NodeInput {
  id: string;
  type?: NodeType;
  icon?: string;
  label?: string;
  sublabel?: string;
  position?: [number, number];
  size?: [number, number];
  borderColor?: string;
  layout?: LayoutDirection;
  labelPosition?: LabelPosition;
  groupIcon?: string;
  children?: NodeInput[];
  icons?: { id: string; icon: string; label?: string }[];
}

/**
 * Connection input for adding new connections (simplified)
 */
export interface ConnectionInput {
  from: string;
  to: string;
  type?: ConnectionType;
  width?: number;
  color?: string;
  style?: 'solid' | 'dashed' | 'dotted';
  bidirectional?: boolean;
  label?: string;
  fromSide?: AnchorSide;
  toSide?: AnchorSide;
}

/**
 * Partial node update
 */
export type NodeUpdate = Partial<Omit<NodeInput, 'id'>>;

/**
 * Partial connection update
 */
export type ConnectionUpdate = Partial<Omit<ConnectionInput, 'from' | 'to'>>;

/**
 * DiagramBuilder class for fluent diagram manipulation
 */
export class DiagramBuilder {
  private diagram: DiagramDefinition;
  private renderMeta?: RenderOptions;

  constructor(base?: Partial<DiagramDefinition> | string) {
    if (typeof base === 'string') {
      const parsed = JSON.parse(base);
      this.diagram = parsed as DiagramDefinition;
      this.renderMeta = parsed.render;
    } else if (base) {
      this.diagram = {
        title: base.title || 'Untitled Diagram',
        subtitle: base.subtitle,
        background: base.background,
        colors: base.colors ? { ...base.colors } : undefined,
        nodes: base.nodes ? [...base.nodes] : [],
        connections: base.connections ? [...base.connections] : [],
      };
      this.renderMeta = (base as any).render;
    } else {
      this.diagram = {
        title: 'Untitled Diagram',
        nodes: [],
        connections: [],
      };
    }
  }

  // ===== Title & Metadata =====

  /**
   * Set diagram title
   */
  setTitle(title: string): this {
    this.diagram.title = title;
    return this;
  }

  /**
   * Set diagram subtitle
   */
  setSubtitle(subtitle: string): this {
    this.diagram.subtitle = subtitle;
    return this;
  }

  /**
   * Set background
   */
  setBackground(background: Background): this {
    this.diagram.background = background;
    return this;
  }

  /**
   * Set or add a color definition
   */
  setColor(name: string, value: string): this {
    if (!this.diagram.colors) {
      this.diagram.colors = {};
    }
    this.diagram.colors[name] = value;
    return this;
  }

  /**
   * Set render options (width, height)
   * レンダリングオプションを設定
   */
  setRender(render: Partial<RenderOptions>): this {
    if (!this.renderMeta) {
      this.renderMeta = {};
    }
    if (render.width !== undefined) this.renderMeta.width = render.width;
    if (render.height !== undefined) this.renderMeta.height = render.height;
    return this;
  }

  /**
   * Get current render options
   */
  getRender(): RenderOptions | undefined {
    return this.renderMeta;
  }

  // ===== Node Operations =====

  /**
   * Add a new node
   */
  addNode(input: NodeInput): this {
    const node = this.inputToNode(input);
    this.diagram.nodes.push(node);
    return this;
  }

  /**
   * Add multiple nodes
   */
  addNodes(inputs: NodeInput[]): this {
    for (const input of inputs) {
      this.addNode(input);
    }
    return this;
  }

  /**
   * Update an existing node
   */
  updateNode(id: string, update: NodeUpdate): this {
    const node = this.findNode(id);
    if (!node) {
      throw new Error(`Node not found: ${id}`);
    }

    if (update.type !== undefined) node.type = update.type;
    if (update.icon !== undefined) node.icon = update.icon;
    if (update.label !== undefined) node.label = update.label;
    if (update.sublabel !== undefined) node.sublabel = update.sublabel;
    if (update.position !== undefined) node.position = update.position;
    if (update.size !== undefined) node.size = update.size;
    if (update.borderColor !== undefined) node.borderColor = update.borderColor;
    if (update.layout !== undefined) node.layout = update.layout;
    if (update.labelPosition !== undefined) node.labelPosition = update.labelPosition;
    if (update.groupIcon !== undefined) node.groupIcon = update.groupIcon;
    if (update.children !== undefined) node.children = update.children.map(c => this.inputToNode(c));
    if (update.icons !== undefined) node.icons = update.icons;

    return this;
  }

  /**
   * Move a node to a new position
   */
  moveNode(id: string, position: [number, number]): this {
    return this.updateNode(id, { position });
  }

  /**
   * Resize a node
   */
  resizeNode(id: string, size: [number, number]): this {
    return this.updateNode(id, { size });
  }

  /**
   * Change node icon
   */
  setNodeIcon(id: string, icon: string): this {
    return this.updateNode(id, { icon });
  }

  /**
   * Change node label
   */
  setNodeLabel(id: string, label: string, sublabel?: string): this {
    const update: NodeUpdate = { label };
    if (sublabel !== undefined) update.sublabel = sublabel;
    return this.updateNode(id, update);
  }

  /**
   * Insert a node above (Y direction) a reference node
   * Y軸で基準ノードの上にノードを追加
   */
  insertAbove(refNodeId: string, input: NodeInput, offsetY = 100): this {
    const refNode = this.findNode(refNodeId);
    if (!refNode) {
      throw new Error(`Reference node not found: ${refNodeId}`);
    }

    const refPos = refNode.position || [400, 300];
    const newPos: [number, number] = [refPos[0], refPos[1] - offsetY];

    return this.addNode({
      ...input,
      position: input.position || newPos,
    });
  }

  /**
   * Insert a node below (Y direction) a reference node
   * Y軸で基準ノードの下にノードを追加
   */
  insertBelow(refNodeId: string, input: NodeInput, offsetY = 100): this {
    const refNode = this.findNode(refNodeId);
    if (!refNode) {
      throw new Error(`Reference node not found: ${refNodeId}`);
    }

    const refPos = refNode.position || [400, 300];
    const newPos: [number, number] = [refPos[0], refPos[1] + offsetY];

    return this.addNode({
      ...input,
      position: input.position || newPos,
    });
  }

  /**
   * Insert a node to the left of a reference node
   * X軸で基準ノードの左にノードを追加
   */
  insertLeft(refNodeId: string, input: NodeInput, offsetX = 150): this {
    const refNode = this.findNode(refNodeId);
    if (!refNode) {
      throw new Error(`Reference node not found: ${refNodeId}`);
    }

    const refPos = refNode.position || [400, 300];
    const newPos: [number, number] = [refPos[0] - offsetX, refPos[1]];

    return this.addNode({
      ...input,
      position: input.position || newPos,
    });
  }

  /**
   * Insert a node to the right of a reference node
   * X軸で基準ノードの右にノードを追加
   */
  insertRight(refNodeId: string, input: NodeInput, offsetX = 150): this {
    const refNode = this.findNode(refNodeId);
    if (!refNode) {
      throw new Error(`Reference node not found: ${refNodeId}`);
    }

    const refPos = refNode.position || [400, 300];
    const newPos: [number, number] = [refPos[0] + offsetX, refPos[1]];

    return this.addNode({
      ...input,
      position: input.position || newPos,
    });
  }

  /**
   * Remove a node and its connections
   */
  removeNode(id: string): this {
    const index = this.diagram.nodes.findIndex(n => n.id === id);
    if (index === -1) {
      throw new Error(`Node not found: ${id}`);
    }

    // Remove the node
    this.diagram.nodes.splice(index, 1);

    // Remove connections to/from this node
    if (this.diagram.connections) {
      this.diagram.connections = this.diagram.connections.filter(
        c => c.from !== id && c.to !== id
      );
    }

    return this;
  }

  /**
   * Check if a node exists
   */
  hasNode(id: string): boolean {
    return this.diagram.nodes.some(n => n.id === id);
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): Node | undefined {
    return this.findNode(id);
  }

  // ===== Alignment Operations =====

  /**
   * Align nodes to match the Y position (top) of a reference node
   * 複数ノードのY座標を基準ノードに揃える
   */
  alignTop(refNodeId: string, nodeIds: string[]): this {
    const refNode = this.findNode(refNodeId);
    if (!refNode) {
      throw new Error(`Reference node not found: ${refNodeId}`);
    }
    const refY = refNode.position?.[1] ?? 300;

    for (const nodeId of nodeIds) {
      const node = this.findNode(nodeId);
      if (node && node.position) {
        node.position = [node.position[0], refY];
      }
    }
    return this;
  }

  /**
   * Align nodes to match the X position (left) of a reference node
   * 複数ノードのX座標を基準ノードに揃える
   */
  alignLeft(refNodeId: string, nodeIds: string[]): this {
    const refNode = this.findNode(refNodeId);
    if (!refNode) {
      throw new Error(`Reference node not found: ${refNodeId}`);
    }
    const refX = refNode.position?.[0] ?? 400;

    for (const nodeId of nodeIds) {
      const node = this.findNode(nodeId);
      if (node && node.position) {
        node.position = [refX, node.position[1]];
      }
    }
    return this;
  }

  // Layout constants (must match src/layout/layout.ts)
  private static readonly DEFAULT_ICON_SIZE = 48;
  private static readonly DEFAULT_LABEL_HEIGHT = 80;
  private static readonly DEFAULT_GROUP_PADDING = 20;
  private static readonly DEFAULT_SPACING = 30;

  /**
   * Helper to get node computed height (matching layout calculation)
   */
  private getNodeHeight(node: Node): number {
    if (node.size) return node.size[1];

    switch (node.type) {
      case 'group': {
        const childCount = node.children?.length || 0;
        const padding = DiagramBuilder.DEFAULT_GROUP_PADDING * 2;
        if (node.layout === 'vertical') {
          return padding + 30 + childCount * (DiagramBuilder.DEFAULT_ICON_SIZE + DiagramBuilder.DEFAULT_LABEL_HEIGHT + DiagramBuilder.DEFAULT_SPACING);
        }
        return DiagramBuilder.DEFAULT_ICON_SIZE + DiagramBuilder.DEFAULT_LABEL_HEIGHT + padding + 30;
      }
      case 'composite': {
        const iconCount = node.icons?.length || 0;
        const padding = 20;
        const spacing = 10;
        const iconSize = 40;
        if (node.layout === 'vertical') {
          return padding * 2 + iconCount * (iconSize + spacing) + DiagramBuilder.DEFAULT_LABEL_HEIGHT;
        }
        return iconSize + padding * 2 + DiagramBuilder.DEFAULT_LABEL_HEIGHT;
      }
      case 'text_box':
        return node.sublabel ? 50 : 30;
      default:
        // Icon nodes: only icon size (not including label below)
        // Connection lines originate from icon center, so we align based on icon only
        return DiagramBuilder.DEFAULT_ICON_SIZE;
    }
  }

  /**
   * Helper to get node computed width (matching layout calculation)
   */
  private getNodeWidth(node: Node): number {
    if (node.size) return node.size[0];

    switch (node.type) {
      case 'group': {
        const childCount = node.children?.length || 0;
        const padding = DiagramBuilder.DEFAULT_GROUP_PADDING * 2;
        if (node.layout === 'vertical') {
          return DiagramBuilder.DEFAULT_ICON_SIZE + padding + 20;
        }
        return padding + childCount * (DiagramBuilder.DEFAULT_ICON_SIZE + DiagramBuilder.DEFAULT_SPACING);
      }
      case 'composite': {
        const iconCount = node.icons?.length || 0;
        const padding = 20;
        const spacing = 10;
        const iconSize = 40;
        if (node.layout === 'vertical') {
          return iconSize + padding * 2;
        }
        return padding * 2 + iconCount * (iconSize + spacing);
      }
      case 'text_box': {
        const labelLength = (node.label?.length || 0) * 8;
        return Math.max(60, labelLength + 20);
      }
      default:
        // Icon nodes
        return DiagramBuilder.DEFAULT_ICON_SIZE;
    }
  }

  /**
   * Align nodes to match the vertical center (Y center) of a reference node
   * 複数ノードの垂直中央を基準ノードの中央に揃える
   */
  alignCenterY(refNodeId: string, nodeIds: string[]): this {
    const refNode = this.findNode(refNodeId);
    if (!refNode) {
      throw new Error(`Reference node not found: ${refNodeId}`);
    }
    const refY = refNode.position?.[1] ?? 300;
    const refHeight = this.getNodeHeight(refNode);
    const refCenterY = refY + refHeight / 2;

    for (const nodeId of nodeIds) {
      const node = this.findNode(nodeId);
      if (node && node.position) {
        const nodeHeight = this.getNodeHeight(node);
        const newY = refCenterY - nodeHeight / 2;
        node.position = [node.position[0], newY];
      }
    }
    return this;
  }

  /**
   * Align nodes to match the horizontal center (X center) of a reference node
   * 複数ノードの水平中央を基準ノードの中央に揃える
   */
  alignCenterX(refNodeId: string, nodeIds: string[]): this {
    const refNode = this.findNode(refNodeId);
    if (!refNode) {
      throw new Error(`Reference node not found: ${refNodeId}`);
    }
    const refX = refNode.position?.[0] ?? 400;
    const refWidth = this.getNodeWidth(refNode);
    const refCenterX = refX + refWidth / 2;

    for (const nodeId of nodeIds) {
      const node = this.findNode(nodeId);
      if (node && node.position) {
        const nodeWidth = this.getNodeWidth(node);
        const newX = refCenterX - nodeWidth / 2;
        node.position = [newX, node.position[1]];
      }
    }
    return this;
  }

  /**
   * Distribute nodes horizontally with equal spacing
   * ノードを等間隔に水平配置する
   */
  distributeHorizontally(nodeIds: string[], spacing = 150): this {
    if (nodeIds.length < 2) return this;

    // Get nodes sorted by current X position
    const nodes = nodeIds
      .map(id => this.findNode(id))
      .filter((n): n is Node => n !== undefined && n.position !== undefined)
      .sort((a, b) => (a.position![0]) - (b.position![0]));

    if (nodes.length < 2) return this;

    const startX = nodes[0].position![0];

    for (let i = 0; i < nodes.length; i++) {
      nodes[i].position = [startX + i * spacing, nodes[i].position![1]];
    }
    return this;
  }

  /**
   * Distribute nodes vertically with equal spacing
   * ノードを等間隔に垂直配置する
   */
  distributeVertically(nodeIds: string[], spacing = 100): this {
    if (nodeIds.length < 2) return this;

    // Get nodes sorted by current Y position
    const nodes = nodeIds
      .map(id => this.findNode(id))
      .filter((n): n is Node => n !== undefined && n.position !== undefined)
      .sort((a, b) => (a.position![1]) - (b.position![1]));

    if (nodes.length < 2) return this;

    const startY = nodes[0].position![1];

    for (let i = 0; i < nodes.length; i++) {
      nodes[i].position = [nodes[i].position![0], startY + i * spacing];
    }
    return this;
  }

  // ===== Connection Operations =====

  /**
   * Add a new connection
   */
  addConnection(input: ConnectionInput): this {
    // Validate nodes exist
    if (!this.hasNode(input.from)) {
      throw new Error(`Source node not found: ${input.from}`);
    }
    if (!this.hasNode(input.to)) {
      throw new Error(`Target node not found: ${input.to}`);
    }

    const connection = this.inputToConnection(input);
    if (!this.diagram.connections) {
      this.diagram.connections = [];
    }
    this.diagram.connections.push(connection);
    return this;
  }

  /**
   * Add multiple connections
   */
  addConnections(inputs: ConnectionInput[]): this {
    for (const input of inputs) {
      this.addConnection(input);
    }
    return this;
  }

  /**
   * Update an existing connection
   */
  updateConnection(from: string, to: string, update: ConnectionUpdate): this {
    const connection = this.findConnection(from, to);
    if (!connection) {
      throw new Error(`Connection not found: ${from} -> ${to}`);
    }

    if (update.type !== undefined) connection.type = update.type;
    if (update.width !== undefined) connection.width = update.width;
    if (update.color !== undefined) connection.color = update.color;
    if (update.style !== undefined) connection.style = update.style;
    if (update.bidirectional !== undefined) connection.bidirectional = update.bidirectional;
    if (update.label !== undefined) connection.label = update.label;
    if (update.fromSide !== undefined) connection.fromSide = update.fromSide;
    if (update.toSide !== undefined) connection.toSide = update.toSide;

    return this;
  }

  /**
   * Remove a connection
   */
  removeConnection(from: string, to: string): this {
    if (!this.diagram.connections) {
      throw new Error(`Connection not found: ${from} -> ${to}`);
    }
    const index = this.diagram.connections.findIndex(
      c => c.from === from && c.to === to
    );
    if (index === -1) {
      throw new Error(`Connection not found: ${from} -> ${to}`);
    }

    this.diagram.connections.splice(index, 1);
    return this;
  }

  /**
   * Check if a connection exists
   */
  hasConnection(from: string, to: string): boolean {
    return this.diagram.connections?.some(c => c.from === from && c.to === to) ?? false;
  }

  /**
   * Get a connection by from/to
   */
  getConnection(from: string, to: string): Connection | undefined {
    return this.findConnection(from, to);
  }

  // ===== Batch Operations =====

  /**
   * Apply multiple operations from a patch object
   */
  applyPatch(patch: DiagramPatch): this {
    // Add nodes first
    if (patch.addNodes) {
      this.addNodes(patch.addNodes);
    }

    // Update nodes
    if (patch.updateNodes) {
      for (const { id, ...update } of patch.updateNodes) {
        if (this.hasNode(id)) {
          this.updateNode(id, update);
        }
      }
    }

    // Add connections (after nodes are added)
    if (patch.addConnections) {
      this.addConnections(patch.addConnections);
    }

    // Update connections
    if (patch.updateConnections) {
      for (const { from, to, ...update } of patch.updateConnections) {
        if (this.hasConnection(from, to)) {
          this.updateConnection(from, to, update);
        }
      }
    }

    // Remove connections (before removing nodes)
    if (patch.removeConnections) {
      for (const { from, to } of patch.removeConnections) {
        if (this.hasConnection(from, to)) {
          this.removeConnection(from, to);
        }
      }
    }

    // Remove nodes last
    if (patch.removeNodes) {
      for (const id of patch.removeNodes) {
        if (this.hasNode(id)) {
          this.removeNode(id);
        }
      }
    }

    // Update metadata
    if (patch.title) this.setTitle(patch.title);
    if (patch.subtitle) this.setSubtitle(patch.subtitle);
    if (patch.background) this.setBackground(patch.background);
    if (patch.colors) {
      for (const [name, value] of Object.entries(patch.colors)) {
        this.setColor(name, value);
      }
    }

    return this;
  }

  // ===== Build =====

  /**
   * Build and return the diagram (with render metadata if set)
   */
  build(): DiagramDefinition & { render?: RenderOptions } {
    if (this.renderMeta) {
      return { ...this.diagram, render: this.renderMeta };
    }
    return this.diagram;
  }

  /**
   * Build and return as JSON string
   */
  toJSON(pretty = false): string {
    return pretty
      ? JSON.stringify(this.diagram, null, 2)
      : JSON.stringify(this.diagram);
  }

  // ===== Private Helpers =====

  private findNode(id: string): Node | undefined {
    return this.diagram.nodes.find(n => n.id === id);
  }

  private findConnection(from: string, to: string): Connection | undefined {
    return this.diagram.connections?.find(c => c.from === from && c.to === to);
  }

  private inputToNode(input: NodeInput): Node {
    return {
      id: input.id,
      type: input.type || 'icon',
      icon: input.icon,
      label: input.label,
      sublabel: input.sublabel,
      position: input.position,
      size: input.size,
      borderColor: input.borderColor,
      layout: input.layout || 'horizontal',
      labelPosition: input.labelPosition || 'inside-top-left',
      groupIcon: input.groupIcon,
      children: input.children?.map(c => this.inputToNode(c)),
      icons: input.icons,
    };
  }

  private inputToConnection(input: ConnectionInput): Connection {
    return {
      from: input.from,
      to: input.to,
      type: input.type || 'flow',
      width: input.width,
      color: input.color,
      style: input.style,
      bidirectional: input.bidirectional,
      label: input.label,
      fromSide: input.fromSide,
      toSide: input.toSide,
    };
  }
}

/**
 * Patch object for batch operations
 */
export interface DiagramPatch {
  title?: string;
  subtitle?: string;
  background?: Background;
  colors?: Record<string, string>;
  addNodes?: NodeInput[];
  updateNodes?: (NodeUpdate & { id: string })[];
  removeNodes?: string[];
  addConnections?: ConnectionInput[];
  updateConnections?: (ConnectionUpdate & { from: string; to: string })[];
  removeConnections?: { from: string; to: string }[];
}

/**
 * Create a new DiagramBuilder
 */
export function createBuilder(base?: Partial<DiagramDefinition> | string): DiagramBuilder {
  return new DiagramBuilder(base);
}
