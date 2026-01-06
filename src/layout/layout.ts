/**
 * Layout calculation for diagram nodes
 * Computes positions and sizes for nodes without explicit positions
 */

import { Node, DiagramDefinition, ComputedNode, LayoutDirection, ResourceMap } from '../core/types';
import { applyAutoLayout, needsAutoLayout } from './auto-layout';

// Layout constants
const DEFAULT_ICON_SIZE = 48;
const DEFAULT_GROUP_PADDING = 20;
const DEFAULT_SPACING = 30;
const DEFAULT_LABEL_HEIGHT = 80; // 6 lines max (13px per line)

/**
 * Layout options for computeLayout
 */
export interface LayoutOptions {
  viewportWidth?: number;  // For horizontal centering in portrait mode
}

/**
 * Compute layout for all nodes in the diagram
 * Resolves icon from resources if not specified on node
 * Validates that each resource ID is used only once
 */
export function computeLayout(diagram: DiagramDefinition, options?: LayoutOptions): ComputedNode[] {
  const resources = diagram.resources || {};

  // Validate: each resource ID should be used by exactly one node
  if (Object.keys(resources).length > 0) {
    const usedResourceIds = new Set<string>();
    const collectNodeIds = (nodes: Node[]) => {
      for (const node of nodes) {
        if (resources[node.id]) {
          if (usedResourceIds.has(node.id)) {
            throw new Error(`Resource "${node.id}" is used by multiple nodes. Each resource ID must be unique.`);
          }
          usedResourceIds.add(node.id);
        }
        if (node.children) {
          collectNodeIds(node.children);
        }
      }
    };
    collectNodeIds(diagram.nodes);
  }

  const computed = diagram.nodes.map((node, index) => computeNodeLayout(node, index, null, resources));

  // Apply auto-layout if any top-level node needs positioning
  if (needsAutoLayout(computed)) {
    applyAutoLayout(computed, diagram.connections || [], {
      layout: diagram.layout || 'landscape',
      viewportWidth: options?.viewportWidth,
    });
  }

  return computed;
}

/**
 * Compute layout for a single node
 * Resolves icon from resources if not specified on node
 */
function computeNodeLayout(
  node: Node,
  index: number,
  parent: ComputedNode | null,
  resources: ResourceMap
): ComputedNode {
  // Resolve icon from resources if not specified
  let resolvedIcon = node.icon;
  if (!resolvedIcon && resources[node.id]) {
    resolvedIcon = resources[node.id].icon;
  }

  const computed: ComputedNode = {
    ...node,
    icon: resolvedIcon,
    computedX: 0,
    computedY: 0,
    computedWidth: 0,
    computedHeight: 0,
  };

  // Use explicit position if provided
  if (node.position) {
    computed.computedX = node.position[0];
    computed.computedY = node.position[1];
  } else if (parent) {
    // Calculate position relative to parent using parent's layout direction
    const layout = parent.layout || 'horizontal';
    const offset = calculateChildOffset(index, parent, layout);
    computed.computedX = offset.x;
    computed.computedY = offset.y;
  }

  // For group nodes, process children first to calculate bounding box
  if (node.type === 'group' && node.children && node.children.length > 0) {
    computed.children = node.children.map((child, i) =>
      computeNodeLayout(child, i, computed, resources)
    );
  }

  // Calculate size based on node type
  switch (node.type) {
    case 'group':
      computeGroupSize(computed);
      break;
    case 'composite':
      computeCompositeSize(computed);
      break;
    case 'text_box':
      computeTextBoxSize(computed);
      break;
    default:
      // Icon nodes
      computed.computedWidth = node.size?.[0] || DEFAULT_ICON_SIZE;
      computed.computedHeight = node.size?.[1] || DEFAULT_ICON_SIZE + DEFAULT_LABEL_HEIGHT;
  }

  // Process children recursively (for non-group nodes)
  if (node.type !== 'group' && node.children && node.children.length > 0) {
    computed.children = node.children.map((child, i) =>
      computeNodeLayout(child, i, computed, resources)
    );
  }

  return computed;
}

/**
 * Calculate child offset based on layout direction
 */
function calculateChildOffset(
  index: number,
  parent: ComputedNode,
  layout: LayoutDirection
): { x: number; y: number } {
  const padding = DEFAULT_GROUP_PADDING;
  const spacing = DEFAULT_SPACING;
  const iconSize = DEFAULT_ICON_SIZE;

  if (layout === 'horizontal') {
    return {
      x: padding + index * (iconSize + spacing),
      y: padding + 20, // Account for group label
    };
  } else {
    // Vertical layout: zigzag diagonal placement to reduce height and avoid connection overlap
    const staggerOffset = (index % 2) * (iconSize + spacing);
    // Reduce vertical spacing by overlapping rows (diagonal layout)
    const reducedVerticalSpacing = (iconSize + DEFAULT_LABEL_HEIGHT) * 0.6;
    return {
      x: padding + staggerOffset,
      y: padding + 20 + index * reducedVerticalSpacing,
    };
  }
}

/**
 * Compute size for group nodes
 * If size is not explicitly set, calculate minimum bounding box from children
 */
function computeGroupSize(node: ComputedNode): void {
  // If explicit size is provided, use it
  if (node.size) {
    node.computedWidth = node.size[0];
    node.computedHeight = node.size[1];
    return;
  }

  // Calculate minimum bounding box from children
  const children = node.children as ComputedNode[] | undefined;
  if (!children || children.length === 0) {
    // No children, use default size
    const padding = DEFAULT_GROUP_PADDING * 2;
    node.computedWidth = DEFAULT_ICON_SIZE + padding;
    node.computedHeight = DEFAULT_ICON_SIZE + DEFAULT_LABEL_HEIGHT + padding + 30;
    return;
  }

  // Find bounding box of all children (relative positions)
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const child of children) {
    const childX = child.computedX;
    const childY = child.computedY;
    const childW = child.computedWidth || DEFAULT_ICON_SIZE;
    const childH = child.computedHeight || DEFAULT_ICON_SIZE + DEFAULT_LABEL_HEIGHT;

    minX = Math.min(minX, childX);
    minY = Math.min(minY, childY);
    maxX = Math.max(maxX, childX + childW);
    maxY = Math.max(maxY, childY + childH);
  }

  // Adjust children positions to minimize group size
  // Offset children so minimum position starts at padding
  const padding = DEFAULT_GROUP_PADDING;
  const offsetX = minX - padding;
  const offsetY = minY - padding;

  if (offsetX !== 0 || offsetY !== 0) {
    for (const child of children) {
      child.computedX -= offsetX;
      child.computedY -= offsetY;
    }
    // Update maxX/maxY after offset
    maxX -= offsetX;
    maxY -= offsetY;
  }

  node.computedWidth = maxX + padding;
  node.computedHeight = maxY + padding;
}

/**
 * Compute size for composite nodes
 */
function computeCompositeSize(node: ComputedNode): void {
  if (node.size) {
    node.computedWidth = node.size[0];
    node.computedHeight = node.size[1];
    return;
  }

  const iconCount = node.icons?.length || 0;
  const padding = 20;
  const spacing = 10;
  const iconSize = 40;

  if (node.layout === 'vertical') {
    node.computedWidth = iconSize + padding * 2;
    node.computedHeight = padding * 2 + iconCount * (iconSize + spacing) + DEFAULT_LABEL_HEIGHT;
  } else {
    node.computedWidth = padding * 2 + iconCount * (iconSize + spacing);
    node.computedHeight = iconSize + padding * 2 + DEFAULT_LABEL_HEIGHT;
  }
}

/**
 * Compute size for text box nodes
 */
function computeTextBoxSize(node: ComputedNode): void {
  if (node.size) {
    node.computedWidth = node.size[0];
    node.computedHeight = node.size[1];
    return;
  }

  // Estimate based on label length
  const labelLength = (node.label?.length || 0) * 8;
  node.computedWidth = Math.max(60, labelLength + 20);
  node.computedHeight = node.sublabel ? 50 : 30;
}

/**
 * Get node center point for connection routing
 */
export function getNodeCenter(node: ComputedNode): { x: number; y: number } {
  return {
    x: node.computedX + node.computedWidth / 2,
    y: node.computedY + node.computedHeight / 2,
  };
}

/**
 * Get connection anchor points for a node
 */
export function getNodeAnchors(node: ComputedNode): {
  top: { x: number; y: number };
  bottom: { x: number; y: number };
  left: { x: number; y: number };
  right: { x: number; y: number };
} {
  const centerX = node.computedX + node.computedWidth / 2;
  const centerY = node.computedY + node.computedHeight / 2;

  return {
    top: { x: centerX, y: node.computedY },
    bottom: { x: centerX, y: node.computedY + node.computedHeight },
    left: { x: node.computedX, y: centerY },
    right: { x: node.computedX + node.computedWidth, y: centerY },
  };
}
