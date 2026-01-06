/**
 * Connection routing algorithms
 * Generates SVG path data for connections between nodes
 */

import { Connection, ConnectionStyle, ComputedNode, AnchorSide, BoundingBox } from '../core/types';

interface Point {
  x: number;
  y: number;
}

/**
 * コネクタータイプの定義
 * 出口辺と入口辺の組み合わせに基づいて最適なパス形状を決定
 */
export type ConnectorType =
  | 'straight'      // 直線: 同じ軸上で対向 (right→left, bottom→top)
  | 'L_horizontal'  // L字: 水平→垂直 (right→top, right→bottom, left→top, left→bottom)
  | 'L_vertical'    // L字: 垂直→水平 (top→left, top→right, bottom→left, bottom→right)
  | 'Z_horizontal'  // Z字: 水平-垂直-水平 (right→left で高さが異なる)
  | 'Z_vertical'    // Z字: 垂直-水平-垂直 (bottom→top で横位置が異なる)
  | 'U_horizontal'  // U字: 水平迂回 (right→right, left→left)
  | 'U_vertical';   // U字: 垂直迂回 (top→top, bottom→bottom)

/**
 * 出口辺と入口辺の組み合わせからコネクタータイプを決定
 */
export function determineConnectorType(
  fromSide: AnchorSide,
  toSide: AnchorSide,
  from: Point,
  to: Point
): ConnectorType {
  // 対向する辺の組み合わせ
  const opposites: Record<AnchorSide, AnchorSide> = {
    'left': 'right',
    'right': 'left',
    'top': 'bottom',
    'bottom': 'top',
  };

  // 同じ辺の場合: U字型
  if (fromSide === toSide) {
    if (fromSide === 'left' || fromSide === 'right') {
      return 'U_horizontal';
    } else {
      return 'U_vertical';
    }
  }

  // 対向する辺の場合
  if (opposites[fromSide] === toSide) {
    // 水平方向の対向 (right→left または left→right)
    if ((fromSide === 'right' && toSide === 'left') ||
        (fromSide === 'left' && toSide === 'right')) {
      // ほぼ同じ高さなら直線、そうでなければZ字
      if (Math.abs(from.y - to.y) < 10) {
        return 'straight';
      }
      return 'Z_horizontal';
    }
    // 垂直方向の対向 (bottom→top または top→bottom)
    if ((fromSide === 'bottom' && toSide === 'top') ||
        (fromSide === 'top' && toSide === 'bottom')) {
      // ほぼ同じ横位置なら直線、そうでなければZ字
      if (Math.abs(from.x - to.x) < 10) {
        return 'straight';
      }
      return 'Z_vertical';
    }
  }

  // 隣接する辺の場合: L字型
  if (fromSide === 'right' || fromSide === 'left') {
    return 'L_horizontal';
  } else {
    return 'L_vertical';
  }
}

/**
 * 接続のアンカー情報
 */
export interface ConnectionAnchorInfo {
  fromSide: AnchorSide;
  toSide: AnchorSide;
  fromIndex: number;  // この辺における順番 (0-based)
  fromTotal: number;  // この辺から出る接続の総数
  toIndex: number;    // この辺における順番 (0-based)
  toTotal: number;    // この辺に入る接続の総数
}

/**
 * 予約済み縦線: X座標とY区間のペア
 * 同じX座標でもY区間が重ならなければ同じ座標を使用可能
 */
export interface ReservedVerticalLine {
  x: number;
  yMin: number;
  yMax: number;
}
export type ReservedVerticalLines = ReservedVerticalLine[];

/**
 * 予約済み水平線: Y座標とX区間のペア
 * 同じY座標でもX区間が重ならなければ同じ座標を使用可能
 */
export interface ReservedHorizontalLine {
  y: number;
  xMin: number;
  xMax: number;
}
export type ReservedHorizontalLines = ReservedHorizontalLine[];

/**
 * 縦線が既存の予約と重なるかチェック
 */
function isVerticalLineConflict(
  x: number,
  yMin: number,
  yMax: number,
  reserved: ReservedVerticalLines
): boolean {
  const TOLERANCE = 5; // 同じX座標とみなす許容範囲
  for (const line of reserved) {
    if (Math.abs(line.x - x) < TOLERANCE) {
      // X座標が近い場合、Y区間の重なりをチェック
      if (!(yMax < line.yMin || yMin > line.yMax)) {
        return true; // 重なりあり
      }
    }
  }
  return false;
}

/**
 * 水平線が既存の予約と重なるかチェック
 */
function isHorizontalLineConflict(
  y: number,
  xMin: number,
  xMax: number,
  reserved: ReservedHorizontalLines
): boolean {
  const TOLERANCE = 5; // 同じY座標とみなす許容範囲
  for (const line of reserved) {
    if (Math.abs(line.y - y) < TOLERANCE) {
      // Y座標が近い場合、X区間の重なりをチェック
      if (!(xMax < line.xMin || xMin > line.xMax)) {
        return true; // 重なりあり
      }
    }
  }
  return false;
}

/**
 * 接続処理順序のソート戦略
 */
export type ConnectionSortStrategy =
  | 'original'           // JSON定義順
  | 'vertical_length_desc'  // 縦線の長さが長い順
  | 'vertical_length_asc'   // 縦線の長さが短い順
  | 'target_y_asc'          // 目的地のY座標が小さい順（上から下）
  | 'target_y_desc';        // 目的地のY座標が大きい順（下から上）

/**
 * SVGパスの総長を計算する
 * M x y L x y L x y ... 形式のパスを解析
 */
export function calculatePathLength(path: string): number {
  const coords = path.match(/[\d.]+/g);
  if (!coords || coords.length < 4) return 0;

  let totalLength = 0;
  for (let i = 2; i < coords.length; i += 2) {
    const x1 = parseFloat(coords[i - 2]);
    const y1 = parseFloat(coords[i - 1]);
    const x2 = parseFloat(coords[i]);
    const y2 = parseFloat(coords[i + 1]);
    totalLength += Math.abs(x2 - x1) + Math.abs(y2 - y1); // マンハッタン距離
  }
  return totalLength;
}

/**
 * Generate SVG path for a connection with distributed anchor points
 * @param connection - The connection definition
 * @param fromNode - Source node
 * @param toNode - Target node
 * @param anchorInfo - Anchor distribution information
 * @param allNodes - All nodes for obstacle avoidance
 * @param minY - Minimum Y coordinate for connection paths (to avoid title/subtitle overlap)
 * @param reservedVerticalLines - Set of reserved vertical line X coordinates (mutated to add used lines)
 * @param reservedHorizontalLines - Set of reserved horizontal line Y coordinates (mutated to add used lines)
 */
export function generateConnectionPath(
  connection: Connection,
  fromNode: ComputedNode,
  toNode: ComputedNode,
  anchorInfo?: ConnectionAnchorInfo,
  allNodes?: ComputedNode[],
  minY?: number,
  reservedVerticalLines?: ReservedVerticalLines,
  reservedHorizontalLines?: ReservedHorizontalLines
): string {
  const style = connection.style || 'orthogonal';

  // Determine best anchor points
  const { from, to } = selectAnchors(fromNode, toNode, anchorInfo);

  if (style === 'curved') {
    return generateCurvedPath(from, to);
  } else {
    // アンカー情報がある場合は辺情報も渡す
    const fromSide = anchorInfo?.fromSide;
    const toSide = anchorInfo?.toSide;
    // 接続元・先以外のノードを除外リストとして渡す
    const obstacles = allNodes?.filter(n => n.id !== fromNode.id && n.id !== toNode.id);
    return generateOrthogonalPath(from, to, fromSide, toSide, obstacles, anchorInfo, minY, reservedVerticalLines, reservedHorizontalLines);
  }
}

// アイコンノードのデフォルトサイズ（ラベルを除く）- フォールバック用
const ICON_SIZE = 48;

/**
 * Get the bounding box for connection anchors
 * 事前計算されたboundsがあればそれを使用、なければフォールバック
 */
function getNodeBounds(node: ComputedNode): BoundingBox {
  // 事前計算されたboundsがあればそれを使用
  if (node.bounds) {
    return node.bounds;
  }

  // フォールバック: 従来のロジック
  const isIconNode = !node.type || node.type === 'icon';
  const width = isIconNode ? ICON_SIZE : node.computedWidth;
  const height = isIconNode ? ICON_SIZE : node.computedHeight;

  return {
    left: node.computedX,
    top: node.computedY,
    right: node.computedX + width,
    bottom: node.computedY + height,
    centerX: node.computedX + width / 2,
    centerY: node.computedY + height / 2,
    width,
    height,
  };
}

/**
 * Calculate actual orthogonal path length for a given anchor combination
 * Considers the connector type and actual path geometry
 */
function calculateActualPathLength(
  from: Point,
  to: Point,
  fromSide: AnchorSide,
  toSide: AnchorSide
): number {
  // Determine connector type
  const connectorType = determineConnectorType(fromSide, toSide, from, to);

  switch (connectorType) {
    case 'straight':
      // Direct line (either horizontal or vertical)
      return Math.abs(to.x - from.x) + Math.abs(to.y - from.y);

    case 'L_horizontal':
    case 'L_vertical':
      // L-shape: horizontal + vertical or vice versa
      return Math.abs(to.x - from.x) + Math.abs(to.y - from.y);

    case 'Z_horizontal': {
      // Z-shape: horizontal-vertical-horizontal
      // Path: from → midX → to
      const midX = (from.x + to.x) / 2;
      return Math.abs(midX - from.x) + Math.abs(to.y - from.y) + Math.abs(to.x - midX);
    }

    case 'Z_vertical': {
      // Z-shape: vertical-horizontal-vertical
      // Path: from → midY → to
      const midY = (from.y + to.y) / 2;
      return Math.abs(midY - from.y) + Math.abs(to.x - from.x) + Math.abs(to.y - midY);
    }

    case 'U_horizontal': {
      // U-shape: horizontal detour
      const detourX = fromSide === 'right'
        ? Math.max(from.x, to.x) + 40
        : Math.min(from.x, to.x) - 40;
      return Math.abs(detourX - from.x) + Math.abs(to.y - from.y) + Math.abs(to.x - detourX);
    }

    case 'U_vertical': {
      // U-shape: vertical detour
      const detourY = fromSide === 'bottom'
        ? Math.max(from.y, to.y) + 40
        : Math.min(from.y, to.y) - 40;
      return Math.abs(detourY - from.y) + Math.abs(to.x - from.x) + Math.abs(to.y - detourY);
    }

    default:
      return Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
  }
}

/**
 * Determine which side a connection should use for a node
 * Calculates actual path length for all valid combinations and selects the shortest
 */
export function determineAnchorSide(
  fromNode: ComputedNode,
  toNode: ComputedNode,
  siblingNodes?: ComputedNode[],
  parentGroupBounds?: { top: number; bottom: number; left: number; right: number }
): { fromSide: AnchorSide; toSide: AnchorSide } {
  const fromBounds = getNodeBounds(fromNode);
  const toBounds = getNodeBounds(toNode);

  // グループ内ノードからグループ外ノードへの接続の場合、
  // 親グループの境界を考慮して最短でグループを出るルートを選択
  if (parentGroupBounds && siblingNodes && siblingNodes.length > 0) {
    // toNodeがグループ外にある場合（toNodeの中心が親グループ外）
    const toCenter = { x: toBounds.centerX, y: toBounds.centerY };
    const isToOutside =
      toCenter.x < parentGroupBounds.left ||
      toCenter.x > parentGroupBounds.right ||
      toCenter.y < parentGroupBounds.top ||
      toCenter.y > parentGroupBounds.bottom;

    if (isToOutside) {
      // グループの各辺までの距離を計算し、兄弟ノードを避ける最短ルートを選択
      return determineCrossGroupAnchorSide(fromNode, toNode, fromBounds, toBounds, siblingNodes, parentGroupBounds);
    }
  }

  type AnchorOption = {
    fromSide: AnchorSide;
    toSide: AnchorSide;
    pathLength: number;
    penalty: number;
  };
  const options: AnchorOption[] = [];

  // All four sides
  const sides: AnchorSide[] = ['top', 'bottom', 'left', 'right'];

  // Calculate anchor positions
  const fromAnchors: Record<AnchorSide, Point> = {
    top: { x: fromBounds.centerX, y: fromBounds.top },
    bottom: { x: fromBounds.centerX, y: fromBounds.bottom },
    left: { x: fromBounds.left, y: fromBounds.centerY },
    right: { x: fromBounds.right, y: fromBounds.centerY },
  };

  const toAnchors: Record<AnchorSide, Point> = {
    top: { x: toBounds.centerX, y: toBounds.top },
    bottom: { x: toBounds.centerX, y: toBounds.bottom },
    left: { x: toBounds.left, y: toBounds.centerY },
    right: { x: toBounds.right, y: toBounds.centerY },
  };

  // Direction from source to target center
  const dx = toBounds.centerX - fromBounds.centerX;
  const dy = toBounds.centerY - fromBounds.centerY;

  // Test all 16 combinations (4 from × 4 to)
  for (const fromSide of sides) {
    for (const toSide of sides) {
      const from = fromAnchors[fromSide];
      const to = toAnchors[toSide];

      // Calculate actual path length based on connector type
      const pathLength = calculateActualPathLength(from, to, fromSide, toSide);

      // Apply penalties for unnatural directions
      let penalty = 0;

      // Heavy penalty for U-shape paths (exiting and entering from same direction)
      // These paths go around the target node unnecessarily
      if (fromSide === toSide) {
        penalty += 500;
      }

      // Penalty for exiting opposite to target direction (causes U-shape or long detour)
      if (fromSide === 'left' && dx > 0) penalty += 200;
      if (fromSide === 'right' && dx < 0) penalty += 200;
      if (fromSide === 'top' && dy > 0) penalty += 200;
      if (fromSide === 'bottom' && dy < 0) penalty += 200;

      // Penalty for entering from the wrong side
      if (toSide === 'right' && dx > 0) penalty += 100;
      if (toSide === 'left' && dx < 0) penalty += 100;
      if (toSide === 'bottom' && dy > 0) penalty += 100;
      if (toSide === 'top' && dy < 0) penalty += 100;

      // Bonus for straight-through paths (opposite sides aligned)
      // Give extra bonus when the path aligns with the dominant direction
      const isHorizontalDominant = Math.abs(dx) > Math.abs(dy);
      const isVerticalDominant = Math.abs(dy) > Math.abs(dx);

      if (fromSide === 'right' && toSide === 'left' && dx > 0) {
        penalty -= isHorizontalDominant ? 15 : 5; // Extra bonus for dominant direction
      }
      if (fromSide === 'left' && toSide === 'right' && dx < 0) {
        penalty -= isHorizontalDominant ? 15 : 5;
      }
      if (fromSide === 'bottom' && toSide === 'top' && dy > 0) {
        penalty -= isVerticalDominant ? 15 : 5;
      }
      if (fromSide === 'top' && toSide === 'bottom' && dy < 0) {
        penalty -= isVerticalDominant ? 15 : 5;
      }

      // Bonus for L-shape paths (simpler than Z-shape, only 1 bend)
      // But only when the target is close (within ~100px in the secondary direction)
      // For distant targets, prefer Z-shape (right→left or bottom→top) to avoid crossing other nodes
      const isLShape = (
        (fromSide === 'bottom' && (toSide === 'left' || toSide === 'right')) ||
        (fromSide === 'top' && (toSide === 'left' || toSide === 'right')) ||
        (fromSide === 'left' && (toSide === 'top' || toSide === 'bottom')) ||
        (fromSide === 'right' && (toSide === 'top' || toSide === 'bottom'))
      );
      if (isLShape) {
        // Only apply bonus if the L-shape goes in the natural direction
        // AND the target is relatively close (to avoid crossing intermediate nodes)
        const naturalL = (
          (fromSide === 'bottom' && dy > 0 && toSide === 'left' && dx > 0) ||
          (fromSide === 'bottom' && dy > 0 && toSide === 'right' && dx < 0) ||
          (fromSide === 'top' && dy < 0 && toSide === 'left' && dx > 0) ||
          (fromSide === 'top' && dy < 0 && toSide === 'right' && dx < 0) ||
          (fromSide === 'right' && dx > 0 && toSide === 'top' && dy < 0) ||
          (fromSide === 'right' && dx > 0 && toSide === 'bottom' && dy > 0) ||
          (fromSide === 'left' && dx < 0 && toSide === 'top' && dy < 0) ||
          (fromSide === 'left' && dx < 0 && toSide === 'bottom' && dy > 0)
        );
        // Only apply L-shape bonus for nearby targets (within ~150px in primary direction)
        const isNearby = Math.abs(dx) < 150 && Math.abs(dy) < 150;
        if (naturalL && isNearby) {
          penalty -= 10; // Prefer L-shape over Z-shape for nearby targets
        }
      }

      // Penalty for paths that would cross sibling nodes
      // (グループ内の兄弟間接続で中間ノードを避ける)
      if (siblingNodes && siblingNodes.length > 0) {
        for (const sibling of siblingNodes) {
          if (sibling.id === fromNode.id || sibling.id === toNode.id) continue;
          const sibBounds = getNodeBounds(sibling);

          // Check if sibling is between from and to nodes
          const sibCenterX = sibBounds.centerX;
          const sibCenterY = sibBounds.centerY;

          // For vertical paths (bottom→top or top→bottom)
          if ((fromSide === 'bottom' && toSide === 'top') || (fromSide === 'top' && toSide === 'bottom')) {
            // Check if sibling is vertically between the nodes
            const minY = Math.min(fromBounds.centerY, toBounds.centerY);
            const maxY = Math.max(fromBounds.centerY, toBounds.centerY);
            if (sibCenterY > minY && sibCenterY < maxY) {
              // And horizontally overlapping (would cross the vertical path)
              const pathX = (fromBounds.centerX + toBounds.centerX) / 2;
              if (Math.abs(sibCenterX - pathX) < (sibBounds.width / 2 + 20)) {
                penalty += 300; // Heavy penalty for crossing sibling
              }
            }
          }

          // For horizontal paths (left→right or right→left)
          if ((fromSide === 'right' && toSide === 'left') || (fromSide === 'left' && toSide === 'right')) {
            // Check if sibling is horizontally between the nodes
            const minX = Math.min(fromBounds.centerX, toBounds.centerX);
            const maxX = Math.max(fromBounds.centerX, toBounds.centerX);
            if (sibCenterX > minX && sibCenterX < maxX) {
              // And vertically overlapping (would cross the horizontal path)
              const pathY = (fromBounds.centerY + toBounds.centerY) / 2;
              if (Math.abs(sibCenterY - pathY) < (sibBounds.height / 2 + 20)) {
                penalty += 300; // Heavy penalty for crossing sibling
              }
            }
          }
        }
      }

      options.push({ fromSide, toSide, pathLength, penalty });
    }
  }

  // Sort by total score (path length + penalty)
  options.sort((a, b) => (a.pathLength + a.penalty) - (b.pathLength + b.penalty));

  return { fromSide: options[0].fromSide, toSide: options[0].toSide };
}

/**
 * グループ内ノードからグループ外ノードへの接続時、
 * 兄弟ノードを避けて親グループの境界から出る最短ルートを決定
 */
function determineCrossGroupAnchorSide(
  fromNode: ComputedNode,
  toNode: ComputedNode,
  fromBounds: ReturnType<typeof getNodeBounds>,
  toBounds: ReturnType<typeof getNodeBounds>,
  siblingNodes: ComputedNode[],
  parentGroupBounds: { top: number; bottom: number; left: number; right: number }
): { fromSide: AnchorSide; toSide: AnchorSide } {
  // 親グループの各辺からの最短距離を計算
  // 兄弟ノードがその方向にある場合はペナルティを追加

  const sides: AnchorSide[] = ['top', 'bottom', 'left', 'right'];
  const toCenter = { x: toBounds.centerX, y: toBounds.centerY };

  type RouteOption = {
    fromSide: AnchorSide;
    toSide: AnchorSide;
    score: number;
  };
  const routeOptions: RouteOption[] = [];

  for (const fromSide of sides) {
    // この方向に兄弟ノードがあるかチェック
    let hasSiblingInDirection = false;
    for (const sibling of siblingNodes) {
      if (sibling.id === fromNode.id) continue;
      const sibBounds = getNodeBounds(sibling);

      switch (fromSide) {
        case 'right':
          // 右方向に兄弟があるか（兄弟の左端がfromNodeの右端より右）
          if (sibBounds.left > fromBounds.right - 10 &&
              sibBounds.centerY > fromBounds.top && sibBounds.centerY < fromBounds.bottom) {
            hasSiblingInDirection = true;
          }
          break;
        case 'left':
          // 左方向に兄弟があるか
          if (sibBounds.right < fromBounds.left + 10 &&
              sibBounds.centerY > fromBounds.top && sibBounds.centerY < fromBounds.bottom) {
            hasSiblingInDirection = true;
          }
          break;
        case 'bottom':
          // 下方向に兄弟があるか
          if (sibBounds.top > fromBounds.bottom - 10 &&
              sibBounds.centerX > fromBounds.left && sibBounds.centerX < fromBounds.right) {
            hasSiblingInDirection = true;
          }
          break;
        case 'top':
          // 上方向に兄弟があるか
          if (sibBounds.bottom < fromBounds.top + 10 &&
              sibBounds.centerX > fromBounds.left && sibBounds.centerX < fromBounds.right) {
            hasSiblingInDirection = true;
          }
          break;
      }
    }

    // 兄弟がある方向は大きなペナルティ
    const siblingPenalty = hasSiblingInDirection ? 500 : 0;

    // グループ境界までの距離
    let distToGroupEdge = 0;
    switch (fromSide) {
      case 'top':
        distToGroupEdge = fromBounds.top - parentGroupBounds.top;
        break;
      case 'bottom':
        distToGroupEdge = parentGroupBounds.bottom - fromBounds.bottom;
        break;
      case 'left':
        distToGroupEdge = fromBounds.left - parentGroupBounds.left;
        break;
      case 'right':
        distToGroupEdge = parentGroupBounds.right - fromBounds.right;
        break;
    }

    // toNodeへの方向を考慮したtoSideを決定
    const dx = toCenter.x - fromBounds.centerX;
    const dy = toCenter.y - fromBounds.centerY;

    let bestToSide: AnchorSide;
    if (Math.abs(dx) > Math.abs(dy)) {
      // 水平方向が優勢
      bestToSide = dx > 0 ? 'left' : 'right';
    } else {
      // 垂直方向が優勢
      bestToSide = dy > 0 ? 'top' : 'bottom';
    }

    // グループ境界から出た後、toNodeまでの距離
    let exitPoint: Point;
    switch (fromSide) {
      case 'top':
        exitPoint = { x: fromBounds.centerX, y: parentGroupBounds.top };
        break;
      case 'bottom':
        exitPoint = { x: fromBounds.centerX, y: parentGroupBounds.bottom };
        break;
      case 'left':
        exitPoint = { x: parentGroupBounds.left, y: fromBounds.centerY };
        break;
      case 'right':
        exitPoint = { x: parentGroupBounds.right, y: fromBounds.centerY };
        break;
    }

    const distToTarget = Math.abs(exitPoint.x - toCenter.x) + Math.abs(exitPoint.y - toCenter.y);

    // 合計スコア（小さい方が良い）
    const score = siblingPenalty + distToGroupEdge + distToTarget;

    routeOptions.push({ fromSide, toSide: bestToSide, score });
  }

  // スコアでソートし、最良のルートを選択
  routeOptions.sort((a, b) => a.score - b.score);

  return { fromSide: routeOptions[0].fromSide, toSide: routeOptions[0].toSide };
}

/**
 * Calculate anchor point position with distribution
 * @param node - The node
 * @param side - Which side of the node
 * @param index - Position index (0-based)
 * @param total - Total connections on this side
 * @returns Point coordinates
 */
function calculateDistributedAnchor(
  node: ComputedNode,
  side: AnchorSide,
  index: number,
  total: number
): Point {
  const bounds = getNodeBounds(node);

  // 接続線の配置を計算
  // 1本: 中央 (0.5)
  // 2本: 0.4, 0.6 (中央から±10%)
  // 3本: 0.3, 0.5, 0.7 (中央を含む均等配置)
  // n本: 中央から均等に広げる
  let ratio: number;
  if (total === 1) {
    ratio = 0.5;
  } else {
    // 複数の場合は中央を基準に均等配置
    // spread: 接続線が占める範囲（中央からの距離）
    const spread = Math.min(0.1 * total, 0.3); // 最大30%の範囲
    const startRatio = 0.5 - spread;
    const endRatio = 0.5 + spread;
    ratio = startRatio + (endRatio - startRatio) * index / (total - 1);
  }

  switch (side) {
    case 'top':
      return {
        x: bounds.left + bounds.width * ratio,
        y: bounds.top,
      };
    case 'bottom':
      return {
        x: bounds.left + bounds.width * ratio,
        y: bounds.bottom,
      };
    case 'left':
      return {
        x: bounds.left,
        y: bounds.top + bounds.height * ratio,
      };
    case 'right':
      return {
        x: bounds.right,
        y: bounds.top + bounds.height * ratio,
      };
  }
}

/**
 * Select best anchor points for connection
 */
function selectAnchors(
  fromNode: ComputedNode,
  toNode: ComputedNode,
  anchorInfo?: ConnectionAnchorInfo
): { from: Point; to: Point } {
  if (anchorInfo) {
    // Use distributed anchors
    const from = calculateDistributedAnchor(
      fromNode,
      anchorInfo.fromSide,
      anchorInfo.fromIndex,
      anchorInfo.fromTotal
    );
    const to = calculateDistributedAnchor(
      toNode,
      anchorInfo.toSide,
      anchorInfo.toIndex,
      anchorInfo.toTotal
    );
    return { from, to };
  }

  // Fallback: center anchors
  const { fromSide, toSide } = determineAnchorSide(fromNode, toNode);
  const from = calculateDistributedAnchor(fromNode, fromSide, 0, 1);
  const to = calculateDistributedAnchor(toNode, toSide, 0, 1);
  return { from, to };
}

/**
 * Check if a vertical line segment intersects with a node's bounding box
 * @param x - X coordinate of the vertical line
 * @param y1 - Start Y coordinate
 * @param y2 - End Y coordinate
 * @param node - Node to check against
 * @param margin - Safety margin around the node
 */
function verticalLineIntersectsNode(
  x: number,
  y1: number,
  y2: number,
  node: ComputedNode,
  margin: number = 5
): boolean {
  const bounds = node.bounds || {
    left: node.computedX,
    top: node.computedY,
    right: node.computedX + (node.computedWidth || 48),
    bottom: node.computedY + (node.computedHeight || 48),
  };

  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  // Check if X is within node bounds (with margin)
  if (x < bounds.left - margin || x > bounds.right + margin) {
    return false;
  }

  // Check if Y range overlaps with node bounds (with margin)
  if (maxY < bounds.top - margin || minY > bounds.bottom + margin) {
    return false;
  }

  return true;
}

/**
 * Check if a horizontal line segment intersects with a node's bounding box
 */
function horizontalLineIntersectsNode(
  y: number,
  x1: number,
  x2: number,
  node: ComputedNode,
  margin: number = 5
): boolean {
  const bounds = node.bounds || {
    left: node.computedX,
    top: node.computedY,
    right: node.computedX + (node.computedWidth || 48),
    bottom: node.computedY + (node.computedHeight || 48),
  };

  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);

  // Check if Y is within node bounds (with margin)
  if (y < bounds.top - margin || y > bounds.bottom + margin) {
    return false;
  }

  // Check if X range overlaps with node bounds (with margin)
  if (maxX < bounds.left - margin || minX > bounds.right + margin) {
    return false;
  }

  return true;
}

/**
 * Find a safe X position for vertical segment that avoids all obstacles
 */
function findSafeVerticalX(
  preferredX: number,
  y1: number,
  y2: number,
  obstacles: ComputedNode[],
  fromX: number,
  toX: number
): number {
  const margin = 10;

  // Check if preferred position is safe
  const hasCollision = obstacles.some(node =>
    verticalLineIntersectsNode(preferredX, y1, y2, node, margin)
  );

  if (!hasCollision) {
    return preferredX;
  }

  // Find alternative positions - try positions just before each obstacle node
  const minX = Math.min(fromX, toX);
  const maxX = Math.max(fromX, toX);

  // Collect all node boundaries in the path
  const relevantNodes = obstacles.filter(node => {
    const bounds = node.bounds || {
      left: node.computedX,
      right: node.computedX + (node.computedWidth || 48),
    };
    return bounds.left < maxX && bounds.right > minX;
  });

  // Try position just before the first obstacle (from left)
  for (const node of relevantNodes) {
    const bounds = node.bounds || {
      left: node.computedX,
      top: node.computedY,
      right: node.computedX + (node.computedWidth || 48),
      bottom: node.computedY + (node.computedHeight || 48),
    };

    // Try just before this node
    const candidateX = bounds.left - margin - 5;
    if (candidateX > minX && candidateX < maxX) {
      const isSafe = !obstacles.some(n =>
        verticalLineIntersectsNode(candidateX, y1, y2, n, margin)
      );
      if (isSafe) {
        return candidateX;
      }
    }

    // Try just after this node
    const candidateX2 = bounds.right + margin + 5;
    if (candidateX2 > minX && candidateX2 < maxX) {
      const isSafe = !obstacles.some(n =>
        verticalLineIntersectsNode(candidateX2, y1, y2, n, margin)
      );
      if (isSafe) {
        return candidateX2;
      }
    }
  }

  // Fallback: return preferred (will have collision but better than nothing)
  return preferredX;
}

/**
 * Find a safe Y position for horizontal segment that avoids all obstacles
 * @param preferredY - The preferred Y position
 * @param x1 - Start X of the horizontal segment
 * @param x2 - End X of the horizontal segment
 * @param obstacles - Nodes to avoid
 * @param _fromY - Original fromY (unused, kept for API compatibility)
 * @param _toY - Original toY (unused, kept for API compatibility)
 * @param minY - Minimum Y coordinate constraint (to avoid title/subtitle overlap)
 */
function findSafeHorizontalY(
  preferredY: number,
  x1: number,
  x2: number,
  obstacles: ComputedNode[],
  _fromY: number,
  _toY: number,
  minY?: number
): number {
  const margin = 10;

  // Apply minY constraint to preferred position
  const constrainedPreferredY = minY !== undefined ? Math.max(preferredY, minY) : preferredY;

  // Check if preferred position is safe
  const hasCollision = obstacles.some(node =>
    horizontalLineIntersectsNode(constrainedPreferredY, x1, x2, node, margin)
  );

  if (!hasCollision) {
    return constrainedPreferredY;
  }

  // Find all obstacles that intersect with the X range
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);

  const relevantNodes = obstacles.filter(node => {
    const bounds = node.bounds || {
      left: node.computedX,
      right: node.computedX + (node.computedWidth || 48),
    };
    // Check if this node's X range overlaps with our horizontal segment
    return bounds.left <= maxX && bounds.right >= minX;
  });

  if (relevantNodes.length === 0) {
    return constrainedPreferredY;
  }

  // Collect all candidate Y positions (above and below each obstacle)
  const candidates: { y: number; distance: number }[] = [];

  for (const node of relevantNodes) {
    const bounds = node.bounds || {
      left: node.computedX,
      top: node.computedY,
      right: node.computedX + (node.computedWidth || 48),
      bottom: node.computedY + (node.computedHeight || 48),
    };

    // Try just above this node (only if above minY constraint)
    const aboveY = bounds.top - margin - 5;
    if (minY === undefined || aboveY >= minY) {
      candidates.push({ y: aboveY, distance: Math.abs(aboveY - constrainedPreferredY) });
    }

    // Try just below this node
    const belowY = bounds.bottom + margin + 5;
    candidates.push({ y: belowY, distance: Math.abs(belowY - constrainedPreferredY) });
  }

  // Sort candidates by distance from preferred position
  candidates.sort((a, b) => a.distance - b.distance);

  // Find the first safe candidate that respects minY constraint
  for (const candidate of candidates) {
    // Skip candidates that violate minY constraint
    if (minY !== undefined && candidate.y < minY) {
      continue;
    }
    const isSafe = !obstacles.some(n =>
      horizontalLineIntersectsNode(candidate.y, x1, x2, n, margin)
    );
    if (isSafe) {
      return candidate.y;
    }
  }

  // Fallback: return constrained preferred (will have collision but better than nothing)
  return constrainedPreferredY;
}

/**
 * Find X position just before the first obstacle (for straight path avoidance)
 */
function findSafeVerticalXBeforeObstacle(
  fromX: number,
  y: number,
  obstacles: ComputedNode[]
): number {
  const margin = 15;

  // Find obstacles that intersect with the horizontal line at y
  const relevantObstacles = obstacles.filter(node => {
    const bounds = node.bounds || {
      left: node.computedX,
      top: node.computedY,
      right: node.computedX + (node.computedWidth || 48),
      bottom: node.computedY + (node.computedHeight || 48),
    };
    return y >= bounds.top - margin && y <= bounds.bottom + margin;
  });

  if (relevantObstacles.length === 0) {
    return fromX + margin;
  }

  // Find the leftmost obstacle
  let minLeft = Infinity;
  for (const node of relevantObstacles) {
    const bounds = node.bounds || {
      left: node.computedX,
    };
    if (bounds.left < minLeft) {
      minLeft = bounds.left;
    }
  }

  // Return position just before the first obstacle
  return Math.max(fromX + margin, minLeft - margin);
}

/**
 * Find X position just after the last obstacle (for straight path avoidance)
 */
function findSafeVerticalXAfterObstacle(
  toX: number,
  y: number,
  obstacles: ComputedNode[]
): number {
  const margin = 15;

  // Find obstacles that intersect with the horizontal line at y
  const relevantObstacles = obstacles.filter(node => {
    const bounds = node.bounds || {
      left: node.computedX,
      top: node.computedY,
      right: node.computedX + (node.computedWidth || 48),
      bottom: node.computedY + (node.computedHeight || 48),
    };
    return y >= bounds.top - margin && y <= bounds.bottom + margin;
  });

  if (relevantObstacles.length === 0) {
    return toX - margin;
  }

  // Find the rightmost obstacle
  let maxRight = -Infinity;
  for (const node of relevantObstacles) {
    const bounds = node.bounds || {
      right: node.computedX + (node.computedWidth || 48),
    };
    if (bounds.right > maxRight) {
      maxRight = bounds.right;
    }
  }

  // Return position just after the last obstacle
  return Math.min(toX - margin, maxRight + margin);
}

/**
 * Generate orthogonal (right-angle) path based on connector type
 * @param from - Start point
 * @param to - End point
 * @param fromSide - Which side of from node the connection exits
 * @param toSide - Which side of to node the connection enters
 * @param obstacles - Nodes to avoid
 * @param anchorInfo - Connection anchor distribution info
 * @param minY - Minimum Y coordinate constraint (to avoid title/subtitle overlap)
 * @param reservedVerticalLines - Set of reserved vertical line X coordinates
 * @param reservedHorizontalLines - Set of reserved horizontal line Y coordinates
 */
function generateOrthogonalPath(
  from: Point,
  to: Point,
  fromSide?: AnchorSide,
  toSide?: AnchorSide,
  obstacles?: ComputedNode[],
  anchorInfo?: ConnectionAnchorInfo,
  minY?: number,
  reservedVerticalLines?: ReservedVerticalLines,
  reservedHorizontalLines?: ReservedHorizontalLines
): string {
  // アンカー情報がない場合は従来のロジック
  if (!fromSide || !toSide) {
    const midX = (from.x + to.x) / 2;
    if (Math.abs(from.y - to.y) < 10) {
      return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
    }
    return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
  }

  // コネクタータイプを決定
  const connectorType = determineConnectorType(fromSide, toSide, from, to);

  // 迂回距離（U字型で使用）
  const DETOUR_DISTANCE = 40;

  switch (connectorType) {
    case 'straight': {
      // シンプルな直線パスを生成（障害物回避なし - グループ内の接続で問題を起こすため）
      // 水平直線の場合はY座標を揃える（斜めにならないように）
      if (Math.abs(from.y - to.y) < 10) {
        // 水平直線: Y座標は目的地側を優先（目的地の中央に入るように）
        let lineY = to.y;
        const xMin = Math.min(from.x, to.x);
        const xMax = Math.max(from.x, to.x);
        // 水平線予約（X区間との重なりをチェック）
        if (reservedHorizontalLines) {
          const HORIZONTAL_LINE_SPACING = 15;
          let roundedY = Math.round(lineY);
          while (isHorizontalLineConflict(roundedY, xMin, xMax, reservedHorizontalLines)) {
            roundedY += HORIZONTAL_LINE_SPACING;
          }
          lineY = roundedY;
          reservedHorizontalLines.push({ y: roundedY, xMin, xMax });
        }
        return `M ${from.x} ${lineY} L ${to.x} ${lineY}`;
      }
      // 垂直直線の場合はX座標を揃える
      if (Math.abs(from.x - to.x) < 10) {
        // 垂直直線: X座標は目的地側を優先（目的地の中央に入るように）
        let lineX = to.x;
        const yMin = Math.min(from.y, to.y);
        const yMax = Math.max(from.y, to.y);
        // 縦線予約（Y区間との重なりをチェック）
        if (reservedVerticalLines) {
          const VERTICAL_LINE_SPACING = 15;
          let roundedX = Math.round(lineX);
          while (isVerticalLineConflict(roundedX, yMin, yMax, reservedVerticalLines)) {
            roundedX += VERTICAL_LINE_SPACING;
          }
          lineX = roundedX;
          reservedVerticalLines.push({ x: roundedX, yMin, yMax });
        }
        return `M ${lineX} ${from.y} L ${lineX} ${to.y}`;
      }
      // フォールバック（斜め）
      return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
    }

    case 'L_horizontal': {
      // 水平→垂直のL字: まず水平に進み、次に垂直
      let lineY = from.y;
      const xMin = Math.min(from.x, to.x);
      const xMax = Math.max(from.x, to.x);

      // 障害物回避: 水平線が障害物と交差する場合、上か下に迂回
      if (obstacles && obstacles.length > 0) {
        lineY = findSafeHorizontalY(lineY, xMin, xMax, obstacles, from.y, to.y, minY);
      }

      // 水平線予約（X区間との重なりをチェック）
      if (reservedHorizontalLines) {
        const HORIZONTAL_LINE_SPACING = 15;
        let roundedY = Math.round(lineY);
        while (isHorizontalLineConflict(roundedY, xMin, xMax, reservedHorizontalLines)) {
          roundedY += HORIZONTAL_LINE_SPACING;
        }
        lineY = roundedY;
        reservedHorizontalLines.push({ y: roundedY, xMin, xMax });
      }
      return `M ${from.x} ${lineY} L ${to.x} ${lineY} L ${to.x} ${to.y}`;
    }

    case 'L_vertical': {
      // 垂直→水平のL字: まず垂直に進み、次に水平
      let lineY = to.y;
      const xMin = Math.min(from.x, to.x);
      const xMax = Math.max(from.x, to.x);

      // 障害物回避: 水平線が障害物と交差する場合、上か下に迂回
      if (obstacles && obstacles.length > 0) {
        lineY = findSafeHorizontalY(lineY, xMin, xMax, obstacles, from.y, to.y, minY);
      }

      // 水平線予約（X区間との重なりをチェック）
      if (reservedHorizontalLines) {
        const HORIZONTAL_LINE_SPACING = 15;
        let roundedY = Math.round(lineY);
        while (isHorizontalLineConflict(roundedY, xMin, xMax, reservedHorizontalLines)) {
          roundedY += HORIZONTAL_LINE_SPACING;
        }
        lineY = roundedY;
        reservedHorizontalLines.push({ y: roundedY, xMin, xMax });
      }
      return `M ${from.x} ${from.y} L ${from.x} ${lineY} L ${to.x} ${lineY}`;
    }

    case 'Z_horizontal': {
      // 水平-垂直-水平のZ字: from.yで水平 → midXで垂直 → to.yで水平
      let midX = (from.x + to.x) / 2;
      const startY = from.y;
      const endY = to.y;
      const yMin = Math.min(startY, endY);
      const yMax = Math.max(startY, endY);

      // 障害物回避: 縦線が障害物と交差する場合、左右にオフセット
      if (obstacles && obstacles.length > 0) {
        const margin = 15;
        for (const node of obstacles) {
          const bounds = node.bounds || {
            left: node.computedX,
            top: node.computedY,
            right: node.computedX + (node.computedWidth || 48),
            bottom: node.computedY + (node.computedHeight || 48),
          };
          // 縦線が障害物と交差するかチェック
          if (!(yMax < bounds.top - margin || yMin > bounds.bottom + margin)) {
            if (midX >= bounds.left - margin && midX <= bounds.right + margin) {
              // 左右どちらに避けるか決定（目的地に近い方）
              const leftX = bounds.left - margin - 5;
              const rightX = bounds.right + margin + 5;
              midX = Math.abs(to.x - leftX) < Math.abs(to.x - rightX) ? leftX : rightX;
            }
          }
        }
      }

      // 縦線予約: Y区間との重なりをチェック
      if (reservedVerticalLines) {
        const VERTICAL_LINE_SPACING = 15;
        let roundedMidX = Math.round(midX);
        while (isVerticalLineConflict(roundedMidX, yMin, yMax, reservedVerticalLines)) {
          roundedMidX += VERTICAL_LINE_SPACING;
        }
        midX = roundedMidX;
        reservedVerticalLines.push({ x: roundedMidX, yMin, yMax });
      }

      // 水平線予約（開始水平線: from.x から midX まで）
      if (reservedHorizontalLines) {
        const xMinStart = Math.min(from.x, midX);
        const xMaxStart = Math.max(from.x, midX);
        // 開始水平線は移動せず、そのまま予約（ノードの位置に固定）
        reservedHorizontalLines.push({ y: Math.round(startY), xMin: xMinStart, xMax: xMaxStart });

        // 終了水平線: midX から to.x まで
        const xMinEnd = Math.min(midX, to.x);
        const xMaxEnd = Math.max(midX, to.x);
        reservedHorizontalLines.push({ y: Math.round(endY), xMin: xMinEnd, xMax: xMaxEnd });
      }

      return `M ${from.x} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${to.x} ${endY}`;
    }

    case 'Z_vertical': {
      // 垂直-水平-垂直のZ字: from.xで垂直 → midYで水平 → to.xで垂直
      let midY = (from.y + to.y) / 2;
      const startX = from.x;
      const endX = to.x;
      const xMin = Math.min(startX, endX);
      const xMax = Math.max(startX, endX);

      // 障害物回避: 水平線が障害物と交差する場合、上下にオフセット
      if (obstacles && obstacles.length > 0) {
        midY = findSafeHorizontalY(midY, xMin, xMax, obstacles, from.y, to.y, minY);
      }

      // 水平線予約: X区間との重なりをチェック
      if (reservedHorizontalLines) {
        const HORIZONTAL_LINE_SPACING = 15;
        let roundedMidY = Math.round(midY);
        while (isHorizontalLineConflict(roundedMidY, xMin, xMax, reservedHorizontalLines)) {
          roundedMidY += HORIZONTAL_LINE_SPACING;
        }
        midY = roundedMidY;
        reservedHorizontalLines.push({ y: roundedMidY, xMin, xMax });
      }

      // 縦線予約（開始縦線: from.y から midY まで）
      if (reservedVerticalLines) {
        const yMinStart = Math.min(from.y, midY);
        const yMaxStart = Math.max(from.y, midY);
        // 開始縦線は移動せず、そのまま予約（ノードの位置に固定）
        reservedVerticalLines.push({ x: Math.round(startX), yMin: yMinStart, yMax: yMaxStart });

        // 終了縦線: midY から to.y まで
        const yMinEnd = Math.min(midY, to.y);
        const yMaxEnd = Math.max(midY, to.y);
        reservedVerticalLines.push({ x: Math.round(endX), yMin: yMinEnd, yMax: yMaxEnd });
      }

      return `M ${startX} ${from.y} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${to.y}`;
    }

    case 'U_horizontal': {
      // 水平迂回のU字: 水平→垂直→水平
      let detourX = fromSide === 'right'
        ? Math.max(from.x, to.x) + DETOUR_DISTANCE
        : Math.min(from.x, to.x) - DETOUR_DISTANCE;

      // 障害物回避: 迂回の縦線が障害物と交差する場合、さらに外側に迂回
      if (obstacles && obstacles.length > 0) {
        const yMin = Math.min(from.y, to.y);
        const yMax = Math.max(from.y, to.y);
        const margin = 15;
        for (const node of obstacles) {
          const bounds = node.bounds || {
            left: node.computedX,
            top: node.computedY,
            right: node.computedX + (node.computedWidth || 48),
            bottom: node.computedY + (node.computedHeight || 48),
          };
          // 縦線が障害物と交差するかチェック
          if (!(yMax < bounds.top - margin || yMin > bounds.bottom + margin)) {
            if (fromSide === 'right' && detourX >= bounds.left - margin && detourX <= bounds.right + margin) {
              detourX = bounds.right + margin + DETOUR_DISTANCE;
            } else if (fromSide === 'left' && detourX >= bounds.left - margin && detourX <= bounds.right + margin) {
              detourX = bounds.left - margin - DETOUR_DISTANCE;
            }
          }
        }
      }

      return `M ${from.x} ${from.y} L ${detourX} ${from.y} L ${detourX} ${to.y} L ${to.x} ${to.y}`;
    }

    case 'U_vertical': {
      // 垂直迂回のU字: 垂直→水平→垂直
      let detourY = fromSide === 'bottom'
        ? Math.max(from.y, to.y) + DETOUR_DISTANCE
        : Math.min(from.y, to.y) - DETOUR_DISTANCE;

      // 障害物回避: 迂回の水平線が障害物と交差する場合、さらに外側に迂回
      if (obstacles && obstacles.length > 0) {
        const xMin = Math.min(from.x, to.x);
        const xMax = Math.max(from.x, to.x);
        const margin = 15;
        for (const node of obstacles) {
          const bounds = node.bounds || {
            left: node.computedX,
            top: node.computedY,
            right: node.computedX + (node.computedWidth || 48),
            bottom: node.computedY + (node.computedHeight || 48),
          };
          // 水平線が障害物と交差するかチェック
          if (!(xMax < bounds.left - margin || xMin > bounds.right + margin)) {
            if (fromSide === 'bottom' && detourY >= bounds.top - margin && detourY <= bounds.bottom + margin) {
              detourY = bounds.bottom + margin + DETOUR_DISTANCE;
            } else if (fromSide === 'top' && detourY >= bounds.top - margin && detourY <= bounds.bottom + margin) {
              detourY = bounds.top - margin - DETOUR_DISTANCE;
            }
          }
        }
      }

      // minY制約を適用（上方向迂回の場合）
      if (fromSide === 'top' && minY !== undefined && detourY < minY) {
        detourY = minY;
      }

      return `M ${from.x} ${from.y} L ${from.x} ${detourY} L ${to.x} ${detourY} L ${to.x} ${to.y}`;
    }

    default:
      // フォールバック: Z字
      const midX = (from.x + to.x) / 2;
      return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
  }
}

/**
 * Generate curved (bezier) path
 * 位置関係に応じて適切な方向にカーブする
 */
function generateCurvedPath(from: Point, to: Point): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // カーブの強さ（距離に応じて調整）
  const curveStrength = Math.min(distance * 0.4, 100);

  let ctrl1X: number, ctrl1Y: number, ctrl2X: number, ctrl2Y: number;

  if (Math.abs(dx) > Math.abs(dy)) {
    // 水平方向が主体
    if (dx > 0) {
      // 右方向: 右に出て右から入る
      ctrl1X = from.x + curveStrength;
      ctrl1Y = from.y;
      ctrl2X = to.x - curveStrength;
      ctrl2Y = to.y;
    } else {
      // 左方向: 左に出て左から入る
      ctrl1X = from.x - curveStrength;
      ctrl1Y = from.y;
      ctrl2X = to.x + curveStrength;
      ctrl2Y = to.y;
    }
  } else {
    // 垂直方向が主体
    if (dy > 0) {
      // 下方向: 下に出て上から入る
      ctrl1X = from.x;
      ctrl1Y = from.y + curveStrength;
      ctrl2X = to.x;
      ctrl2Y = to.y - curveStrength;
    } else {
      // 上方向: 上に出て下から入る
      ctrl1X = from.x;
      ctrl1Y = from.y - curveStrength;
      ctrl2X = to.x;
      ctrl2Y = to.y + curveStrength;
    }
  }

  return `M ${from.x} ${from.y} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${to.x} ${to.y}`;
}

/**
 * Generate arrowhead marker definition
 */
export function generateArrowMarker(id: string, color: string): string {
  return `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
  <path d="M 0 0 L 10 5 L 0 10 z" fill="${color}"/>
</marker>`;
}

/**
 * Generate bidirectional arrow markers
 */
export function generateBidirectionalMarkers(id: string, color: string): string {
  return `<marker id="${id}-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto">
  <path d="M 10 0 L 0 5 L 10 10 z" fill="${color}"/>
</marker>
<marker id="${id}-end" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
  <path d="M 0 0 L 10 5 L 0 10 z" fill="${color}"/>
</marker>`;
}
