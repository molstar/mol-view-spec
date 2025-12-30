/**
 * Definitions of all 'nodes' used by the MolViewSpec format specification and its builder implementation.
 */

import type {
  AnimationKindT,
  ColorDictNameT,
  ColorListNameT,
  ColorT,
  ComponentSelectorT,
  CustomT,
  DescriptionFormatT,
  EasingKindT,
  InterpolationKindT,
  KindT,
  LabelAttachmentT,
  Mat3,
  Mat4,
  ParseFormatT,
  PrimitivePositionT,
  RefT,
  RepresentationTypeT,
  SchemaFormatT,
  SchemaT,
  StateTreeT,
  StructureTypeT,
  SurfaceTypeT,
  Vec3,
  VolumeRepresentationTypeT,
} from "./types.ts";
import { generateUUID, getTimestamp, VERSION } from "./utils.ts";

/**
 * Base implementation of all state tree nodes.
 */
export interface Node {
  kind: KindT;
  params?: Record<string, unknown>;
  children?: Node[];
  custom?: CustomT;
  ref?: RefT;
}

/**
 * Base implementation of animation state tree nodes.
 */
export interface AnimationNode {
  kind: AnimationKindT;
  params?: Record<string, unknown>;
  children?: AnimationNode[];
  custom?: CustomT;
  ref?: RefT;
}

/**
 * Top-level metadata for a MVS file (single-state or multi-state).
 */
export interface GlobalMetadata {
  title?: string;
  description?: string;
  description_format?: DescriptionFormatT;
  timestamp: string;
  version: string;
}

/**
 * Metadata for an individual snapshot.
 */
export interface SnapshotMetadata {
  title?: string;
  description?: string;
  description_format?: DescriptionFormatT;
  key?: string;
  linger_duration_ms: number;
  transition_duration_ms?: number;
}

/**
 * Root node of a single state tree with metadata.
 */
export interface State {
  kind: StateTreeT;
  root: Node;
  metadata: GlobalMetadata;
}

/**
 * Root node of an individual state tree (snapshot) within a collection of snapshots.
 */
export interface Snapshot {
  root: Node;
  metadata: SnapshotMetadata;
  animation?: AnimationNode;
}

/**
 * Root node of state descriptions that encompass multiple distinct state trees (snapshots).
 */
export interface States {
  kind: StateTreeT;
  metadata: GlobalMetadata;
  snapshots: Snapshot[];
}

export type MVSData = State | States;

/**
 * Download node parameters.
 */
export interface DownloadParams {
  url: string;
}

/**
 * Parse node parameters.
 */
export interface ParseParams {
  format: ParseFormatT;
}

/**
 * Coordinates node parameters.
 */
export interface CoordinatesParams {
  [key: string]: unknown;
}

/**
 * Structure node parameters.
 */
export interface StructureParams {
  type: StructureTypeT;
  assembly_id?: string;
  assembly_index?: number;
  model_index?: number;
  block_index?: number;
  block_header?: string;
  radius?: number;
  ijk_min?: Vec3<number>;
  ijk_max?: Vec3<number>;
  coordinates_ref?: string;
}

/**
 * Volume node parameters.
 */
export interface VolumeParams {
  channel_id?: string;
}

/**
 * Component expressions are used to make selections.
 */
export interface ComponentExpression {
  label_entity_id?: string;
  label_asym_id?: string;
  auth_asym_id?: string;
  label_seq_id?: number;
  auth_seq_id?: number;
  label_comp_id?: string;
  auth_comp_id?: string;
  pdbx_PDB_ins_code?: string;
  beg_label_seq_id?: number;
  end_label_seq_id?: number;
  beg_auth_seq_id?: number;
  end_auth_seq_id?: number;
  residue_index?: number;
  label_atom_id?: string;
  auth_atom_id?: string;
  type_symbol?: string;
  atom_id?: number;
  atom_index?: number;
  instance_id?: string;
}

/**
 * Component inline parameters.
 */
export interface ComponentInlineParams {
  selector?: ComponentSelectorT | ComponentExpression | ComponentExpression[];
}

/**
 * Component from URI parameters.
 */
export interface ComponentFromUriParams {
  uri: string;
  format?: SchemaFormatT;
  schema?: SchemaT;
  category_name?: string;
  field_name?: string;
  block_header?: string;
  block_index?: number;
  field_values?: (string | number)[];
}

/**
 * Component from source parameters.
 */
export interface ComponentFromSourceParams {
  category_name: string;
  field_name: string;
  block_header?: string;
  block_index?: number;
  schema?: SchemaT;
  field_values?: (string | number)[];
}

/**
 * Categorical palette.
 */
export interface CategoricalPalette {
  kind: "categorical";
  colors?: ColorListNameT | ColorDictNameT | ColorT[] | Record<string, ColorT>;
}

/**
 * Discrete palette.
 */
export interface DiscretePalette {
  kind: "discrete";
  domain: number[];
  colors: ColorT[];
}

/**
 * Continuous palette.
 */
export interface ContinuousPalette {
  kind: "continuous";
  domain: [number, number];
  colors: ColorT[];
}

export type Palette = CategoricalPalette | DiscretePalette | ContinuousPalette;

/**
 * Representation parameters.
 */
export interface RepresentationParams {
  type: RepresentationTypeT;
  [key: string]: unknown;
}

/**
 * Cartoon parameters.
 */
export interface CartoonParams {
  [key: string]: unknown;
}

/**
 * Backbone parameters.
 */
export interface BackboneParams {
  [key: string]: unknown;
}

/**
 * Ball and stick parameters.
 */
export interface BallAndStickParams {
  [key: string]: unknown;
}

/**
 * Line representation parameters.
 */
export interface LineRepresentationParams {
  [key: string]: unknown;
}

/**
 * Spacefill parameters.
 */
export interface SpacefillParams {
  [key: string]: unknown;
}

/**
 * Carbohydrate parameters.
 */
export interface CarbohydrateParams {
  [key: string]: unknown;
}

/**
 * Surface parameters.
 */
export interface SurfaceParams {
  surface_type?: SurfaceTypeT;
  [key: string]: unknown;
}

/**
 * Volume representation parameters.
 */
export interface VolumeRepresentationParams {
  type: VolumeRepresentationTypeT;
  [key: string]: unknown;
}

/**
 * Volume iso-surface parameters.
 */
export interface VolumeIsoSurfaceParams {
  iso_value?: number;
  [key: string]: unknown;
}

/**
 * Volume grid slice parameters.
 */
export interface VolumeGridSliceParams {
  dimension?: "x" | "y" | "z";
  index?: number;
  [key: string]: unknown;
}

/**
 * Clip plane parameters.
 */
export interface ClipPlaneParams {
  type: "plane";
  point: Vec3<number>;
  normal: Vec3<number>;
  check_transform?: Mat4<number> | null;
  invert?: boolean;
  variant?: "object" | "pixel";
}

/**
 * Clip sphere parameters.
 */
export interface ClipSphereParams {
  type: "sphere";
  center: Vec3<number>;
  radius?: number;
  check_transform?: Mat4<number> | null;
  invert?: boolean;
  variant?: "object" | "pixel";
}

/**
 * Clip box parameters.
 */
export interface ClipBoxParams {
  type: "box";
  center: Vec3<number>;
  size?: Vec3<number>;
  rotation?: Mat3<number>;
  check_transform?: Mat4<number> | null;
  invert?: boolean;
  variant?: "object" | "pixel";
}

export type ClipTypeParams = ClipPlaneParams | ClipSphereParams | ClipBoxParams;

/**
 * Color inline parameters.
 */
export interface ColorInlineParams {
  color?: ColorT;
  palette?: Palette;
}

/**
 * Color from URI parameters.
 */
export interface ColorFromUriParams {
  uri: string;
  format?: SchemaFormatT;
  schema?: SchemaT;
  category_name?: string;
  field_name?: string;
  block_header?: string;
  block_index?: number;
  field_remapping?: Record<string, string | null>;
  palette?: Palette;
  selector?: ComponentSelectorT | ComponentExpression | ComponentExpression[];
}

/**
 * Color from source parameters.
 */
export interface ColorFromSourceParams {
  category_name: string;
  field_name?: string;
  block_header?: string;
  block_index?: number;
  schema?: SchemaT;
  field_remapping?: Record<string, string | null>;
  palette?: Palette;
  selector?: ComponentSelectorT | ComponentExpression | ComponentExpression[];
}

/**
 * Opacity inline parameters.
 */
export interface OpacityInlineParams {
  opacity: number;
}

/**
 * Label inline parameters.
 */
export interface LabelInlineParams {
  text: string;
  attachment?: LabelAttachmentT;
}

/**
 * Label from URI parameters.
 */
export interface LabelFromUriParams {
  uri: string;
  attachment?: LabelAttachmentT;
}

/**
 * Label from source parameters.
 */
export interface LabelFromSourceParams {
  category_name: string;
  field_name: string;
  attachment?: LabelAttachmentT;
}

/**
 * Tooltip inline parameters.
 */
export interface TooltipInlineParams {
  text: string;
}

/**
 * Tooltip from URI parameters.
 */
export interface TooltipFromUriParams {
  uri: string;
}

/**
 * Tooltip from source parameters.
 */
export interface TooltipFromSourceParams {
  category_name: string;
  field_name: string;
}

/**
 * Focus inline parameters.
 */
export interface FocusInlineParams {
  target?: ComponentExpression | ComponentExpression[];
  direction?: Vec3<number>;
  up?: Vec3<number>;
  radius?: number;
}

/**
 * Transform parameters.
 */
export interface TransformParams {
  rotation?: Mat3<number>;
  translation?: Vec3<number>;
}

/**
 * Camera parameters.
 */
export interface CameraParams {
  target?: Vec3<number>;
  position?: Vec3<number>;
  up?: Vec3<number>;
}

/**
 * Canvas parameters.
 */
export interface CanvasParams {
  background_color?: ColorT;
}

/**
 * Primitive component expressions.
 */
export interface PrimitiveComponentExpressions {
  start?: ComponentExpression;
  end?: ComponentExpression;
  center?: ComponentExpression;
}

/**
 * Primitives parameters.
 */
export interface PrimitivesParams {
  color?: ColorT;
  label_color?: ColorT;
  tooltip?: string;
  [key: string]: unknown;
}

/**
 * Mesh parameters.
 */
export interface MeshParams {
  positions: number[][];
  indices: number[][];
  colors?: number[][];
  [key: string]: unknown;
}

/**
 * Lines parameters.
 */
export interface LinesParams {
  positions: number[][];
  indices?: number[][];
  colors?: number[][];
  [key: string]: unknown;
}

/**
 * Tube parameters.
 */
export interface TubeParams {
  start: PrimitivePositionT;
  end: PrimitivePositionT;
  radius?: number;
  expressions?: PrimitiveComponentExpressions;
  [key: string]: unknown;
}

/**
 * Arrow parameters.
 */
export interface ArrowParams {
  start: PrimitivePositionT;
  end: PrimitivePositionT;
  radius?: number;
  shaft_radius_scale?: number;
  head_length_scale?: number;
  expressions?: PrimitiveComponentExpressions;
  [key: string]: unknown;
}

/**
 * Distance measurement parameters.
 */
export interface DistanceMeasurementParams {
  start: PrimitivePositionT;
  end: PrimitivePositionT;
  expressions?: PrimitiveComponentExpressions;
  [key: string]: unknown;
}

/**
 * Angle measurement parameters.
 */
export interface AngleMeasurementParams {
  start: PrimitivePositionT;
  apex: PrimitivePositionT;
  end: PrimitivePositionT;
  expressions?: {
    start?: ComponentExpression;
    apex?: ComponentExpression;
    end?: ComponentExpression;
  };
  [key: string]: unknown;
}

/**
 * Primitive label parameters.
 */
export interface PrimitiveLabelParams {
  text: string;
  position: PrimitivePositionT;
  expressions?: { position?: ComponentExpression };
  [key: string]: unknown;
}

/**
 * Ellipse parameters.
 */
export interface EllipseParams {
  center: PrimitivePositionT;
  major_axis: PrimitivePositionT;
  minor_axis: PrimitivePositionT;
  expressions?: {
    center?: ComponentExpression;
    major_axis?: ComponentExpression;
    minor_axis?: ComponentExpression;
  };
  [key: string]: unknown;
}

/**
 * Ellipsoid parameters.
 */
export interface EllipsoidParams {
  center: PrimitivePositionT;
  major_axis: PrimitivePositionT;
  minor_axis: PrimitivePositionT;
  expressions?: {
    center?: ComponentExpression;
    major_axis?: ComponentExpression;
    minor_axis?: ComponentExpression;
  };
  [key: string]: unknown;
}

/**
 * Box parameters.
 */
export interface BoxParams {
  corner_a: PrimitivePositionT;
  corner_b: PrimitivePositionT;
  expressions?: {
    corner_a?: ComponentExpression;
    corner_b?: ComponentExpression;
  };
  [key: string]: unknown;
}

/**
 * Primitives from URI parameters.
 */
export interface PrimitivesFromUriParams {
  uri: string;
}

/**
 * Animation parameters.
 */
export interface AnimationParams {
  key?: string;
  [key: string]: unknown;
}

/**
 * Interpolation parameters.
 */
export interface InterpolationParams {
  kind: InterpolationKindT;
  duration_ms: number;
  easing?: EasingKindT;
  [key: string]: unknown;
}

/**
 * Scalar interpolation parameters.
 */
export interface ScalarInterpolationParams {
  from: number;
  to: number;
  duration_ms: number;
  easing?: EasingKindT;
  [key: string]: unknown;
}

/**
 * Vec3 interpolation parameters.
 */
export interface Vec3InterpolationParams {
  from: Vec3<number>;
  to: Vec3<number>;
  duration_ms: number;
  easing?: EasingKindT;
  [key: string]: unknown;
}

/**
 * Rotation matrix interpolation parameters.
 */
export interface RotationMatrixInterpolationParams {
  from: Mat3<number>;
  to: Mat3<number>;
  duration_ms: number;
  easing?: EasingKindT;
  [key: string]: unknown;
}

/**
 * Color interpolation parameters.
 */
export interface ColorInterpolationParams {
  from: ColorT;
  to: ColorT;
  duration_ms: number;
  easing?: EasingKindT;
  [key: string]: unknown;
}

/**
 * Transformation matrix interpolation parameters.
 */
export interface TransformationMatrixInterpolationParams {
  from: Mat4<number>;
  to: Mat4<number>;
  duration_ms: number;
  easing?: EasingKindT;
  [key: string]: unknown;
}

export type InterpolationKindParams =
  | ScalarInterpolationParams
  | Vec3InterpolationParams
  | RotationMatrixInterpolationParams
  | ColorInterpolationParams
  | TransformationMatrixInterpolationParams;

/**
 * Find a child node by reference.
 */
export function findRef(node: Node, ref: string): Node | null {
  if (node.ref === ref) {
    return node;
  }

  if (!node.children) {
    return null;
  }

  for (const child of node.children) {
    const found = findRef(child, ref);
    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * Create a GlobalMetadata object with default values.
 */
export function createGlobalMetadata(options: {
  title?: string;
  description?: string;
  description_format?: DescriptionFormatT;
}): GlobalMetadata {
  return {
    title: options.title,
    description: options.description,
    description_format: options.description_format,
    timestamp: getTimestamp(),
    version: VERSION,
  };
}

/**
 * Create a SnapshotMetadata object with default values.
 */
export function createSnapshotMetadata(options: {
  title?: string;
  description?: string;
  description_format?: DescriptionFormatT;
  key?: string;
  linger_duration_ms: number;
  transition_duration_ms?: number;
}): SnapshotMetadata {
  return {
    title: options.title,
    description: options.description,
    description_format: options.description_format,
    key: options.key || generateUUID(),
    linger_duration_ms: options.linger_duration_ms,
    transition_duration_ms: options.transition_duration_ms,
  };
}

/**
 * Validate state tree structure.
 */
export function validateStateTree(data: MVSData): boolean {
  if ("root" in data && data.root && data.metadata) {
    return true;
  }
  if ("snapshots" in data && data.snapshots && data.metadata) {
    return true;
  }
  return false;
}
