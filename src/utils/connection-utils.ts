/**
 * Connection routing utility functions
 * Extracted from Renderer.ts for better organization
 */

import type { Connection, ConnectionSortStrategy, ComputedNode } from '../core/types';
import type {
  ReservedVerticalLines,
  ReservedHorizontalLines,
  ConnectionAnchorInfo,
  LayoutType,
} from '../layout/connections';
import { determineAnchorSide } from '../layout/connections';

/**
 * Detect bidirectional connections (A→B and B→A pairs)
 * Returns a Map where key is the first connection and value is its reverse
 */
export function detectBidirectionalConnections(
  connections: Connection[]
): Map<Connection, Connection> {
  const result = new Map<Connection, Connection>();
  const processed = new Set<Connection>();

  for (const conn of connections) {
    if (processed.has(conn)) continue;

    // Find reverse connection (B→A for A→B)
    const reverse = connections.find(
      (c) => c !== conn && c.from === conn.to && c.to === conn.from && !processed.has(c)
    );

    if (reverse) {
      result.set(conn, reverse);
      processed.add(conn);
      processed.add(reverse);
    }
  }

  return result;
}

/**
 * Sort connections based on the specified strategy
 */
export function sortConnectionsByStrategy(
  connections: Connection[],
  strategy: ConnectionSortStrategy,
  nodeMap: Map<string, ComputedNode>
): Connection[] {
  const sorted = [...connections];

  switch (strategy) {
    case 'original':
      // No sorting, keep original order
      return sorted;

    case 'vertical_length_desc':
      // Sort by vertical distance (longest first)
      return sorted.sort((a, b) => {
        const fromA = nodeMap.get(a.from);
        const toA = nodeMap.get(a.to);
        const fromB = nodeMap.get(b.from);
        const toB = nodeMap.get(b.to);
        if (!fromA || !toA || !fromB || !toB) return 0;

        const lengthA = Math.abs(toA.computedY - fromA.computedY);
        const lengthB = Math.abs(toB.computedY - fromB.computedY);
        return lengthB - lengthA;
      });

    case 'vertical_length_asc':
      // Sort by vertical distance (shortest first)
      return sorted.sort((a, b) => {
        const fromA = nodeMap.get(a.from);
        const toA = nodeMap.get(a.to);
        const fromB = nodeMap.get(b.from);
        const toB = nodeMap.get(b.to);
        if (!fromA || !toA || !fromB || !toB) return 0;

        const lengthA = Math.abs(toA.computedY - fromA.computedY);
        const lengthB = Math.abs(toB.computedY - fromB.computedY);
        return lengthA - lengthB;
      });

    case 'target_y_asc':
      // Sort by target Y coordinate (top to bottom)
      return sorted.sort((a, b) => {
        const toA = nodeMap.get(a.to);
        const toB = nodeMap.get(b.to);
        if (!toA || !toB) return 0;
        return toA.computedY - toB.computedY;
      });

    case 'target_y_desc':
      // Sort by target Y coordinate (bottom to top)
      return sorted.sort((a, b) => {
        const toA = nodeMap.get(a.to);
        const toB = nodeMap.get(b.to);
        if (!toA || !toB) return 0;
        return toB.computedY - toA.computedY;
      });

    case 'source_x_asc':
      // Sort by source X coordinate (left to right)
      return sorted.sort((a, b) => {
        const fromA = nodeMap.get(a.from);
        const fromB = nodeMap.get(b.from);
        if (!fromA || !fromB) return 0;
        return fromA.computedX - fromB.computedX;
      });

    case 'source_x_desc':
      // Sort by source X coordinate (right to left)
      return sorted.sort((a, b) => {
        const fromA = nodeMap.get(a.from);
        const fromB = nodeMap.get(b.from);
        if (!fromA || !fromB) return 0;
        return fromB.computedX - fromA.computedX;
      });

    case 'bounding_box_aware':
      // Sort based on bounding box shape:
      // - If bounding box is horizontally long (width > height), prioritize left X (source_x_asc)
      // - If bounding box is vertically long (height > width), prioritize top Y (target_y_asc)
      return sorted.sort((a, b) => {
        const fromA = nodeMap.get(a.from);
        const toA = nodeMap.get(a.to);
        const fromB = nodeMap.get(b.from);
        const toB = nodeMap.get(b.to);
        if (!fromA || !toA || !fromB || !toB) return 0;

        // Calculate bounding box for each connection
        const bboxA = {
          width: Math.abs(toA.computedX - fromA.computedX),
          height: Math.abs(toA.computedY - fromA.computedY),
        };
        const bboxB = {
          width: Math.abs(toB.computedX - fromB.computedX),
          height: Math.abs(toB.computedY - fromB.computedY),
        };

        // Determine primary axis for each connection
        const isHorizontalA = bboxA.width > bboxA.height;
        const isHorizontalB = bboxB.width > bboxB.height;

        // If both have the same dominant direction, sort by that axis
        if (isHorizontalA && isHorizontalB) {
          // Both horizontal: sort by source X (left to right)
          return fromA.computedX - fromB.computedX;
        } else if (!isHorizontalA && !isHorizontalB) {
          // Both vertical: sort by target Y (top to bottom)
          return toA.computedY - toB.computedY;
        } else {
          // Different directions: horizontal connections first (they typically need more space)
          return isHorizontalA ? -1 : 1;
        }
      });

    default:
      return sorted;
  }
}

/**
 * Register node areas as reserved lines to prevent connections from passing through nodes
 * This is the highest priority reservation (registered before any connection routing)
 * Uses inscribed circle (内接円) for icon nodes to allow corner passages
 * Includes: icon nodes, text_box nodes (group and composite are skipped)
 */
export function registerIconAreaReservations(
  allNodes: ComputedNode[],
  reservedVerticalLines: ReservedVerticalLines,
  reservedHorizontalLines: ReservedHorizontalLines
): void {
  const iconMargin = 5;

  for (const node of allNodes) {
    const bounds = node.bounds;
    if (!bounds) continue;

    // グループとCompositeは予約をスキップ（子ノードが個別に予約するため）
    if (node.type === 'group' || node.type === 'composite') continue;

    // 内接円の半径を計算（幅と高さの小さい方の半分）
    const baseRadius = Math.min(bounds.width, bounds.height) / 2;
    // 予約領域は実際のマージンより1ピクセル内側にする
    const reserveRadius = baseRadius + iconMargin - 1;

    const cx = bounds.centerX;
    const cy = bounds.centerY;

    // 円に外接する正方形の4辺を予約
    const left = cx - reserveRadius;
    const right = cx + reserveRadius;
    const top = cy - reserveRadius;
    const bottom = cy + reserveRadius;

    // Register left and right edges as vertical lines (prevent horizontal crossing)
    reservedVerticalLines.push({ x: left, yMin: top, yMax: bottom });
    reservedVerticalLines.push({ x: right, yMin: top, yMax: bottom });

    // Register top and bottom edges as horizontal lines (prevent vertical crossing)
    reservedHorizontalLines.push({ y: top, xMin: left, xMax: right });
    reservedHorizontalLines.push({ y: bottom, xMin: left, xMax: right });
  }
}

/**
 * Get sibling nodes and parent group bounds for a node
 * Used for cross-group connection routing
 */
export function getSiblingNodesAndParentBounds(
  node: ComputedNode,
  nodeMap: Map<string, ComputedNode>
): {
  siblingNodes: ComputedNode[];
  parentGroupBounds: { top: number; bottom: number; left: number; right: number } | undefined;
} {
  if (!node.parentId) {
    return { siblingNodes: [], parentGroupBounds: undefined };
  }

  const parentGroup = nodeMap.get(node.parentId);
  if (!parentGroup) {
    return { siblingNodes: [], parentGroupBounds: undefined };
  }

  // 兄弟ノードを取得（同じ親を持つノード）
  const siblingNodes: ComputedNode[] = [];
  for (const [, n] of nodeMap) {
    if (n.parentId === node.parentId && n.id !== node.id) {
      siblingNodes.push(n);
    }
  }

  // 親グループの境界を取得
  const parentGroupBounds = {
    top: parentGroup.computedY,
    bottom: parentGroup.computedY + parentGroup.computedHeight,
    left: parentGroup.computedX,
    right: parentGroup.computedX + parentGroup.computedWidth,
  };

  return { siblingNodes, parentGroupBounds };
}

/**
 * Calculate anchor distribution for all connections
 * Returns a map of connection index -> anchor info
 */
export function calculateAnchorDistribution(
  connections: Connection[],
  nodeMap: Map<string, ComputedNode>,
  layout: LayoutType = 'portrait'
): Map<number, ConnectionAnchorInfo> {
  const result = new Map<number, ConnectionAnchorInfo>();
  if (!connections || connections.length === 0) return result;

  // 統合アンカーポイント管理: 同じノードの同じ側への全接続（入り・出り両方）を一緒に管理
  // Key format: "nodeId:side" -> list of { index, isFrom, otherNodePos }
  type AnchorEntry = { index: number; isFrom: boolean; otherNodeX: number; otherNodeY: number };
  const nodeSideAnchors = new Map<string, AnchorEntry[]>();

  // First pass: determine sides and register all anchor points
  connections.forEach((conn, index) => {
    const fromNode = nodeMap.get(conn.from);
    const toNode = nodeMap.get(conn.to);
    if (!fromNode || !toNode) return;

    // 兄弟ノードと親グループ境界を取得（グループ内ノードの場合）
    const { siblingNodes, parentGroupBounds } = getSiblingNodesAndParentBounds(fromNode, nodeMap);

    // 明示的な指定を優先、なければ自動決定（レイアウト優先度を適用）
    const autoSides = determineAnchorSide(fromNode, toNode, siblingNodes, parentGroupBounds, layout);
    const fromSide = conn.fromSide || autoSides.fromSide;
    const toSide = conn.toSide || autoSides.toSide;

    // fromノードの接続点を登録
    const fromKey = `${conn.from}:${fromSide}`;
    if (!nodeSideAnchors.has(fromKey)) {
      nodeSideAnchors.set(fromKey, []);
    }
    nodeSideAnchors.get(fromKey)!.push({
      index,
      isFrom: true,
      otherNodeX: toNode.computedX,
      otherNodeY: toNode.computedY,
    });

    // toノードの接続点を登録
    const toKey = `${conn.to}:${toSide}`;
    if (!nodeSideAnchors.has(toKey)) {
      nodeSideAnchors.set(toKey, []);
    }
    nodeSideAnchors.get(toKey)!.push({
      index,
      isFrom: false,
      otherNodeX: fromNode.computedX,
      otherNodeY: fromNode.computedY,
    });
  });

  // Sort all anchors on each side by the other node's position
  // For bottom/top sides: sort by other node's X position (left to right)
  // For left/right sides: sort by other node's Y position (top to bottom)
  for (const [key, entries] of nodeSideAnchors) {
    const side = key.split(':')[1];
    entries.sort((a, b) => {
      if (side === 'bottom' || side === 'top') {
        return a.otherNodeX - b.otherNodeX;
      } else {
        return a.otherNodeY - b.otherNodeY;
      }
    });
  }

  // Second pass: build anchor info for each connection
  connections.forEach((conn, index) => {
    const fromNode = nodeMap.get(conn.from);
    const toNode = nodeMap.get(conn.to);
    if (!fromNode || !toNode) return;

    // 兄弟ノードと親グループ境界を取得（グループ内ノードの場合）
    const { siblingNodes, parentGroupBounds } = getSiblingNodesAndParentBounds(fromNode, nodeMap);

    // 明示的な指定を優先、なければ自動決定（レイアウト優先度を適用）
    const autoSides = determineAnchorSide(fromNode, toNode, siblingNodes, parentGroupBounds, layout);
    const fromSide = conn.fromSide || autoSides.fromSide;
    const toSide = conn.toSide || autoSides.toSide;

    const fromKey = `${conn.from}:${fromSide}`;
    const toKey = `${conn.to}:${toSide}`;

    const fromAnchors = nodeSideAnchors.get(fromKey)!;
    const toAnchors = nodeSideAnchors.get(toKey)!;

    // この接続のfrom側のインデックスを統合リストから取得
    const fromEntryIndex = fromAnchors.findIndex((e) => e.index === index && e.isFrom);
    // この接続のto側のインデックスを統合リストから取得
    const toEntryIndex = toAnchors.findIndex((e) => e.index === index && !e.isFrom);

    result.set(index, {
      fromSide,
      toSide,
      fromIndex: fromEntryIndex,
      fromTotal: fromAnchors.length,
      toIndex: toEntryIndex,
      toTotal: toAnchors.length,
    });
  });

  return result;
}
