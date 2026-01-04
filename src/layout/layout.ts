/**
 * Layout calculation for diagram nodes
 * Computes positions and sizes for nodes without explicit positions
 */

import { Node, DiagramDefinition, ComputedNode, LayoutDirection, ResourceMap } from '../core/types';

// Layout constants
const DEFAULT_ICON_SIZE = 48;
const DEFAULT_GROUP_PADDING = 20;
const DEFAULT_SPACING = 30;
const DEFAULT_LABEL_HEIGHT = 80; // 6 lines max (13px per line)

/**
 * Compute layout for all nodes in the diagram
 * Resolves icon from resources if not specified on node
 * Validates that each resource ID is used only once
 */
export function computeLayout(diagram: DiagramDefinition): ComputedNode[] {
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

  return diagram.nodes.map((node, index) => computeNodeLayout(node, index, null, resources));
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
    // Calculate position relative to parent
    const offset = calculateChildOffset(index, parent, node.layout || 'horizontal');
    computed.computedX = offset.x;
    computed.computedY = offset.y;
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

  // Process children recursively
  if (node.children && node.children.length > 0) {
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
    return {
      x: padding,
      y: padding + 20 + index * (iconSize + DEFAULT_LABEL_HEIGHT + spacing),
    };
  }
}

/**
 * Compute size for group nodes
 */
function computeGroupSize(node: ComputedNode): void {
  if (node.size) {
    node.computedWidth = node.size[0];
    node.computedHeight = node.size[1];
    return;
  }

  const childCount = node.children?.length || 0;
  const padding = DEFAULT_GROUP_PADDING * 2;
  const spacing = DEFAULT_SPACING;
  const iconSize = DEFAULT_ICON_SIZE;

  if (node.layout === 'vertical') {
    node.computedWidth = iconSize + padding + 20;
    node.computedHeight = padding + 30 + childCount * (iconSize + DEFAULT_LABEL_HEIGHT + spacing);
  } else {
    node.computedWidth = padding + childCount * (iconSize + spacing);
    node.computedHeight = iconSize + DEFAULT_LABEL_HEIGHT + padding + 30;
  }
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
