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
 * Generate SVG path for a connection with distributed anchor points
 * @param connection - The connection definition
 * @param fromNode - Source node
 * @param toNode - Target node
 * @param anchorInfo - Anchor distribution information
 * @param allNodes - All nodes for obstacle avoidance
 * @param minY - Minimum Y coordinate for connection paths (to avoid title/subtitle overlap)
 */
export function generateConnectionPath(
  connection: Connection,
  fromNode: ComputedNode,
  toNode: ComputedNode,
  anchorInfo?: ConnectionAnchorInfo,
  allNodes?: ComputedNode[],
  minY?: number
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
    return generateOrthogonalPath(from, to, fromSide, toSide, obstacles, anchorInfo, minY);
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
 * Determine which side a connection should use for a node
 */
export function determineAnchorSide(
  fromNode: ComputedNode,
  toNode: ComputedNode
): { fromSide: AnchorSide; toSide: AnchorSide } {
  const fromBounds = getNodeBounds(fromNode);
  const toBounds = getNodeBounds(toNode);

  const dx = toBounds.centerX - fromBounds.centerX;
  const dy = toBounds.centerY - fromBounds.centerY;

  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal dominant
    if (dx > 0) {
      return { fromSide: 'right', toSide: 'left' };
    } else {
      return { fromSide: 'left', toSide: 'right' };
    }
  } else {
    // Vertical dominant
    if (dy > 0) {
      return { fromSide: 'bottom', toSide: 'top' };
    } else {
      return { fromSide: 'top', toSide: 'bottom' };
    }
  }
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
 */
function generateOrthogonalPath(
  from: Point,
  to: Point,
  fromSide?: AnchorSide,
  toSide?: AnchorSide,
  obstacles?: ComputedNode[],
  anchorInfo?: ConnectionAnchorInfo,
  minY?: number
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
    case 'straight':
      // 直線でも障害物チェック
      if (obstacles && obstacles.length > 0) {
        // 水平直線の場合
        if (Math.abs(from.y - to.y) < 10) {
          const hasCollision = obstacles.some(node =>
            horizontalLineIntersectsNode(from.y, from.x, to.x, node, 5)
          );
          if (hasCollision) {
            // 障害物がある場合は上または下に迂回するパスを生成
            const firstMidX = findSafeVerticalXBeforeObstacle(from.x, from.y, obstacles);
            const safeY = findSafeHorizontalY(from.y, firstMidX, to.x, obstacles, from.y, to.y, minY);
            const lastMidX = findSafeVerticalXAfterObstacle(to.x, to.y, obstacles);
            return `M ${from.x} ${from.y} L ${firstMidX} ${from.y} L ${firstMidX} ${safeY} L ${lastMidX} ${safeY} L ${lastMidX} ${to.y} L ${to.x} ${to.y}`;
          }
        }
        // 垂直直線の場合
        if (Math.abs(from.x - to.x) < 10) {
          const hasCollision = obstacles.some(node =>
            verticalLineIntersectsNode(from.x, from.y, to.y, node, 5)
          );
          if (hasCollision) {
            // 障害物がある場合は左または右に迂回するパスを生成
            const safeX = findSafeVerticalX(
              from.x,
              from.y,
              to.y,
              obstacles,
              from.x - 100, // 左右に探索範囲を広げる
              from.x + 100
            );
            // 5セグメントパス: from → 横 → 下 → 横 → to
            const firstMidY = from.y + 15;
            const lastMidY = to.y - 15;
            return `M ${from.x} ${from.y} L ${from.x} ${firstMidY} L ${safeX} ${firstMidY} L ${safeX} ${lastMidY} L ${to.x} ${lastMidY} L ${to.x} ${to.y}`;
          }
        }
      }
      // 水平直線の場合はY座標を揃える（斜めにならないように）
      if (Math.abs(from.y - to.y) < 10) {
        return `M ${from.x} ${from.y} L ${to.x} ${from.y}`;
      }
      // 垂直直線の場合はX座標を揃える
      if (Math.abs(from.x - to.x) < 10) {
        return `M ${from.x} ${from.y} L ${from.x} ${to.y}`;
      }
      // 斜め検出 - straightケースなのに水平でも垂直でもない
      console.error('[connections] Diagonal line detected in straight case:', {
        from: { x: from.x, y: from.y },
        to: { x: to.x, y: to.y },
        deltaX: Math.abs(from.x - to.x),
        deltaY: Math.abs(from.y - to.y),
        fromSide,
        toSide,
      });
      return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;

    case 'L_horizontal':
      // 水平→垂直のL字: まず水平に進み、次に垂直
      return `M ${from.x} ${from.y} L ${to.x} ${from.y} L ${to.x} ${to.y}`;

    case 'L_vertical':
      // 垂直→水平のL字: まず垂直に進み、次に水平
      return `M ${from.x} ${from.y} L ${from.x} ${to.y} L ${to.x} ${to.y}`;

    case 'Z_horizontal': {
      // 水平-垂直-水平のZ字
      let midX = (from.x + to.x) / 2;

      // 障害物回避: 垂直セグメントが障害物と交差しないか確認
      if (obstacles && obstacles.length > 0) {
        midX = findSafeVerticalX(midX, from.y, to.y, obstacles, from.x, to.x);

        // 2番目の水平セグメント (midX, to.y) → (to.x, to.y) も障害物チェック
        const hasHorizontalCollision = obstacles.some(node =>
          horizontalLineIntersectsNode(to.y, midX, to.x, node, 5)
        );

        if (hasHorizontalCollision) {
          // 障害物がある場合は、ターゲットノードの後ろで垂直に曲がる（5セグメントパス）
          // aws/azure/gcp の後ろを通って techstack/heroicons/lucide へ
          const afterObstacleX = findSafeVerticalX(
            (midX + to.x) / 2,  // midX と to.x の中間を候補に
            from.y,
            to.y,
            obstacles,
            midX,
            to.x
          );

          if (afterObstacleX !== midX) {
            // 5セグメントパス: from → midX → 上/下に回避 → afterObstacleX → to
            // 接続インデックスに基づいて分散させる（控えめに）
            const connectionSpread = 10; // 接続間の間隔（小さめ）
            const fromIndex = anchorInfo?.fromIndex ?? 0;
            const fromTotal = anchorInfo?.fromTotal ?? 1;

            // ターゲットが上にあるか下にあるかで回避方向を決定
            const goUp = to.y < from.y;

            // インデックスに基づくオフセット
            // 同じ方向に回避する接続だけをカウントして分散
            const indexOffset = fromIndex * connectionSpread;

            // 基準Y座標
            const baseY = goUp
              ? Math.min(from.y, to.y) - 20
              : Math.max(from.y, to.y) + 20;

            const safeY = findSafeHorizontalY(
              goUp ? baseY - indexOffset : baseY + indexOffset,
              midX,
              afterObstacleX,
              obstacles,
              Math.min(from.y, to.y) - 80,
              Math.max(from.y, to.y) + 80,
              minY
            );

            // X座標も少しだけ分散（控えめに）
            const spreadOffset = indexOffset * 0.5;
            const spreadMidX = midX - spreadOffset;
            const spreadAfterX = afterObstacleX - spreadOffset;

            return `M ${from.x} ${from.y} L ${spreadMidX} ${from.y} L ${spreadMidX} ${safeY} L ${spreadAfterX} ${safeY} L ${spreadAfterX} ${to.y} L ${to.x} ${to.y}`;
          }
        }
      }

      // 接続インデックスに基づいてmidXを分散（重なり防止）
      if (anchorInfo && anchorInfo.fromTotal > 1) {
        const connectionSpread = 10;
        const centerIndex = (anchorInfo.fromTotal - 1) / 2;
        const indexOffset = (anchorInfo.fromIndex - centerIndex) * connectionSpread;
        midX = midX + indexOffset;
      }

      return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
    }

    case 'Z_vertical': {
      // 垂直-水平-垂直のZ字
      let midY = (from.y + to.y) / 2;

      // 障害物回避
      if (obstacles && obstacles.length > 0) {
        // 最初の垂直セグメント (from.x, from.y → from.x, midY) のチェック
        const hasFirstVerticalCollision = obstacles.some(node =>
          verticalLineIntersectsNode(from.x, from.y, midY, node, 5)
        );

        // 水平セグメント (from.x, midY → to.x, midY) のチェック
        const hasHorizontalCollision = obstacles.some(node =>
          horizontalLineIntersectsNode(midY, from.x, to.x, node, 5)
        );

        // 2番目の垂直セグメント (to.x, midY → to.x, to.y) のチェック
        const hasSecondVerticalCollision = obstacles.some(node =>
          verticalLineIntersectsNode(to.x, midY, to.y, node, 5)
        );

        if (hasFirstVerticalCollision || hasHorizontalCollision || hasSecondVerticalCollision) {
          // 障害物がある場合は、左右どちらかに迂回する5セグメントパス
          // 障害物の左側または右側を通る安全なX座標を見つける
          const safeX = findSafeVerticalX(
            (from.x + to.x) / 2,
            Math.min(from.y, to.y),
            Math.max(from.y, to.y),
            obstacles,
            from.x,
            to.x
          );

          // 水平セグメントのY座標も安全な位置を見つける
          const safeY = findSafeHorizontalY(midY, from.x, safeX, obstacles, from.y, to.y, minY);

          // 5セグメントパス: from → 下/上 → 左/右に迂回 → 下/上 → to
          return `M ${from.x} ${from.y} L ${from.x} ${safeY} L ${safeX} ${safeY} L ${safeX} ${to.y} L ${to.x} ${to.y}`;
        }

        // 水平セグメントだけに障害物がある場合
        midY = findSafeHorizontalY(midY, from.x, to.x, obstacles, from.y, to.y, minY);
      }

      return `M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${to.y}`;
    }

    case 'U_horizontal': {
      // 水平迂回のU字
      const detourX = fromSide === 'right'
        ? Math.max(from.x, to.x) + DETOUR_DISTANCE
        : Math.min(from.x, to.x) - DETOUR_DISTANCE;
      return `M ${from.x} ${from.y} L ${detourX} ${from.y} L ${detourX} ${to.y} L ${to.x} ${to.y}`;
    }

    case 'U_vertical': {
      // 垂直迂回のU字
      const detourY = fromSide === 'bottom'
        ? Math.max(from.y, to.y) + DETOUR_DISTANCE
        : Math.min(from.y, to.y) - DETOUR_DISTANCE;
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
