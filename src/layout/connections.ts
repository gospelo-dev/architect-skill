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
 */
export function generateConnectionPath(
  connection: Connection,
  fromNode: ComputedNode,
  toNode: ComputedNode,
  anchorInfo?: ConnectionAnchorInfo
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
    return generateOrthogonalPath(from, to, fromSide, toSide);
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
 * Generate orthogonal (right-angle) path based on connector type
 */
function generateOrthogonalPath(
  from: Point,
  to: Point,
  fromSide?: AnchorSide,
  toSide?: AnchorSide
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
      return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;

    case 'L_horizontal':
      // 水平→垂直のL字: まず水平に進み、次に垂直
      return `M ${from.x} ${from.y} L ${to.x} ${from.y} L ${to.x} ${to.y}`;

    case 'L_vertical':
      // 垂直→水平のL字: まず垂直に進み、次に水平
      return `M ${from.x} ${from.y} L ${from.x} ${to.y} L ${to.x} ${to.y}`;

    case 'Z_horizontal': {
      // 水平-垂直-水平のZ字
      const midX = (from.x + to.x) / 2;
      return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
    }

    case 'Z_vertical': {
      // 垂直-水平-垂直のZ字
      const midY = (from.y + to.y) / 2;
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
