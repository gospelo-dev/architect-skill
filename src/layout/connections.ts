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
 * @param x - チェックするX座標
 * @param yMin - Y区間の最小値
 * @param yMax - Y区間の最大値
 * @param reserved - 予約済み縦線リスト
 * @returns 重なりがある場合true
 */
export function isVerticalLineConflict(
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
 * @param y - チェックするY座標
 * @param xMin - X区間の最小値
 * @param xMax - X区間の最大値
 * @param reserved - 予約済み水平線リスト
 * @returns 重なりがある場合true
 */
export function isHorizontalLineConflict(
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
 * レイアウトタイプ
 */
export type LayoutType = 'portrait' | 'landscape';

/**
 * Portrait レイアウト優先度テーブル（仕様に基づく）
 * 出口方向優先度: ↓ > → > ← > ↑
 * 優先度1が最優先、16が最低優先
 */
const PORTRAIT_PRIORITY: Record<string, number> = {
  'bottom-top': 1,      // ↓ → ↓ 非U字
  'bottom-left': 2,     // ↓ → → 非U字
  'bottom-right': 3,    // ↓ → ← 非U字
  'bottom-bottom': 4,   // ↓ → ↑ U字
  'right-top': 5,       // → → ↓ 非U字
  'right-left': 6,      // → → → 非U字
  'right-bottom': 7,    // → → ↑ 非U字
  'right-right': 8,     // → → ← U字
  'left-top': 9,        // ← → ↓ 非U字
  'left-right': 10,     // ← → ← 非U字
  'left-bottom': 11,    // ← → ↑ 非U字
  'left-left': 12,      // ← → → U字
  'top-bottom': 13,     // ↑ → ↑ 非U字
  'top-left': 14,       // ↑ → → 非U字
  'top-right': 15,      // ↑ → ← 非U字
  'top-top': 16,        // ↑ → ↓ U字
};

/**
 * Landscape レイアウト優先度テーブル（仕様に基づく）
 * 出口方向優先度: → > ↓ > ↑ > ←
 * 優先度1が最優先、16が最低優先
 */
const LANDSCAPE_PRIORITY: Record<string, number> = {
  'right-left': 1,      // → → → 非U字
  'right-top': 2,       // → → ↓ 非U字
  'right-bottom': 3,    // → → ↑ 非U字
  'right-right': 4,     // → → ← U字
  'bottom-top': 5,      // ↓ → ↓ 非U字
  'bottom-left': 6,     // ↓ → → 非U字
  'bottom-right': 7,    // ↓ → ← 非U字
  'bottom-bottom': 8,   // ↓ → ↑ U字
  'top-bottom': 9,      // ↑ → ↑ 非U字
  'top-left': 10,       // ↑ → → 非U字
  'top-right': 11,      // ↑ → ← 非U字
  'top-top': 12,        // ↑ → ↓ U字
  'left-right': 13,     // ← → ← 非U字
  'left-top': 14,       // ← → ↓ 非U字
  'left-bottom': 15,    // ← → ↑ 非U字
  'left-left': 16,      // ← → → U字
};

/**
 * 出口辺と入口辺の組み合わせから優先度ペナルティを計算
 * @param fromSide - 出口辺
 * @param toSide - 入口辺
 * @param layout - レイアウトタイプ（デフォルト: portrait）
 * @returns 優先度に基づくペナルティ（優先度1=0, 優先度16=150）
 */
export function getLayoutPriorityPenalty(
  fromSide: AnchorSide,
  toSide: AnchorSide,
  layout: LayoutType = 'portrait'
): number {
  const key = `${fromSide}-${toSide}`;
  const priorityTable = layout === 'portrait' ? PORTRAIT_PRIORITY : LANDSCAPE_PRIORITY;
  const priority = priorityTable[key] || 16;
  // 優先度1 → ペナルティ0、優先度16 → ペナルティ150
  return (priority - 1) * 10;
}

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
 * @param layout - Layout type for priority calculation (portrait or landscape)
 */
export function generateConnectionPath(
  connection: Connection,
  fromNode: ComputedNode,
  toNode: ComputedNode,
  anchorInfo?: ConnectionAnchorInfo,
  allNodes?: ComputedNode[],
  minY?: number,
  reservedVerticalLines?: ReservedVerticalLines,
  reservedHorizontalLines?: ReservedHorizontalLines,
  layout: LayoutType = 'portrait'
): string {
  const style = connection.style || 'orthogonal';

  if (style === 'curved') {
    const { from, to } = selectAnchors(fromNode, toNode, anchorInfo);
    return generateCurvedPath(from, to);
  }

  // グループ・コンポジット以外のすべてのノードを障害物として扱う
  // 接続元・接続先ノードは除外（自分自身との衝突を避けるため）
  const obstacles = allNodes?.filter(n =>
    n.type !== 'group' &&
    n.type !== 'composite' &&
    n.id !== fromNode.id &&
    n.id !== toNode.id
  );

  // 明示的にfromSide/toSideが指定されている場合はそれを使用
  if (connection.fromSide && connection.toSide) {
    const from = calculateDistributedAnchor(
      fromNode,
      connection.fromSide,
      anchorInfo?.fromIndex || 0,
      anchorInfo?.fromTotal || 1
    );
    const to = calculateDistributedAnchor(
      toNode,
      connection.toSide,
      anchorInfo?.toIndex || 0,
      anchorInfo?.toTotal || 1
    );
    return generateOrthogonalPath(from, to, connection.fromSide, connection.toSide, obstacles, anchorInfo, minY, reservedVerticalLines, reservedHorizontalLines);
  }

  // I字（直線）判定: X座標またはY座標がほぼ同じ場合
  // I字は中央を優先するため、findBestOrthogonalPath をスキップして直接 anchorInfo の側を使用
  const isStraightVertical = Math.abs(fromNode.computedX - toNode.computedX) < 50;
  const isStraightHorizontal = Math.abs(fromNode.computedY - toNode.computedY) < 50;
  if ((isStraightVertical || isStraightHorizontal) && anchorInfo) {
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
    return generateOrthogonalPath(from, to, anchorInfo.fromSide, anchorInfo.toSide, obstacles, anchorInfo, minY, reservedVerticalLines, reservedHorizontalLines);
  }

  // 総当たり評価: 16パターンすべてを試して最短パスを選択
  // anchorInfoの分散配置情報は使用するが、辺の選択は障害物を考慮して最適解を探す
  return findBestOrthogonalPath(
    fromNode,
    toNode,
    obstacles,
    minY,
    reservedVerticalLines,
    reservedHorizontalLines,
    anchorInfo,
    layout
  );
}

/**
 * 線分が円と交差するかチェック（内接円コリジョン判定）
 * @param x1, y1 - 線分の始点
 * @param x2, y2 - 線分の終点
 * @param cx, cy - 円の中心
 * @param radius - 円の半径
 * @returns 交差する場合true
 */
function lineSegmentIntersectsCircle(
  x1: number, y1: number,
  x2: number, y2: number,
  cx: number, cy: number,
  radius: number
): boolean {
  // 線分ベクトル
  const dx = x2 - x1;
  const dy = y2 - y1;

  // 始点から円中心へのベクトル
  const fx = x1 - cx;
  const fy = y1 - cy;

  // 二次方程式の係数: at^2 + bt + c = 0
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;

  // 線分の長さが0の場合（点）
  if (a < 0.0001) {
    return c <= 0; // 点が円内にあるか
  }

  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return false; // 交差なし
  }

  const sqrtD = Math.sqrt(discriminant);
  const t1 = (-b - sqrtD) / (2 * a);
  const t2 = (-b + sqrtD) / (2 * a);

  // t が [0, 1] の範囲内なら線分と交差
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
}

/**
 * パスセグメントがノードの内接円を通過するかチェック
 * 直交パス（水平または垂直のセグメント）が対象
 * アイコンノードは48x48の内接円（半径24）でコリジョン判定
 * @param path - SVGパス文字列 (M x y L x y L x y ...)
 * @param node - チェック対象のノード
 * @param margin - 安全マージン
 * @returns 内接円を通過する場合true
 */
function pathCrossesNodeArea(path: string, node: ComputedNode, margin: number = 3): boolean {
  const bounds = node.bounds || {
    left: node.computedX,
    top: node.computedY,
    right: node.computedX + (node.computedWidth || 48),
    bottom: node.computedY + (node.computedHeight || 48),
    centerX: node.computedX + (node.computedWidth || 48) / 2,
    centerY: node.computedY + (node.computedHeight || 48) / 2,
    width: node.computedWidth || 48,
    height: node.computedHeight || 48,
  };

  // 内接円の中心と半径を計算
  const cx = bounds.centerX;
  const cy = bounds.centerY;
  // 内接円の半径 = 幅と高さの小さい方の半分
  const baseRadius = Math.min(bounds.width, bounds.height) / 2;
  const radius = baseRadius + margin;

  // パスから座標を抽出
  const coords = path.match(/[\d.]+/g);
  if (!coords || coords.length < 4) return false;

  // 各セグメントをチェック
  for (let i = 2; i < coords.length; i += 2) {
    const x1 = parseFloat(coords[i - 2]);
    const y1 = parseFloat(coords[i - 1]);
    const x2 = parseFloat(coords[i]);
    const y2 = parseFloat(coords[i + 1]);

    if (lineSegmentIntersectsCircle(x1, y1, x2, y2, cx, cy, radius)) {
      return true;
    }
  }

  return false;
}

/**
 * パスが障害物エリアを通過する回数をカウント
 * @param path - SVGパス文字列
 * @param obstacles - 障害物ノード配列
 * @returns 衝突数
 */
function countObstacleCrossings(path: string, obstacles: ComputedNode[]): number {
  let count = 0;
  for (const obstacle of obstacles) {
    if (pathCrossesNodeArea(path, obstacle)) {
      count++;
    }
  }
  return count;
}

/**
 * パスが指定された辺から正しい方向へ出ているかを検証
 * - 左辺から出る: 左へ（最初のセグメントでXが減少）
 * - 右辺から出る: 右へ（最初のセグメントでXが増加）
 * - 上辺から出る: 上へ（最初のセグメントでYが減少）
 * - 下辺から出る: 下へ（最初のセグメントでYが増加）
 * @param path - SVGパス文字列
 * @param fromSide - 出る辺
 * @returns 正しい方向へ出ている場合true
 */
function isValidExitDirection(path: string, fromSide: AnchorSide): boolean {
  const coords = path.match(/[\d.]+/g);
  if (!coords || coords.length < 4) return true; // 短すぎるパスは許可

  // 最初の2点を取得（最初のセグメント）
  const startX = parseFloat(coords[0]);
  const startY = parseFloat(coords[1]);
  const nextX = parseFloat(coords[2]);
  const nextY = parseFloat(coords[3]);

  switch (fromSide) {
    case 'left':
      // 左辺から出る: 左へ（nextX < startX、つまりXが減少）
      return nextX < startX - 1;
    case 'right':
      // 右辺から出る: 右へ（nextX > startX、つまりXが増加）
      return nextX > startX + 1;
    case 'top':
      // 上辺から出る: 上へ（nextY < startY、つまりYが減少）
      return nextY < startY - 1;
    case 'bottom':
      // 下辺から出る: 下へ（nextY > startY、つまりYが増加）
      return nextY > startY + 1;
    default:
      return true;
  }
}

/**
 * パスが指定された辺に正しい方向から入っているかを検証
 * - 左辺: 左から（最後のセグメントでXが減少）
 * - 右辺: 右から（最後のセグメントでXが増加）
 * - 上辺: 上から（最後のセグメントでYが減少）
 * - 下辺: 下から（最後のセグメントでYが増加）
 * @param path - SVGパス文字列
 * @param toSide - 入る辺
 * @returns 正しい方向から入っている場合true
 */
function isValidEntryDirection(path: string, toSide: AnchorSide): boolean {
  const coords = path.match(/[\d.]+/g);
  if (!coords || coords.length < 4) return true; // 短すぎるパスは許可

  // 最後の2点を取得（最後のセグメント）
  const len = coords.length;
  const prevX = parseFloat(coords[len - 4]);
  const prevY = parseFloat(coords[len - 3]);
  const endX = parseFloat(coords[len - 2]);
  const endY = parseFloat(coords[len - 1]);

  switch (toSide) {
    case 'left':
      // 左辺に入る: 左から来る（prevX < endX、つまりXが増加して終点に到達）
      return prevX < endX - 1;
    case 'right':
      // 右辺に入る: 右から来る（prevX > endX、つまりXが減少して終点に到達）
      return prevX > endX + 1;
    case 'top':
      // 上辺に入る: 上から来る（prevY < endY、つまりYが増加して終点に到達）
      return prevY < endY - 1;
    case 'bottom':
      // 下辺に入る: 下から来る（prevY > endY、つまりYが減少して終点に到達）
      return prevY > endY + 1;
    default:
      return true;
  }
}

/**
 * 総当たりで16パターン（from: 4辺 x to: 4辺）を評価し、最短パスを選択
 * 障害物エリアを通過するパスには大きなペナルティを付与
 * 出入りの方向が不正なパスも除外
 * レイアウト優先度テーブルに基づいてペナルティを計算
 * @param layout - レイアウトタイプ（デフォルト: portrait）
 */
function findBestOrthogonalPath(
  fromNode: ComputedNode,
  toNode: ComputedNode,
  obstacles?: ComputedNode[],
  minY?: number,
  reservedVerticalLines?: ReservedVerticalLines,
  reservedHorizontalLines?: ReservedHorizontalLines,
  anchorInfo?: ConnectionAnchorInfo,
  layout: LayoutType = 'portrait'
): string {
  const sides: AnchorSide[] = ['top', 'bottom', 'left', 'right'];

  type PathCandidate = {
    path: string;
    length: number;
    fromSide: AnchorSide;
    toSide: AnchorSide;
    obstacleCrossings: number;
    validExit: boolean;
    validEntry: boolean;
    penalty: number;  // ペナルティスコア（優先度ベース）
  };

  const candidates: PathCandidate[] = [];

  for (const fromSide of sides) {
    for (const toSide of sides) {
      // アンカー点を計算（中央配置）
      const from = calculateDistributedAnchor(fromNode, fromSide, 0, 1);
      const to = calculateDistributedAnchor(toNode, toSide, 0, 1);

      // パスを生成（予約リストを変更しないようにコピー）
      // 注: 評価時は予約リストを更新しない
      const path = generateOrthogonalPath(
        from,
        to,
        fromSide,
        toSide,
        obstacles,
        undefined, // anchorInfo
        minY,
        undefined, // reservedVerticalLines - 評価時は使用しない
        undefined  // reservedHorizontalLines - 評価時は使用しない
      );

      // パス長を計算
      const length = calculatePathLength(path);

      // 障害物エリア通過をチェック
      const obstacleCrossings = obstacles ? countObstacleCrossings(path, obstacles) : 0;

      // 出る方向の検証
      const validExit = isValidExitDirection(path, fromSide);

      // 入る方向の検証
      const validEntry = isValidEntryDirection(path, toSide);

      // レイアウト優先度テーブルに基づくペナルティ計算
      let penalty = getLayoutPriorityPenalty(fromSide, toSide, layout);

      // anchorInfo で指定された側と異なる場合、ペナルティを追加
      // これにより、同じノードから出る他の接続との競合を避ける
      if (anchorInfo) {
        if (anchorInfo.fromSide !== fromSide) {
          penalty += 100; // 指定された出発側と異なる
        }
        if (anchorInfo.toSide !== toSide) {
          penalty += 100; // 指定された到着側と異なる
        }
      }

      candidates.push({ path, length, fromSide, toSide, obstacleCrossings, validExit, validEntry, penalty });
    }
  }

  // 障害物を通過するパス、および出入り方向が不正なパスは除外（即失格）
  const validCandidates = candidates.filter(c =>
    c.obstacleCrossings === 0 && c.validExit && c.validEntry
  );

  // 有効な候補がある場合はパス長+ペナルティでソート、なければ全候補からソート（フォールバック）
  const candidatesToSort = validCandidates.length > 0 ? validCandidates : candidates;
  candidatesToSort.sort((a, b) => (a.length + a.penalty) - (b.length + b.penalty));
  const best = candidatesToSort[0];

  // 最終パスを予約リストを使って再生成（重複回避のため）
  // anchorInfoがある場合は分散配置を適用
  if (reservedVerticalLines || reservedHorizontalLines || anchorInfo) {
    const from = calculateDistributedAnchor(
      fromNode,
      best.fromSide,
      anchorInfo?.fromSide === best.fromSide ? (anchorInfo?.fromIndex || 0) : 0,
      anchorInfo?.fromSide === best.fromSide ? (anchorInfo?.fromTotal || 1) : 1
    );
    const to = calculateDistributedAnchor(
      toNode,
      best.toSide,
      anchorInfo?.toSide === best.toSide ? (anchorInfo?.toIndex || 0) : 0,
      anchorInfo?.toSide === best.toSide ? (anchorInfo?.toTotal || 1) : 1
    );
    return generateOrthogonalPath(
      from,
      to,
      best.fromSide,
      best.toSide,
      obstacles,
      anchorInfo,
      minY,
      reservedVerticalLines,
      reservedHorizontalLines
    );
  }

  return best.path;
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
  parentGroupBounds?: { top: number; bottom: number; left: number; right: number },
  layout: LayoutType = 'portrait'
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
  // レイアウト優先度テーブルに基づくペナルティを適用
  for (const fromSide of sides) {
    for (const toSide of sides) {
      const from = fromAnchors[fromSide];
      const to = toAnchors[toSide];

      // Calculate actual path length based on connector type
      const pathLength = calculateActualPathLength(from, to, fromSide, toSide);

      // レイアウト優先度テーブルに基づくペナルティ
      let penalty = getLayoutPriorityPenalty(fromSide, toSide, layout);

      // 方向に反するパスに追加ペナルティ
      // 出口方向がターゲットと逆方向の場合
      if (fromSide === 'left' && dx > 0) penalty += 200;
      if (fromSide === 'right' && dx < 0) penalty += 200;
      if (fromSide === 'top' && dy > 0) penalty += 200;
      if (fromSide === 'bottom' && dy < 0) penalty += 200;

      // 入口方向がソースと逆方向の場合
      if (toSide === 'right' && dx > 0) penalty += 100;
      if (toSide === 'left' && dx < 0) penalty += 100;
      if (toSide === 'bottom' && dy > 0) penalty += 100;
      if (toSide === 'top' && dy < 0) penalty += 100;

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
          const HORIZONTAL_LINE_SPACING = 30;
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
        // 垂直直線 (I字): X座標は目的地側を優先（目的地の中央に入るように）
        // I字は2点間の直接接続なので、予約チェックせず常に中央を使用
        // ただし予約は登録する（後続のL字やZ字がオフセットされるように）
        const lineX = to.x;
        const yMin = Math.min(from.y, to.y);
        const yMax = Math.max(from.y, to.y);
        if (reservedVerticalLines) {
          reservedVerticalLines.push({ x: Math.round(lineX), yMin, yMax });
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
        const HORIZONTAL_LINE_SPACING = 30;
        let roundedY = Math.round(lineY);
        while (isHorizontalLineConflict(roundedY, xMin, xMax, reservedHorizontalLines)) {
          roundedY += HORIZONTAL_LINE_SPACING;
        }
        lineY = roundedY;
        reservedHorizontalLines.push({ y: roundedY, xMin, xMax });
      }
      // lineYがfrom.yと異なる場合（障害物回避で迂回した場合）は始点から上がる
      if (Math.abs(lineY - from.y) > 1) {
        return `M ${from.x} ${from.y} L ${from.x} ${lineY} L ${to.x} ${lineY} L ${to.x} ${to.y}`;
      }
      return `M ${from.x} ${lineY} L ${to.x} ${lineY} L ${to.x} ${to.y}`;
    }

    case 'L_vertical': {
      // 垂直→水平のL字: まず垂直に進み、次に水平
      let lineY = to.y;
      let verticalX = from.x; // 縦線のX座標
      const xMin = Math.min(from.x, to.x);
      const xMax = Math.max(from.x, to.x);

      // 障害物回避: 水平線が障害物と交差する場合、上か下に迂回
      if (obstacles && obstacles.length > 0) {
        lineY = findSafeHorizontalY(lineY, xMin, xMax, obstacles, from.y, to.y, minY);
      }

      // 縦線予約チェック: from.y から lineY までの縦線
      const vYMin = Math.min(from.y, lineY);
      const vYMax = Math.max(from.y, lineY);
      if (reservedVerticalLines) {
        const VERTICAL_LINE_SPACING = 20;
        let roundedX = Math.round(verticalX);
        // 衝突時は左右両方を試す
        if (isVerticalLineConflict(roundedX, vYMin, vYMax, reservedVerticalLines)) {
          const leftX = roundedX - VERTICAL_LINE_SPACING;
          const rightX = roundedX + VERTICAL_LINE_SPACING;
          const leftConflict = isVerticalLineConflict(leftX, vYMin, vYMax, reservedVerticalLines);
          const rightConflict = isVerticalLineConflict(rightX, vYMin, vYMax, reservedVerticalLines);
          if (!leftConflict) {
            roundedX = leftX;
          } else if (!rightConflict) {
            roundedX = rightX;
          } else {
            while (isVerticalLineConflict(roundedX, vYMin, vYMax, reservedVerticalLines)) {
              roundedX += VERTICAL_LINE_SPACING;
            }
          }
        }
        verticalX = roundedX;
        reservedVerticalLines.push({ x: roundedX, yMin: vYMin, yMax: vYMax });
      }

      // 水平線予約（X区間との重なりをチェック）
      // 予約と重なる場合は位置をずらすが、ずらした先が障害物と衝突しないかも確認
      if (reservedHorizontalLines) {
        const HORIZONTAL_LINE_SPACING = 30;
        const MAX_ATTEMPTS = 20;
        let roundedY = Math.round(lineY);
        let attempts = 0;
        while (attempts < MAX_ATTEMPTS) {
          const hasReservationConflict = isHorizontalLineConflict(roundedY, Math.min(verticalX, to.x), Math.max(verticalX, to.x), reservedHorizontalLines);
          const hasObstacleConflict = obstacles && obstacles.some(node =>
            horizontalLineIntersectsNode(roundedY, Math.min(verticalX, to.x), Math.max(verticalX, to.x), node, 3)
          );
          if (!hasReservationConflict && !hasObstacleConflict) {
            break;
          }
          roundedY += HORIZONTAL_LINE_SPACING;
          attempts++;
        }
        lineY = roundedY;
        reservedHorizontalLines.push({ y: roundedY, xMin: Math.min(verticalX, to.x), xMax: Math.max(verticalX, to.x) });
      }
      // lineYがto.yと異なる場合（障害物回避で迂回した場合）は終点まで降りる
      if (Math.abs(lineY - to.y) > 1) {
        return `M ${verticalX} ${from.y} L ${verticalX} ${lineY} L ${to.x} ${lineY} L ${to.x} ${to.y}`;
      }
      return `M ${verticalX} ${from.y} L ${verticalX} ${lineY} L ${to.x} ${lineY}`;
    }

    case 'Z_horizontal': {
      // 水平-垂直-水平のZ字: from.yで水平 → midXで垂直 → to.yで水平
      // 注: 同一ノードからの複数接続の水平線分離は、アンカー分散配置（calculateDistributedAnchor）で実現
      // アンカーはターゲットY座標順にソートされ、縦中央から均等配置される
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
        const VERTICAL_LINE_SPACING = 30;
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
        const HORIZONTAL_LINE_SPACING = 30;
        let roundedMidY = Math.round(midY);
        while (isHorizontalLineConflict(roundedMidY, xMin, xMax, reservedHorizontalLines)) {
          roundedMidY += HORIZONTAL_LINE_SPACING;
        }
        midY = roundedMidY;
        reservedHorizontalLines.push({ y: roundedMidY, xMin, xMax });
      }

      // 縦線予約（開始縦線: from.y から midY まで）
      let actualStartX = startX;
      if (reservedVerticalLines) {
        const yMinStart = Math.min(from.y, midY);
        const yMaxStart = Math.max(from.y, midY);

        // 開始縦線の衝突チェック - 衝突時はオフセット
        const VERTICAL_LINE_SPACING = 20;
        let roundedStartX = Math.round(startX);
        if (isVerticalLineConflict(roundedStartX, yMinStart, yMaxStart, reservedVerticalLines)) {
          // 終点の方向を優先してオフセット（自然な線の流れになる）
          const goingRight = endX > startX;
          const preferredX = goingRight ? roundedStartX + VERTICAL_LINE_SPACING : roundedStartX - VERTICAL_LINE_SPACING;
          const alternateX = goingRight ? roundedStartX - VERTICAL_LINE_SPACING : roundedStartX + VERTICAL_LINE_SPACING;
          const preferredConflict = isVerticalLineConflict(preferredX, yMinStart, yMaxStart, reservedVerticalLines);
          const alternateConflict = isVerticalLineConflict(alternateX, yMinStart, yMaxStart, reservedVerticalLines);
          if (!preferredConflict) {
            roundedStartX = preferredX;
          } else if (!alternateConflict) {
            roundedStartX = alternateX;
          } else {
            // 両方衝突する場合は優先方向にずらし続ける
            const direction = goingRight ? VERTICAL_LINE_SPACING : -VERTICAL_LINE_SPACING;
            while (isVerticalLineConflict(roundedStartX, yMinStart, yMaxStart, reservedVerticalLines)) {
              roundedStartX += direction;
            }
          }
        }
        actualStartX = roundedStartX;
        reservedVerticalLines.push({ x: roundedStartX, yMin: yMinStart, yMax: yMaxStart });

        // 終了縦線: midY から to.y まで
        const yMinEnd = Math.min(midY, to.y);
        const yMaxEnd = Math.max(midY, to.y);
        reservedVerticalLines.push({ x: Math.round(endX), yMin: yMinEnd, yMax: yMaxEnd });
      }

      return `M ${actualStartX} ${from.y} L ${actualStartX} ${midY} L ${endX} ${midY} L ${endX} ${to.y}`;
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
