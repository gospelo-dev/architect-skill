/**
 * Auto-layout for diagrams without explicit positions
 * Supports both landscape (left-to-right) and portrait (top-to-bottom) layouts
 *
 * Algorithm:
 * 1. Build connection graph from connections
 * 2. Assign layers using BFS from root nodes (nodes with no incoming edges)
 * 3. Position nodes within each layer based on layout direction
 */

import type { ComputedNode, Connection, DiagramLayout } from '../core/types';

// Layout constants
const DEFAULT_SPACING_X = 160;  // Horizontal spacing between nodes
const DEFAULT_SPACING_Y = 160;  // Vertical spacing between nodes
const DEFAULT_START_X = 100;    // Starting X offset
const DEFAULT_START_Y = 100;    // Starting Y offset

/**
 * Options for auto-layout
 */
export interface AutoLayoutOptions {
  layout: DiagramLayout;
  spacing?: { x: number; y: number };
  startOffset?: { x: number; y: number };
  viewportWidth?: number;  // For horizontal centering in portrait mode
}

/**
 * Graph representation for layout calculation
 */
interface NodeGraph {
  inDegree: Map<string, number>;    // Number of incoming edges
  outEdges: Map<string, string[]>;  // Outgoing edge targets
  inEdges: Map<string, string[]>;   // Incoming edge sources
}

/**
 * Check if any top-level node needs auto-layout (has no position)
 */
export function needsAutoLayout(nodes: ComputedNode[]): boolean {
  return nodes.some(node => !node.position && node.computedX === 0 && node.computedY === 0);
}

/**
 * Build a graph from connections
 */
function buildGraph(nodeIds: Set<string>, connections: Connection[]): NodeGraph {
  const inDegree = new Map<string, number>();
  const outEdges = new Map<string, string[]>();
  const inEdges = new Map<string, string[]>();

  // Initialize all nodes
  for (const id of nodeIds) {
    inDegree.set(id, 0);
    outEdges.set(id, []);
    inEdges.set(id, []);
  }

  // Build edges from connections
  for (const conn of connections) {
    if (!nodeIds.has(conn.from) || !nodeIds.has(conn.to)) continue;

    // Add edge from -> to
    outEdges.get(conn.from)!.push(conn.to);
    inEdges.get(conn.to)!.push(conn.from);
    inDegree.set(conn.to, (inDegree.get(conn.to) || 0) + 1);
  }

  return { inDegree, outEdges, inEdges };
}

/**
 * Assign layers to nodes using BFS from root nodes
 * Root nodes are those with no incoming edges
 * Each node's layer is the maximum depth from any root
 */
function assignLayers(nodeIds: Set<string>, graph: NodeGraph): Map<string, number> {
  const layers = new Map<string, number>();
  const queue: string[] = [];

  // Find root nodes (no incoming edges)
  for (const id of nodeIds) {
    if (graph.inDegree.get(id) === 0) {
      layers.set(id, 0);
      queue.push(id);
    }
  }

  // If no root nodes found (cyclic graph), start from the first node
  if (queue.length === 0 && nodeIds.size > 0) {
    const firstId = nodeIds.values().next().value as string;
    if (firstId) {
      layers.set(firstId, 0);
      queue.push(firstId);
    }
  }

  // BFS to assign layers
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const currentLayer = layers.get(nodeId)!;

    for (const targetId of graph.outEdges.get(nodeId) || []) {
      const newLayer = currentLayer + 1;
      const existingLayer = layers.get(targetId);

      // Use the maximum layer (longest path from root)
      if (existingLayer === undefined || newLayer > existingLayer) {
        layers.set(targetId, newLayer);
        queue.push(targetId);
      }
    }
  }

  // Handle any unassigned nodes (disconnected from main graph)
  let maxLayer = 0;
  for (const layer of layers.values()) {
    maxLayer = Math.max(maxLayer, layer);
  }
  for (const id of nodeIds) {
    if (!layers.has(id)) {
      layers.set(id, maxLayer + 1);
    }
  }

  return layers;
}

/**
 * Group nodes by their layer
 */
function groupByLayer(nodes: ComputedNode[], layers: Map<string, number>): Map<number, ComputedNode[]> {
  const layerGroups = new Map<number, ComputedNode[]>();

  for (const node of nodes) {
    const layer = layers.get(node.id) ?? 0;
    if (!layerGroups.has(layer)) {
      layerGroups.set(layer, []);
    }
    layerGroups.get(layer)!.push(node);
  }

  return layerGroups;
}

/**
 * Sort nodes within a layer based on their connections
 * Tries to minimize edge crossings by ordering nodes according to connected nodes' positions
 */
function sortNodesInLayer(
  nodes: ComputedNode[],
  graph: NodeGraph,
  layers: Map<string, number>,
  currentLayer: number,
  positionedNodes: Map<string, { x: number; y: number }>
): ComputedNode[] {
  if (nodes.length <= 1) return nodes;

  // Calculate average position of connected nodes in previous layer
  const scores = nodes.map(node => {
    const inEdges = graph.inEdges.get(node.id) || [];
    let totalPos = 0;
    let count = 0;

    for (const sourceId of inEdges) {
      const sourcePos = positionedNodes.get(sourceId);
      if (sourcePos) {
        totalPos += sourcePos.x + sourcePos.y;  // Use both coordinates
        count++;
      }
    }

    return {
      node,
      score: count > 0 ? totalPos / count : Infinity,
    };
  });

  scores.sort((a, b) => a.score - b.score);
  return scores.map(s => s.node);
}

/**
 * Apply auto-layout to nodes without explicit positions
 */
export function applyAutoLayout(
  nodes: ComputedNode[],
  connections: Connection[],
  options: AutoLayoutOptions
): void {
  const {
    layout,
    spacing = { x: DEFAULT_SPACING_X, y: DEFAULT_SPACING_Y },
    startOffset = { x: DEFAULT_START_X, y: DEFAULT_START_Y },
    viewportWidth,
  } = options;

  // Filter nodes that need positioning (no explicit position)
  const nodesToPosition = nodes.filter(
    node => !node.position && node.computedX === 0 && node.computedY === 0
  );

  if (nodesToPosition.length === 0) return;

  // Build node ID set
  const nodeIds = new Set(nodesToPosition.map(n => n.id));

  // Build connection graph
  const graph = buildGraph(nodeIds, connections);

  // Assign layers
  const layers = assignLayers(nodeIds, graph);

  // Group nodes by layer
  const layerGroups = groupByLayer(nodesToPosition, layers);

  // Get sorted layer indices
  const layerIndices = Array.from(layerGroups.keys()).sort((a, b) => a - b);

  // Track positioned nodes for sorting optimization
  const positionedNodes = new Map<string, { x: number; y: number }>();

  // Position nodes layer by layer
  for (const layerIndex of layerIndices) {
    const layerNodes = layerGroups.get(layerIndex)!;

    // Sort nodes within layer to minimize crossings
    const sortedNodes = sortNodesInLayer(
      layerNodes,
      graph,
      layers,
      layerIndex,
      positionedNodes
    );

    // Calculate center offset for this layer
    const layerSize = sortedNodes.length;
    const centerOffset = (layerSize - 1) / 2;

    sortedNodes.forEach((node, nodeIndex) => {
      if (layout === 'portrait') {
        // Portrait: layers go top-to-bottom (Y), nodes spread from center horizontally (X)
        node.computedY = startOffset.y + layerIndex * spacing.y;
        // Center position based on viewport width, spread nodes from center
        const centerX = viewportWidth ? viewportWidth / 2 : startOffset.x;
        node.computedX = centerX + (nodeIndex - centerOffset) * spacing.x - node.computedWidth / 2;
      } else {
        // Landscape: layers go left-to-right (X), nodes spread top-to-bottom (Y)
        node.computedX = startOffset.x + layerIndex * spacing.x;
        node.computedY = startOffset.y + (nodeIndex - centerOffset + centerOffset) * spacing.y;
      }

      positionedNodes.set(node.id, { x: node.computedX, y: node.computedY });
    });
  }
}
