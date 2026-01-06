/**
 * Core type definitions for gospelo-architect
 * gospelo™ Specification 1.0
 */

// ============================================================================
// gospelo 1.0 Root Structure
// ============================================================================

/**
 * gospelo specification version
 */
export const GOSPELO_VERSION = '1.0';

/**
 * Asset metadata for gospelo document
 */
export interface Asset {
  /** gospelo specification version (required) */
  version: string;
  /** Tool that generated this document */
  generator?: string;
  /** Copyright message for content attribution */
  copyright?: string;
  /** Minimum gospelo version required */
  minVersion?: string;
  /** Extension-specific data */
  extensions?: Record<string, unknown>;
  /** Application-specific data */
  extras?: unknown;
}

/**
 * Document type identifier
 */
export type DocumentType = 'diagram' | 'flowchart' | 'sequence';

/**
 * Base document interface (common properties for all document types)
 */
export interface BaseDocument {
  /** Document type identifier */
  type: DocumentType;
  /** Document title */
  title?: string;
  /** Document subtitle */
  subtitle?: string;
  /** Background configuration */
  background?: Background;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
  /** Extension-specific data */
  extensions?: Record<string, unknown>;
  /** Application-specific data */
  extras?: unknown;
}

/**
 * Diagram document (type: "diagram")
 */
export interface DiagramDocument extends BaseDocument {
  type: 'diagram';
  /** Array of node definitions */
  nodes: Node[];
  /** Array of connection definitions */
  connections?: Connection[];
  /** Named color definitions */
  colors?: ColorMap;
  /** Rendering hints */
  render?: RenderOptions;
}

/**
 * Union type for all document types
 */
export type GospeloDocument = DiagramDocument; // | FlowchartDocument | SequenceDocument

/**
 * gospelo 1.0 root document structure
 */
export interface GospeloRoot {
  /** Asset metadata (required) */
  asset: Asset;
  /** Names of extensions used in this document */
  extensionsUsed?: string[];
  /** Names of extensions required to load this document */
  extensionsRequired?: string[];
  /** Array of document definitions */
  documents?: GospeloDocument[];
  /** Extension-specific data */
  extensions?: Record<string, unknown>;
  /** Application-specific data */
  extras?: unknown;
}

// ============================================================================
// Node types
// ============================================================================

export type NodeType =
  | 'icon'
  | 'group'
  | 'composite'
  | 'text_box'
  | 'label'      // Simple text label without border
  | 'person'
  | 'person_pc_mobile'
  | 'pc_mobile'
  | 'pc';

// Connection types
export type ConnectionType = 'data' | 'auth' | 'flow';

// Connection line styles
export type ConnectionStyle = 'orthogonal' | 'curved' | 'solid' | 'dashed' | 'dotted';

// Connection sort strategy for routing optimization
export type ConnectionSortStrategy =
  | 'original'              // JSON定義順
  | 'vertical_length_desc'  // 縦線の長さが長い順
  | 'vertical_length_asc'   // 縦線の長さが短い順
  | 'target_y_asc'          // 目的地のY座標が小さい順（上から下）
  | 'target_y_desc'         // 目的地のY座標が大きい順（下から上）
  | 'source_x_asc'          // 出発地のX座標が小さい順（左から右）
  | 'source_x_desc'         // 出発地のX座標が大きい順（右から左）
  | 'bounding_box_aware';   // バウンディングボックス形状に基づく（横長→左X優先、縦長→上Y優先）

// Anchor side for connections
export type AnchorSide = 'top' | 'bottom' | 'left' | 'right';

// Label position for groups
export type LabelPosition = 'top-center' | 'top-left' | 'inside-top-left';

// Layout direction
export type LayoutDirection = 'horizontal' | 'vertical';

// Background types
export type BackgroundType = 'white' | 'solid' | 'gradient';

// Gradient direction
export type GradientDirection = 'south' | 'east' | 'north' | 'west';

/**
 * Background configuration
 */
export interface Background {
  type: BackgroundType;
  startColor?: string;
  endColor?: string;
  direction?: GradientDirection;
  color?: string; // for solid type
}

/**
 * Icon reference within composite node
 */
export interface IconRef {
  id: string;
  icon: string;
  label?: string;
}

/**
 * Position tuple
 */
export type Position = [number, number];

/**
 * Size tuple
 */
export type Size = [number, number];

/**
 * Node definition
 */
export interface Node {
  /** Unique identifier for the node (should start with @ for clarity) */
  id: string;
  type?: NodeType;
  icon?: string;
  label?: string;
  sublabel?: string;
  position?: Position;
  size?: Size;
  borderColor?: string;
  layout?: LayoutDirection;
  labelPosition?: LabelPosition;
  groupIcon?: string;
  children?: Node[];
  icons?: IconRef[]; // for composite type
  /** Parent node ID (required for group children) */
  parentId?: string;
}

/**
 * Connection between nodes
 */
export interface Connection {
  from: string;
  to: string;
  type?: ConnectionType;
  width?: number;
  color?: string;
  style?: ConnectionStyle;
  bidirectional?: boolean;
  label?: string;
  fromSide?: AnchorSide;  // 出口辺（省略時は自動決定）
  toSide?: AnchorSide;    // 入口辺（省略時は自動決定）
}

/**
 * Color definitions (preset names to hex codes)
 */
export interface ColorMap {
  [key: string]: string;
}

/**
 * Resource definition (icon with optional description)
 */
export interface Resource {
  /** Icon ID (e.g., "aws:lambda") */
  icon: string;
  /** Description of the resource's role */
  desc?: string;
}

/**
 * Resource map (node ID to resource definition)
 * Node IDs should start with @ for clarity
 * @example { "@api": { icon: "aws:api_gateway", desc: "Main API endpoint" } }
 */
export interface ResourceMap {
  [nodeId: string]: Resource;
}

/**
 * Complete diagram definition
 */
export interface DiagramDefinition {
  title: string;
  subtitle?: string;
  background?: Background;
  colors?: ColorMap;
  /** Resource definitions (node ID -> icon/desc mapping) */
  resources?: ResourceMap;
  nodes: Node[];
  connections?: Connection[];
  /** Connection routing sort strategy (auto-selected if not specified) */
  connectionSortStrategy?: ConnectionSortStrategy;
}

/**
 * Bounding box for connection anchors
 * アイコンノードの場合はアイコン部分のみ、グループの場合は枠全体
 */
export interface BoundingBox {
  left: number;    // 左端X座標
  top: number;     // 上端Y座標
  right: number;   // 右端X座標
  bottom: number;  // 下端Y座標
  centerX: number; // 中心X座標
  centerY: number; // 中心Y座標
  width: number;   // 幅
  height: number;  // 高さ
}

/**
 * Computed node properties after layout calculation
 */
export interface ComputedNode extends Node {
  computedX: number;
  computedY: number;
  computedWidth: number;
  computedHeight: number;
  /** 接続用の境界ボックス（絶対座標） */
  bounds?: BoundingBox;
}

/**
 * Render options
 */
export interface RenderOptions {
  width?: number;
  height?: number;
  iconSize?: number;
  fontSize?: number;
  embedCss?: boolean;
  externalIcons?: boolean;
  /** Original diagram width before paper size scaling (for content fitting) */
  originalWidth?: number;
  /** Original diagram height before paper size scaling (for content fitting) */
  originalHeight?: number;
  /** Paper orientation for print: 'landscape' or 'portrait' */
  paperOrientation?: 'landscape' | 'portrait';
}

/**
 * Default color presets (AWS colors)
 */
export const DEFAULT_COLORS: ColorMap = {
  blue: '#0073BB',
  orange: '#FF9900',
  dark: '#232F3E',
  gray: '#666666',
};

/**
 * Default render options
 */
export const DEFAULT_RENDER_OPTIONS: Required<RenderOptions> = {
  width: 1920,
  height: 1080,
  iconSize: 48,
  fontSize: 11,
  embedCss: true,
  externalIcons: true,
  originalWidth: 1920,
  originalHeight: 1080,
  paperOrientation: 'landscape',
};

/**
 * AI調整用メタデータ: ノード情報
 */
export interface NodeMeta {
  id: string;
  label?: string;
  sublabel?: string;
  icon?: string;
  type?: NodeType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  center: { x: number; y: number };
  /** 親ノードID（子ノードの場合） */
  parentId?: string;
}

/**
 * AI調整用メタデータ: 接続情報
 */
export interface ConnectionMeta {
  from: string;
  to: string;
  fromSide?: AnchorSide;
  toSide?: AnchorSide;
  color?: string;
  type?: ConnectionType;
}

/**
 * AI調整用メタデータ: レイアウト情報
 */
export interface LayoutMeta {
  rows: Array<{ y: number; nodes: string[] }>;
  columns: Array<{ x: number; nodes: string[] }>;
}

/**
 * AI調整用メタデータ: 全体
 * HTMLに埋め込まれ、AIがダイアグラムを理解・調整するために使用
 */
export interface DiagramMeta {
  version: string;
  title?: string;
  subtitle?: string;
  canvas: {
    width: number;
    height: number;
    gridSize: number;
  };
  nodes: NodeMeta[];
  connections: ConnectionMeta[];
  layout: LayoutMeta;
  sourceFile?: string;
  /** 元のダイアグラム定義（再構築用） */
  source?: DiagramDefinition & { render?: { width?: number; height?: number } };
}
