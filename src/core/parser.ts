/**
 * JSON Parser for gospelo documents
 * Supports both gospelo 1.0 format and legacy diagram format
 *
 * Note: No external dependencies - works in Web Claude environment
 */

import {
  DiagramDefinition,
  Node,
  Connection,
  Background,
  NodeType,
  ConnectionType,
  ConnectionStyle,
  AnchorSide,
  LabelPosition,
  LayoutDirection,
  BackgroundType,
  GradientDirection,
  DEFAULT_COLORS,
  Asset,
} from './types';

/**
 * Raw JSON input type (snake_case from JSON)
 */
export interface RawDiagramInput {
  title: string;
  subtitle?: string;
  background?: {
    type?: string;
    start_color?: string;
    end_color?: string;
    direction?: string;
    color?: string;
  };
  colors?: Record<string, string>;
  nodes?: RawNodeInput[];
  connections?: RawConnectionInput[];
}

interface RawNodeInput {
  id: string;
  type?: string;
  icon?: string;
  label?: string;
  sublabel?: string;
  position?: [number, number];
  size?: [number, number];
  border_color?: string;
  layout?: string;
  label_position?: string;
  group_icon?: string;
  children?: RawNodeInput[];
  icons?: { id: string; icon: string; label?: string }[];
  /** 親ノードID（グループの子ノードの場合に必須） */
  parent_id?: string;
}

interface RawConnectionInput {
  from: string;
  to: string;
  type?: string;
  width?: number;
  color?: string;
  style?: string;
  bidirectional?: boolean;
  label?: string;
  from_side?: string;  // 出口辺
  to_side?: string;    // 入口辺
}

/**
 * Check if input is gospelo 1.0 format (has asset and documents)
 */
function isGospeloFormat(raw: unknown): raw is { asset: Asset; documents: unknown[] } {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    'asset' in raw &&
    'documents' in raw &&
    Array.isArray((raw as { documents: unknown[] }).documents)
  );
}

/**
 * Parse JSON object to DiagramDefinition
 * Supports both gospelo 1.0 format and legacy format
 */
export function parseDiagram(input: RawDiagramInput | string): DiagramDefinition {
  const raw = typeof input === 'string' ? JSON.parse(input) : input;

  // gospelo 1.0 format: extract first diagram document
  if (isGospeloFormat(raw)) {
    const docs = raw.documents;
    if (docs.length === 0) {
      throw new Error('gospelo document must have at least one document in documents array');
    }
    const firstDoc = docs[0] as RawDiagramInput & { type?: string };
    if (firstDoc.type && firstDoc.type !== 'diagram') {
      throw new Error(`Unsupported document type: ${firstDoc.type}. Only 'diagram' is currently supported.`);
    }
    return parseLegacyDiagram(firstDoc);
  }

  // Legacy format: direct diagram definition
  return parseLegacyDiagram(raw as RawDiagramInput);
}

/**
 * Parse legacy diagram format
 */
function parseLegacyDiagram(raw: RawDiagramInput): DiagramDefinition {
  if (!raw.title) {
    throw new Error('Diagram must have a title');
  }

  const diagram: DiagramDefinition = {
    title: raw.title,
    subtitle: raw.subtitle,
    background: parseBackground(raw.background),
    colors: { ...DEFAULT_COLORS, ...raw.colors },
    resources: (raw as any).resources,
    nodes: parseNodes(raw.nodes || []),
    connections: parseConnections(raw.connections || []),
  };

  return diagram;
}

/**
 * Parse background configuration
 */
function parseBackground(raw: any): Background {
  if (!raw) {
    return { type: 'white' };
  }

  return {
    type: (raw.type || 'white') as BackgroundType,
    startColor: raw.start_color,
    endColor: raw.end_color,
    direction: raw.direction as GradientDirection,
    color: raw.color,
  };
}

/**
 * Parse nodes array recursively
 * @param rawNodes - Raw node input array
 * @param expectedParentId - Expected parent ID for child nodes (undefined for top-level)
 */
function parseNodes(rawNodes: any[], expectedParentId?: string): Node[] {
  return rawNodes.map(raw => parseNode(raw, expectedParentId));
}

/**
 * Parse single node
 * @param raw - Raw node input
 * @param expectedParentId - Expected parent ID (undefined for top-level nodes)
 */
function parseNode(raw: any, expectedParentId?: string): Node {
  // Validate parentId for child nodes
  const parentId = raw.parent_id || raw.parentId;

  if (expectedParentId !== undefined) {
    // This is a child node - parentId is required
    if (!parentId) {
      throw new Error(`Child node "${raw.id}" must have parent_id field set to "${expectedParentId}"`);
    }
    if (parentId !== expectedParentId) {
      throw new Error(`Child node "${raw.id}" has incorrect parent_id: expected "${expectedParentId}", got "${parentId}"`);
    }
  } else if (parentId) {
    // Top-level node should not have parentId
    throw new Error(`Top-level node "${raw.id}" should not have parent_id field`);
  }

  const node: Node = {
    id: raw.id,
    type: (raw.type || 'icon') as NodeType,
    icon: raw.icon,
    label: raw.label || '',
    sublabel: raw.sublabel || '',
    position: raw.position as [number, number] | undefined,
    size: raw.size as [number, number] | undefined,
    borderColor: raw.border_color,
    layout: (raw.layout || 'horizontal') as LayoutDirection,
    labelPosition: (raw.label_position || 'inside-top-left') as LabelPosition,
    groupIcon: raw.group_icon,
    parentId,
  };

  // Parse children recursively (this node becomes the parent)
  if (raw.children && Array.isArray(raw.children)) {
    node.children = parseNodes(raw.children, node.id);
  }

  // Parse icons for composite type
  if (raw.icons && Array.isArray(raw.icons)) {
    node.icons = raw.icons.map((iconRef: any) => ({
      id: iconRef.id,
      icon: iconRef.icon,
      label: iconRef.label || '',
    }));
  }

  return node;
}

/**
 * Parse connections array
 */
function parseConnections(rawConnections: any[]): Connection[] {
  return rawConnections.map((raw: any) => {
    const conn: Connection = {
      from: raw.from,
      to: raw.to,
      type: (raw.type || 'data') as ConnectionType,
      width: raw.width || 2,
      color: raw.color,
      style: (raw.style || 'orthogonal') as ConnectionStyle,
      bidirectional: raw.bidirectional || false,
      label: raw.label || '',
    };

    // 出口辺・入口辺の明示的指定（省略時はundefined→自動決定）
    // snake_case (from_side) と camelCase (fromSide) の両方をサポート
    const fromSideValue = raw.from_side || raw.fromSide;
    const toSideValue = raw.to_side || raw.toSide;

    if (fromSideValue) {
      conn.fromSide = fromSideValue as AnchorSide;
    }
    if (toSideValue) {
      conn.toSide = toSideValue as AnchorSide;
    }

    return conn;
  });
}

/**
 * Validate diagram definition
 */
export function validateDiagram(diagram: DiagramDefinition): string[] {
  const errors: string[] = [];

  // Check resources is defined (required)
  if (!diagram.resources || Object.keys(diagram.resources).length === 0) {
    errors.push(
      `[AI Hint] No resources defined. Add a "resources" object with icon definitions. ` +
      `Example: "resources": { "@mynode": { "icon": "aws:lambda", "desc": "Description" } }`
    );
  }

  // Validate resource IDs have @ prefix
  const resourceIds = new Set<string>();
  if (diagram.resources) {
    for (const resourceId of Object.keys(diagram.resources)) {
      if (!resourceId.startsWith('@')) {
        errors.push(
          `[AI Hint] Resource ID "${resourceId}" must start with @. ` +
          `Fix: Rename to "@${resourceId}" in both resources and nodes.`
        );
      }
      resourceIds.add(resourceId);
    }
  }

  // Check for duplicate node IDs and validate node structure
  const nodeIds = new Set<string>();
  const collectIds = (nodes: Node[]) => {
    for (const node of nodes) {
      if (nodeIds.has(node.id)) {
        errors.push(
          `[AI Hint] Duplicate node ID "${node.id}". Each node must have a unique ID. ` +
          `Fix: Rename one of the nodes to a different ID.`
        );
      }
      nodeIds.add(node.id);

      // All nodes MUST have @ prefix and matching resource entry
      if (!node.id.startsWith('@')) {
        errors.push(
          `[AI Hint] Node ID "${node.id}" must start with @. ` +
          `Fix: Rename to "@${node.id}" and add matching resource entry.`
        );
      }
      if (node.id.startsWith('@') && !resourceIds.has(node.id)) {
        errors.push(
          `[AI Hint] Node "${node.id}" has no matching resource. ` +
          `Fix: Add to resources: "${node.id}": { "icon": "<icon-id>", "desc": "<description>" }`
        );
      }

      if (node.children) {
        collectIds(node.children);
      }

      // Validate composite node icons reference resources
      if (node.icons) {
        for (const iconRef of node.icons) {
          if (!iconRef.id.startsWith('@')) {
            errors.push(
              `[AI Hint] Composite icon ID "${iconRef.id}" must start with @. ` +
              `Fix: Rename to "@${iconRef.id}".`
            );
          }
          if (iconRef.id.startsWith('@') && !resourceIds.has(iconRef.id)) {
            errors.push(
              `[AI Hint] Composite icon "${iconRef.id}" has no matching resource. ` +
              `Fix: Add to resources: "${iconRef.id}": { "icon": "<icon-id>", "desc": "<description>" }`
            );
          }
        }
      }
    }
  };
  collectIds(diagram.nodes);

  // Validate connections reference existing nodes
  for (const conn of diagram.connections || []) {
    if (!nodeIds.has(conn.from)) {
      errors.push(
        `[AI Hint] Connection "from" references unknown node "${conn.from}". ` +
        `Fix: Add a node with id "${conn.from}" or correct the connection's "from" value.`
      );
    }
    if (!nodeIds.has(conn.to)) {
      errors.push(
        `[AI Hint] Connection "to" references unknown node "${conn.to}". ` +
        `Fix: Add a node with id "${conn.to}" or correct the connection's "to" value.`
      );
    }
  }

  // Detect duplicate and bidirectional connections
  const connections = diagram.connections || [];
  const connectionPairs = new Map<string, { conn: Connection; index: number; count: number }>();

  for (let i = 0; i < connections.length; i++) {
    const conn = connections[i];
    const key = `${conn.from}->${conn.to}`;

    // Check for duplicate connections (same from->to)
    if (connectionPairs.has(key)) {
      const existing = connectionPairs.get(key)!;
      existing.count++;
      if (existing.count === 2) {
        errors.push(
          `[AI Hint] Duplicate connection from ${conn.from} to ${conn.to}. ` +
          `Fix: Remove the duplicate connection. Each pair of nodes should have at most one connection.`
        );
      }
    } else {
      connectionPairs.set(key, { conn, index: i, count: 1 });

      // Note: Bidirectional connections (A→B and B→A) are now automatically
      // detected and merged at render time, so no validation error is needed.
    }
  }

  return errors;
}
