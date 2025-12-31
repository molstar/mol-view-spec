/**
 * Fluent builder API for creating MolViewSpec state trees.
 */

// deno-lint-ignore-file no-unused-vars
import type {
  ClipTypeT,
  ColorT,
  ComponentSelectorT,
  CustomT,
  DescriptionFormatT,
  EasingKindT,
  Mat3,
  Mat4,
  ParseFormatT,
  PrimitivePositionT,
  RefT,
  RepresentationTypeT,
  SchemaFormatT,
  SchemaT,
  Vec3,
  VolumeRepresentationTypeT,
} from "./types.ts";
import type {
  AngleMeasurementParams,
  AnimationNode,
  AnimationParams,
  ArrowParams,
  BoxParams,
  CameraParams,
  CanvasParams,
  ClipBoxParams,
  ClipPlaneParams,
  ClipSphereParams,
  ColorFromSourceParams,
  ColorFromUriParams,
  ColorInlineParams,
  ComponentExpression,
  ComponentFromSourceParams,
  ComponentFromUriParams,
  ComponentInlineParams,
  CoordinatesParams,
  DistanceMeasurementParams,
  DownloadParams,
  EllipseParams,
  EllipsoidParams,
  FocusInlineParams,
  GlobalMetadata,
  InstanceParams,
  LabelFromSourceParams,
  LabelFromUriParams,
  LabelInlineParams,
  LinesParams,
  MeshParams,
  Node,
  NodeParams,
  OpacityInlineParams,
  Palette,
  ParseParams,
  PrimitiveLabelParams,
  PrimitivesFromUriParams,
  PrimitivesParams,
  RepresentationParams,
  Snapshot,
  SnapshotMetadata,
  State,
  States,
  StructureParams,
  TooltipFromSourceParams,
  TooltipFromUriParams,
  TooltipInlineParams,
  TransformParams,
  TubeParams,
  VolumeParams,
} from "./nodes.ts";
import { createGlobalMetadata, createSnapshotMetadata } from "./nodes.ts";
import { excludeNone, makeParams } from "./utils.ts";

/**
 * Creates a new MolViewSpec builder instance for constructing molecular visualizations.
 *
 * This is the primary entry point for building MolViewSpec state trees using a fluent API.
 * The builder pattern provides a type-safe, chainable interface for creating complex
 * molecular visualization scenes.
 *
 * @returns A new Root builder instance to start building your visualization
 *
 * @example Basic structure visualization
 * ```typescript
 * import { createBuilder } from "@molstar/molviewspec";
 *
 * const builder = createBuilder();
 * const structure = builder
 *   .download({ url: "https://www.ebi.ac.uk/pdbe/entry-files/1cbs.cif" })
 *   .parse({ format: "mmcif" })
 *   .modelStructure()
 *   .component({ selector: "polymer" })
 *   .representation({ type: "cartoon" })
 *   .color({ color: "green" });
 *
 * const state = builder.getState();
 * ```
 *
 * @example Multiple representations with different colors
 * ```typescript
 * const builder = createBuilder();
 * builder
 *   .download({ url: "https://www.ebi.ac.uk/pdbe/entry-files/1cbs.cif" })
 *   .parse({ format: "mmcif" })
 *   .modelStructure()
 *   .component({ selector: "protein" })
 *   .representation({ type: "cartoon" })
 *   .color({ color: "cyan" });
 *
 * builder
 *   .component({ selector: "ligand" })
 *   .representation({ type: "ball_and_stick" })
 *   .color({ color: "red" });
 *
 * const state = builder.getState();
 * ```
 *
 * @example Working with camera and focus
 * ```typescript
 * const builder = createBuilder();
 * builder
 *   .canvas({ background_color: "#ffffff" })
 *   .camera({
 *     target: [0, 0, 0],
 *     position: [50, 50, 50],
 *   });
 *
 * builder
 *   .download({ url: "https://www.ebi.ac.uk/pdbe/entry-files/1cbs.cif" })
 *   .parse({ format: "mmcif" })
 *   .modelStructure()
 *   .component()
 *   .representation({ type: "cartoon" })
 *   .color({ color: "blue" })
 *   .focus({
 *     target: { selector: { label_asym_id: "A" } },
 *   });
 * ```
 *
 * @example Export to different formats
 * ```typescript
 * const builder = createBuilder();
 * // ... build your visualization ...
 *
 * // Get the state tree
 * const state = builder.getState();
 *
 * // Export to MVSJ (JSON format)
 * import { stateToMVSJ } from "@molstar/molviewspec";
 * const mvsj = stateToMVSJ(state);
 * console.log(mvsj.dumps());
 *
 * // Export to MVSX (ZIP archive format)
 * import { mvsjToMvsx } from "@molstar/molviewspec";
 * const mvsx = mvsjToMvsx(state.root);
 * await mvsx.dump("visualization.mvsx");
 * ```
 *
 * @see {@link https://molstar.org/mol-view-spec/docs/specification/ | MolViewSpec Specification}
 * @see {@link Root} for available root-level methods
 */
export function createBuilder(): Root {
  return new Root();
}

/**
 * Base builder class.
 */
class Base {
  protected root: Root;
  protected node: Node;

  constructor(root: Root, node: Node) {
    this.root = root;
    this.node = node;
  }

  protected addChild(node: Node): void {
    if (!this.node.children) {
      this.node.children = [];
    }
    this.node.children.push(node);
  }

  protected getRoot(): Root {
    return this.root;
  }

  protected getNode(): Node {
    return this.node;
  }
}

/**
 * Root builder class.
 */
export class Root {
  private rootNode: Node;
  private snapshots: Snapshot[] = [];
  private globalMeta?: GlobalMetadata;

  constructor() {
    this.rootNode = { kind: "root" };
  }

  getNode(): Node {
    return this.rootNode;
  }

  private addChild(node: Node): void {
    if (!this.rootNode.children) {
      this.rootNode.children = [];
    }
    this.rootNode.children.push(node);
  }

  /**
   * Get the current snapshot.
   */
  getSnapshot(options: {
    title?: string;
    description?: string;
    description_format?: DescriptionFormatT;
    linger_duration_ms: number;
    transition_duration_ms?: number;
  }): Snapshot {
    return {
      root: this.rootNode,
      metadata: createSnapshotMetadata(options),
    };
  }

  /**
   * Get the current state.
   */
  getState(options?: {
    title?: string;
    description?: string;
    description_format?: DescriptionFormatT;
  }): State {
    return {
      kind: "single",
      root: this.rootNode,
      metadata: createGlobalMetadata(options || {}),
    };
  }

  /**
   * Save the current state as a snapshot and continue building.
   */
  saveState(options: {
    title?: string;
    description?: string;
    description_format?: DescriptionFormatT;
    linger_duration_ms: number;
    transition_duration_ms?: number;
  }): Root {
    this.snapshots.push(this.getSnapshot(options));
    this.rootNode = { kind: "root" };
    return this;
  }

  /**
   * Get all saved states as a States object.
   */
  getStates(options?: {
    title?: string;
    description?: string;
    description_format?: DescriptionFormatT;
  }): States {
    return {
      kind: "multiple",
      metadata: createGlobalMetadata(options || {}),
      snapshots: this.snapshots,
    };
  }

  /**
   * Add a camera node.
   */
  camera(params: CameraParams, custom?: CustomT, ref?: RefT): Root {
    const node: Node = {
      kind: "camera",
      params: makeParams(params as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a canvas node.
   */
  canvas(params: CanvasParams, custom?: CustomT, ref?: RefT): Root {
    const node: Node = {
      kind: "canvas",
      params: makeParams(params as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a download node.
   *
   * @param params - Download parameters
   * @param params.url - The URL to download from (required)
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Basic download
   * ```typescript
   * builder.download({ url: "https://www.ebi.ac.uk/pdbe/entry-files/1cbs.cif" })
   * ```
   *
   * @example Download with custom data
   * ```typescript
   * builder.download({
   *   url: "https://files.rcsb.org/download/1cbs.pdb",
   *   custom: { source: "RCSB" }
   * })
   * ```
   *
   * @example Download with reference
   * ```typescript
   * builder.download({
   *   url: "https://www.ebi.ac.uk/pdbe/entry-files/1cbs.cif",
   *   ref: "main-structure"
   * })
   * ```
   */
  download(
    params: DownloadParams & { custom?: CustomT; ref?: RefT },
  ): Download {
    const { url, custom, ref, ...rest } = params;
    const node: Node = {
      kind: "download",
      params: makeParams({ url, ...rest } as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return new Download(this, node);
  }

  /**
   * Add primitives node.
   *
   * @param params - Primitives parameters
   * @param params.color - Optional default color for primitives
   * @param params.label_color - Optional default label color
   * @param params.tooltip - Optional default tooltip text
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Basic primitives
   * ```typescript
   * builder.primitives()
   * ```
   *
   * @example Primitives with default color
   * ```typescript
   * builder.primitives({ color: "blue" })
   * ```
   *
   * @example Primitives with label color
   * ```typescript
   * builder.primitives({
   *   color: "red",
   *   label_color: "white"
   * })
   * ```
   *
   * @example Primitives with tooltip
   * ```typescript
   * builder.primitives({
   *   color: "green",
   *   tooltip: "Custom primitives"
   * })
   * ```
   *
   * @example Primitives with custom data
   * ```typescript
   * builder.primitives({
   *   color: "yellow",
   *   custom: { primitive_group: "annotations" }
   * })
   * ```
   *
   * @example Primitives with reference
   * ```typescript
   * builder.primitives({
   *   ref: "custom-shapes"
   * })
   * ```
   */
  primitives(
    params: Partial<PrimitivesParams> & {
      custom?: CustomT;
      ref?: RefT;
    } = {},
  ): Primitives {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "primitives",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return new Primitives(this, node);
  }

  /**
   * Add primitives from URI node.
   *
   * @param params - Primitives from URI parameters
   * @param params.uri - URI to load primitives from
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Load primitives from URI
   * ```typescript
   * builder.primitivesFromUri({ uri: "primitives.json" })
   * ```
   *
   * @example With custom data
   * ```typescript
   * builder.primitivesFromUri({
   *   uri: "primitives.json",
   *   custom: { source: "external" }
   * })
   * ```
   */
  primitivesFromUri(
    params: PrimitivesFromUriParams & { custom?: CustomT; ref?: RefT },
  ): Root {
    const { uri, custom, ref, ...rest } = params;
    const node: Node = {
      kind: "primitives_from_uri",
      params: makeParams({ uri, ...rest } as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add an animation node.
   *
   * @param params - Animation parameters
   * @param params.frame_time_ms - Optional frame time in milliseconds (default: 1000/60)
   * @param params.duration_ms - Optional total duration
   * @param params.autoplay - Whether to autoplay (default: true)
   * @param params.loop - Whether to loop (default: false)
   * @param params.include_camera - Include camera state (default: false)
   * @param params.include_canvas - Include canvas state (default: false)
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Basic animation
   * ```typescript
   * builder.animation()
   * ```
   *
   * @example Animation with custom settings
   * ```typescript
   * builder.animation({
   *   frame_time_ms: 16.67,
   *   duration_ms: 5000,
   *   autoplay: true,
   *   loop: true
   * })
   * ```
   *
   * @example Animation with camera
   * ```typescript
   * builder.animation({
   *   include_camera: true,
   *   include_canvas: true
   * })
   * ```
   */
  animation(
    params: Partial<AnimationParams> & {
      custom?: CustomT;
      ref?: RefT;
    } = {},
  ): Root {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "animation",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }
}

/**
 * Download builder class.
 */
export class Download extends Base {
  /**
   * Add a parse node.
   *
   * @param params - Parse parameters
   * @param params.format - The format to parse (required)
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Parse mmCIF format
   * ```typescript
   * download.parse({ format: "mmcif" })
   * ```
   *
   * @example Parse PDB format
   * ```typescript
   * download.parse({ format: "pdb" })
   * ```
   *
   * @example Parse with custom data
   * ```typescript
   * download.parse({
   *   format: "mmcif",
   *   custom: { parser_version: "1.0" }
   * })
   * ```
   *
   * @example Parse with reference
   * ```typescript
   * download.parse({
   *   format: "mmcif",
   *   ref: "parsed-structure"
   * })
   * ```
   */
  parse(params: ParseParams & { custom?: CustomT; ref?: RefT }): Parse {
    const { format, custom, ref, ...rest } = params;
    const node: Node = {
      kind: "parse",
      params: makeParams({ format, ...rest } as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return new Parse(this.root, node);
  }
}

/**
 * Parse builder class.
 */
export class Parse extends Base {
  /**
   * Add a model structure node.
   */
  modelStructure(
    params?: Partial<StructureParams>,
    custom?: CustomT,
    ref?: RefT,
  ): Structure {
    const node: Node = {
      kind: "structure",
      params: makeParams({ ...params, type: "model" }),
      custom,
      ref,
    };
    this.addChild(node);
    return new Structure(this.root, node);
  }

  /**
   * Add an assembly structure node.
   */
  assemblyStructure(
    params?: Partial<StructureParams>,
    custom?: CustomT,
    ref?: RefT,
  ): Structure {
    const node: Node = {
      kind: "structure",
      params: makeParams({ ...params, type: "assembly" }),
      custom,
      ref,
    };
    this.addChild(node);
    return new Structure(this.root, node);
  }

  /**
   * Add a symmetry structure node.
   */
  symmetryStructure(
    params?: Partial<StructureParams>,
    custom?: CustomT,
    ref?: RefT,
  ): Structure {
    const node: Node = {
      kind: "structure",
      params: makeParams({ ...params, type: "symmetry" }),
      custom,
      ref,
    };
    this.addChild(node);
    return new Structure(this.root, node);
  }

  /**
   * Add a symmetry mates structure node.
   */
  symmetryMatesStructure(
    params?: Partial<StructureParams>,
    custom?: CustomT,
    ref?: RefT,
  ): Structure {
    const node: Node = {
      kind: "structure",
      params: makeParams({
        ...params,
        type: "symmetry_mates",
      }),
      custom,
      ref,
    };
    this.addChild(node);
    return new Structure(this.root, node);
  }

  /**
   * Add a volume node.
   */
  volume(params?: VolumeParams, custom?: CustomT, ref?: RefT): Volume {
    const node: Node = {
      kind: "volume",
      params: makeParams(params as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return new Volume(this.root, node);
  }

  /**
   * Add a coordinates node.
   */
  coordinates(
    params?: CoordinatesParams,
    custom?: CustomT,
    ref?: RefT,
  ): Structure {
    const node: Node = {
      kind: "coordinates",
      params: makeParams(params as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return new Structure(this.root, node);
  }
}

/**
 * Structure builder class.
 */
export class Structure extends Base {
  /**
   * Add a component node.
   *
   * @param params - Component parameters
   * @param params.selector - The component selector (defaults to "all")
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Default selector (all)
   * ```typescript
   * structure.component()  // Uses default "all"
   * ```
   *
   * @example Select polymer
   * ```typescript
   * structure.component({ selector: "polymer" })
   * ```
   *
   * @example Select ligand
   * ```typescript
   * structure.component({ selector: "ligand" })
   * ```
   *
   * @example Select with expression
   * ```typescript
   * structure.component({
   *   selector: { label_asym_id: "A", label_seq_id: 10 }
   * })
   * ```
   *
   * @example Select with multiple expressions
   * ```typescript
   * structure.component({
   *   selector: [
   *     { label_asym_id: "A" },
   *     { label_asym_id: "B" }
   *   ]
   * })
   * ```
   *
   * @example Select with custom data
   * ```typescript
   * structure.component({
   *   selector: "polymer",
   *   custom: { description: "Main chain" }
   * })
   * ```
   */
  component(
    params: Partial<ComponentInlineParams> & {
      custom?: CustomT;
      ref?: RefT;
    } = {},
  ): Component {
    const { selector = "all", custom, ref, ...rest } = params;
    const node: Node = {
      kind: "component",
      params: makeParams({ selector, ...rest } as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return new Component(this.root, node);
  }

  /**
   * Add a component from URI node.
   */
  componentFromUri(
    params: ComponentFromUriParams,
    custom?: CustomT,
    ref?: RefT,
  ): Component {
    const node: Node = {
      kind: "component_from_uri",
      params: makeParams(params as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return new Component(this.root, node);
  }

  /**
   * Add a component from source node.
   */
  componentFromSource(
    params: ComponentFromSourceParams,
    custom?: CustomT,
    ref?: RefT,
  ): Component {
    const node: Node = {
      kind: "component_from_source",
      params: makeParams(params as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return new Component(this.root, node);
  }

  /**
   * Add a transform node.
   */
  transform(params: TransformParams, custom?: CustomT, ref?: RefT): Structure {
    const node: Node = {
      kind: "transform",
      params: makeParams(params as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return new Structure(this.root, node);
  }

  /**
   * Add a focus node.
   */
  focus(params: FocusInlineParams, custom?: CustomT, ref?: RefT): Structure {
    const node: Node = {
      kind: "focus",
      params: makeParams(params as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add an instance node.
   *
   * @param params - Instance parameters
   * @param params.rotation - Optional rotation matrix
   * @param params.rotation_center - Optional rotation center point or "centroid"
   * @param params.translation - Optional translation vector
   * @param params.matrix - Optional transformation matrix (takes precedence)
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Basic instance with translation
   * ```typescript
   * structure.instance({ translation: [10, 0, 0] })
   * ```
   *
   * @example Instance with rotation
   * ```typescript
   * structure.instance({
   *   rotation: [1, 0, 0, 0, 1, 0, 0, 0, 1],
   *   rotation_center: [0, 0, 0]
   * })
   * ```
   *
   * @example Instance with transformation matrix
   * ```typescript
   * structure.instance({
   *   matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 0, 0, 1]
   * })
   * ```
   */
  instance(
    params: Partial<InstanceParams> & { custom?: CustomT; ref?: RefT } = {},
  ): Structure {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "instance",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return new Structure(this.root, node);
  }

  /**
   * Add a clip node.
   *
   * @param params - Clip parameters (plane, sphere, or box)
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Clip with plane
   * ```typescript
   * structure.clip({
   *   type: "plane",
   *   point: [0, 0, 0],
   *   normal: [0, 1, 0]
   * })
   * ```
   *
   * @example Clip with sphere
   * ```typescript
   * structure.clip({
   *   type: "sphere",
   *   center: [0, 0, 0],
   *   radius: 10
   * })
   * ```
   *
   * @example Clip with box
   * ```typescript
   * structure.clip({
   *   type: "box",
   *   center: [0, 0, 0],
   *   size: [10, 10, 10]
   * })
   * ```
   */
  clip(
    params: (ClipPlaneParams | ClipSphereParams | ClipBoxParams) & {
      custom?: CustomT;
      ref?: RefT;
    },
  ): Structure {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "clip",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a primitives node.
   *
   * @param params - Primitives parameters
   * @param params.color - Optional default color for primitives
   * @param params.label_color - Optional default label color
   * @param params.tooltip - Optional default tooltip text
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Basic primitives
   * ```typescript
   * structure.primitives()
   * ```
   *
   * @example Primitives with default color
   * ```typescript
   * structure.primitives({ color: "blue" })
   * ```
   */
  primitives(
    params: Partial<PrimitivesParams> & {
      custom?: CustomT;
      ref?: RefT;
    } = {},
  ): Primitives {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "primitives",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return new Primitives(this.root, node);
  }

  /**
   * Add a primitives from URI node.
   *
   * @param params - Primitives from URI parameters
   * @param params.uri - URI to load primitives from
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Load primitives from URI
   * ```typescript
   * structure.primitivesFromUri({ uri: "primitives.json" })
   * ```
   */
  primitivesFromUri(
    params: PrimitivesFromUriParams & { custom?: CustomT; ref?: RefT },
  ): Structure {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "primitives_from_uri",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a label from URI node.
   *
   * @param params - Label from URI parameters
   * @param params.uri - URI to load labels from
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Load labels from URI
   * ```typescript
   * structure.labelFromUri({ uri: "labels.json" })
   * ```
   */
  labelFromUri(
    params: LabelFromUriParams & { custom?: CustomT; ref?: RefT },
  ): Structure {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "label_from_uri",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a label from source node.
   *
   * @param params - Label from source parameters
   * @param params.category_name - Category name in the source file
   * @param params.field_name - Field name in the source file
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Load labels from source
   * ```typescript
   * structure.labelFromSource({
   *   category_name: "atom_site",
   *   field_name: "label"
   * })
   * ```
   */
  labelFromSource(
    params: LabelFromSourceParams & { custom?: CustomT; ref?: RefT },
  ): Structure {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "label_from_source",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a tooltip from URI node.
   *
   * @param params - Tooltip from URI parameters
   * @param params.uri - URI to load tooltips from
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Load tooltips from URI
   * ```typescript
   * structure.tooltipFromUri({ uri: "tooltips.json" })
   * ```
   */
  tooltipFromUri(
    params: TooltipFromUriParams & { custom?: CustomT; ref?: RefT },
  ): Structure {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "tooltip_from_uri",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a tooltip from source node.
   *
   * @param params - Tooltip from source parameters
   * @param params.category_name - Category name in the source file
   * @param params.field_name - Field name in the source file
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Load tooltips from source
   * ```typescript
   * structure.tooltipFromSource({
   *   category_name: "atom_site",
   *   field_name: "tooltip"
   * })
   * ```
   */
  tooltipFromSource(
    params: TooltipFromSourceParams & { custom?: CustomT; ref?: RefT },
  ): Structure {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "tooltip_from_source",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }
}

/**
 * Component builder class.
 */
export class Component extends Base {
  /**
   * Add a representation node.
   *
   * @param params - Representation parameters including type and optional settings
   * @param params.type - The representation type (defaults to "cartoon")
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Default cartoon representation
   * ```typescript
   * component.representation()  // Uses default "cartoon"
   * ```
   *
   * @example Explicit cartoon representation
   * ```typescript
   * component.representation({ type: "cartoon" })
   * ```
   *
   * @example Ball and stick with transparency
   * ```typescript
   * component.representation({
   *   type: "ball_and_stick",
   *   alpha: 0.8,
   *   size_factor: 1.5
   * })
   * ```
   *
   * @example Cartoon with custom data
   * ```typescript
   * component.representation({
   *   type: "cartoon",
   *   custom: { myData: "value" }
   * })
   * ```
   */
  representation(
    params: Partial<RepresentationParams> & {
      custom?: CustomT;
      ref?: RefT;
    } = {},
  ): Representation {
    const { type = "cartoon", custom, ref, ...rest } = params;

    const node: Node = {
      kind: "representation",
      params: makeParams({ type, ...rest } as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return new Representation(this.root, node);
  }

  /**
   * Add a label node.
   *
   * @param params - Label parameters
   * @param params.text - The label text (required)
   * @param params.attachment - Optional label attachment type
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Basic label
   * ```typescript
   * component.label({ text: "Active Site" })
   * ```
   *
   * @example Label with attachment
   * ```typescript
   * component.label({
   *   text: "Residue A100",
   *   attachment: "middle-center"
   * })
   * ```
   *
   * @example Label with custom data
   * ```typescript
   * component.label({
   *   text: "Important Region",
   *   custom: { category: "annotation" }
   * })
   * ```
   *
   * @example Label with reference
   * ```typescript
   * component.label({
   *   text: "Chain A",
   *   ref: "chain-a-label"
   * })
   * ```
   */
  label(
    params: LabelInlineParams & { custom?: CustomT; ref?: RefT },
  ): Component {
    const { text, attachment, custom, ref, ...rest } = params;
    const node: Node = {
      kind: "label",
      params: makeParams({ text, attachment, ...rest } as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a tooltip node.
   *
   * @param params - Tooltip parameters
   * @param params.text - The tooltip text (required)
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Basic tooltip
   * ```typescript
   * component.tooltip({ text: "This is the active site" })
   * ```
   *
   * @example Tooltip with custom data
   * ```typescript
   * component.tooltip({
   *   text: "Binding pocket",
   *   custom: { category: "functional-site" }
   * })
   * ```
   *
   * @example Tooltip with reference
   * ```typescript
   * component.tooltip({
   *   text: "Important residue",
   *   ref: "residue-tooltip"
   * })
   * ```
   *
   * @example Multi-line tooltip
   * ```typescript
   * component.tooltip({
   *   text: "Chain A\nResidue: GLY 100\nRole: Structural"
   * })
   * ```
   */
  tooltip(
    params: TooltipInlineParams & { custom?: CustomT; ref?: RefT },
  ): Component {
    const { text, custom, ref, ...rest } = params;
    const node: Node = {
      kind: "tooltip",
      params: makeParams({ text, ...rest } as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a transform node.
   */
  transform(params: TransformParams, custom?: CustomT, ref?: RefT): Component {
    const node: Node = {
      kind: "transform",
      params: makeParams(params as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a focus node.
   */
  focus(params: FocusInlineParams, custom?: CustomT, ref?: RefT): Component {
    const node: Node = {
      kind: "focus",
      params: makeParams(params as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add an instance node.
   *
   * @param params - Instance parameters
   * @param params.rotation - Optional rotation matrix
   * @param params.rotation_center - Optional rotation center point or "centroid"
   * @param params.translation - Optional translation vector
   * @param params.matrix - Optional transformation matrix (takes precedence)
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Basic instance with translation
   * ```typescript
   * component.instance({ translation: [10, 0, 0] })
   * ```
   *
   * @example Instance with rotation
   * ```typescript
   * component.instance({
   *   rotation: [1, 0, 0, 0, 1, 0, 0, 0, 1],
   *   rotation_center: [0, 0, 0]
   * })
   * ```
   */
  instance(
    params: Partial<InstanceParams> & { custom?: CustomT; ref?: RefT } = {},
  ): Component {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "instance",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return new Component(this.root, node);
  }

  /**
   * Add a clip node.
   *
   * @param params - Clip parameters (plane, sphere, or box)
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Clip with plane
   * ```typescript
   * component.clip({
   *   type: "plane",
   *   point: [0, 0, 0],
   *   normal: [0, 1, 0]
   * })
   * ```
   */
  clip(
    params: (ClipPlaneParams | ClipSphereParams | ClipBoxParams) & {
      custom?: CustomT;
      ref?: RefT;
    },
  ): Component {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "clip",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a primitives node.
   *
   * @param params - Primitives parameters
   * @param params.color - Optional default color for primitives
   * @param params.label_color - Optional default label color
   * @param params.tooltip - Optional default tooltip text
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Basic primitives
   * ```typescript
   * component.primitives()
   * ```
   *
   * @example Primitives with default color
   * ```typescript
   * component.primitives({ color: "blue" })
   * ```
   */
  primitives(
    params: Partial<PrimitivesParams> & {
      custom?: CustomT;
      ref?: RefT;
    } = {},
  ): Primitives {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "primitives",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return new Primitives(this.root, node);
  }

  /**
   * Add a primitives from URI node.
   *
   * @param params - Primitives from URI parameters
   * @param params.uri - URI to load primitives from
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Load primitives from URI
   * ```typescript
   * component.primitivesFromUri({ uri: "primitives.json" })
   * ```
   */
  primitivesFromUri(
    params: PrimitivesFromUriParams & { custom?: CustomT; ref?: RefT },
  ): Component {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "primitives_from_uri",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a label from URI node.
   *
   * @param params - Label from URI parameters
   * @param params.uri - URI to load labels from
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Load labels from URI
   * ```typescript
   * component.labelFromUri({ uri: "labels.json" })
   * ```
   */
  labelFromUri(
    params: LabelFromUriParams & { custom?: CustomT; ref?: RefT },
  ): Component {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "label_from_uri",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a label from source node.
   *
   * @param params - Label from source parameters
   * @param params.category_name - Category name in the source file
   * @param params.field_name - Field name in the source file
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Load labels from source
   * ```typescript
   * component.labelFromSource({
   *   category_name: "atom_site",
   *   field_name: "label"
   * })
   * ```
   */
  labelFromSource(
    params: LabelFromSourceParams & { custom?: CustomT; ref?: RefT },
  ): Component {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "label_from_source",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a tooltip from URI node.
   *
   * @param params - Tooltip from URI parameters
   * @param params.uri - URI to load tooltips from
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Load tooltips from URI
   * ```typescript
   * component.tooltipFromUri({ uri: "tooltips.json" })
   * ```
   */
  tooltipFromUri(
    params: TooltipFromUriParams & { custom?: CustomT; ref?: RefT },
  ): Component {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "tooltip_from_uri",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a tooltip from source node.
   *
   * @param params - Tooltip from source parameters
   * @param params.category_name - Category name in the source file
   * @param params.field_name - Field name in the source file
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Load tooltips from source
   * ```typescript
   * component.tooltipFromSource({
   *   category_name: "atom_site",
   *   field_name: "tooltip"
   * })
   * ```
   */
  tooltipFromSource(
    params: TooltipFromSourceParams & { custom?: CustomT; ref?: RefT },
  ): Component {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "tooltip_from_source",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }
}

/**
 * Representation builder class.
 */
export class Representation extends Base {
  /**
   * Add a color node.
   *
   * @param params - Color parameters
   * @param params.color - The color value (required)
   * @param params.palette - Optional color palette
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Basic color
   * ```typescript
   * representation.color({ color: "red" })
   * ```
   *
   * @example Hex color
   * ```typescript
   * representation.color({ color: "#FF5733" })
   * ```
   *
   * @example RGB color
   * ```typescript
   * representation.color({ color: [255, 87, 51] })
   * ```
   *
   * @example Color with palette
   * ```typescript
   * representation.color({
   *   color: "element-symbol",
   *   palette: {
   *     name: "element-symbol",
   *     params: { C: "#909090", O: "#CC0000" }
   *   }
   * })
   * ```
   *
   * @example Color with custom data
   * ```typescript
   * representation.color({
   *   color: "blue",
   *   custom: { scheme: "custom-blue" }
   * })
   * ```
   */
  color(
    params: ColorInlineParams & { custom?: CustomT; ref?: RefT },
  ): Representation {
    const { color, palette, custom, ref, ...rest } = params;
    const node: Node = {
      kind: "color",
      params: makeParams({ color, palette, ...rest } as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a color from URI node.
   */
  colorFromUri(
    params: ColorFromUriParams,
    custom?: CustomT,
    ref?: RefT,
  ): Representation {
    const node: Node = {
      kind: "color_from_uri",
      params: makeParams(params as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a color from source node.
   */
  colorFromSource(
    params: ColorFromSourceParams,
    custom?: CustomT,
    ref?: RefT,
  ): Representation {
    const node: Node = {
      kind: "color_from_source",
      params: makeParams(params as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add an opacity node.
   *
   * @param params - Opacity parameters
   * @param params.opacity - The opacity value (0.0 to 1.0, required)
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Full opacity
   * ```typescript
   * representation.opacity({ opacity: 1.0 })
   * ```
   *
   * @example Semi-transparent
   * ```typescript
   * representation.opacity({ opacity: 0.5 })
   * ```
   *
   * @example Very transparent
   * ```typescript
   * representation.opacity({ opacity: 0.2 })
   * ```
   *
   * @example Opacity with custom data
   * ```typescript
   * representation.opacity({
   *   opacity: 0.8,
   *   custom: { transparency_level: "slight" }
   * })
   * ```
   *
   * @example Opacity with reference
   * ```typescript
   * representation.opacity({
   *   opacity: 0.3,
   *   ref: "ghost-mode"
   * })
   * ```
   */
  opacity(
    params: OpacityInlineParams & { custom?: CustomT; ref?: RefT },
  ): Representation {
    const { opacity, custom, ref, ...rest } = params;
    const node: Node = {
      kind: "opacity",
      params: makeParams({ opacity, ...rest } as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a clip node.
   */
  clip(
    params: ClipPlaneParams | ClipSphereParams | ClipBoxParams,
    custom?: CustomT,
    ref?: RefT,
  ): Representation {
    const node: Node = {
      kind: "clip",
      params: makeParams(params as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a label from URI node.
   *
   * @param params - Label from URI parameters
   * @param params.uri - URI to load labels from
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Load labels from URI
   * ```typescript
   * representation.labelFromUri({ uri: "labels.json" })
   * ```
   */
  labelFromUri(
    params: LabelFromUriParams & { custom?: CustomT; ref?: RefT },
  ): Representation {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "label_from_uri",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a label from source node.
   *
   * @param params - Label from source parameters
   * @param params.category_name - Category name in the source file
   * @param params.field_name - Field name in the source file
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Load labels from source
   * ```typescript
   * representation.labelFromSource({
   *   category_name: "atom_site",
   *   field_name: "label"
   * })
   * ```
   */
  labelFromSource(
    params: LabelFromSourceParams & { custom?: CustomT; ref?: RefT },
  ): Representation {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "label_from_source",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a tooltip from URI node.
   *
   * @param params - Tooltip from URI parameters
   * @param params.uri - URI to load tooltips from
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Load tooltips from URI
   * ```typescript
   * representation.tooltipFromUri({ uri: "tooltips.json" })
   * ```
   */
  tooltipFromUri(
    params: TooltipFromUriParams & { custom?: CustomT; ref?: RefT },
  ): Representation {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "tooltip_from_uri",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a tooltip from source node.
   *
   * @param params - Tooltip from source parameters
   * @param params.category_name - Category name in the source file
   * @param params.field_name - Field name in the source file
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Load tooltips from source
   * ```typescript
   * representation.tooltipFromSource({
   *   category_name: "atom_site",
   *   field_name: "tooltip"
   * })
   * ```
   */
  tooltipFromSource(
    params: TooltipFromSourceParams & { custom?: CustomT; ref?: RefT },
  ): Representation {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "tooltip_from_source",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }
}

/**
 * Volume builder class.
 */
export class Volume extends Base {
  /**
   * Add a volume representation node.
   */
  representation(
    type: VolumeRepresentationTypeT,
    params?: Record<string, unknown>,
    custom?: CustomT,
    ref?: RefT,
  ): VolumeRepresentation {
    const node: Node = {
      kind: "volume_representation",
      params: makeParams({ type, ...params }),
      custom,
      ref,
    };
    this.addChild(node);
    return new VolumeRepresentation(this.root, node);
  }

  /**
   * Add a clip node.
   *
   * @param params - Clip parameters (plane, sphere, or box)
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Clip with plane
   * ```typescript
   * volume.clip({
   *   type: "plane",
   *   point: [0, 0, 0],
   *   normal: [0, 1, 0]
   * })
   * ```
   *
   * @example Clip with sphere
   * ```typescript
   * volume.clip({
   *   type: "sphere",
   *   center: [0, 0, 0],
   *   radius: 10
   * })
   * ```
   */
  clip(
    params: (ClipPlaneParams | ClipSphereParams | ClipBoxParams) & {
      custom?: CustomT;
      ref?: RefT;
    },
  ): Volume {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "clip",
      params: makeParams(rest as NodeParams),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }
}

/**
 * Volume representation builder class.
 */
export class VolumeRepresentation extends Base {
  /**
   * Add a color node.
   */
  color(color: ColorT, custom?: CustomT, ref?: RefT): VolumeRepresentation {
    const node: Node = {
      kind: "color",
      params: makeParams({ color }),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add an opacity node.
   */
  opacity(opacity: number, custom?: CustomT, ref?: RefT): VolumeRepresentation {
    const node: Node = {
      kind: "opacity",
      params: makeParams({ opacity }),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }
}

/**
 * Primitives builder class.
 */
export class Primitives extends Base {
  /**
   * Add a mesh primitive.
   */
  mesh(params: MeshParams, custom?: CustomT, ref?: RefT): Primitives {
    const node: Node = {
      kind: "primitive",
      params: makeParams({ ...params, primitive_type: "mesh" }),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a tube primitive.
   */
  tube(params: TubeParams, custom?: CustomT, ref?: RefT): Primitives {
    const node: Node = {
      kind: "primitive",
      params: makeParams({ ...params, primitive_type: "tube" }),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a sphere primitive.
   */
  sphere(
    center: PrimitivePositionT,
    radius: number,
    custom?: CustomT,
    ref?: RefT,
  ): Primitives {
    const node: Node = {
      kind: "primitive",
      params: makeParams({ center, radius, primitive_type: "sphere" }),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a box primitive.
   */
  box(params: BoxParams, custom?: CustomT, ref?: RefT): Primitives {
    const node: Node = {
      kind: "primitive",
      params: makeParams({ ...params, primitive_type: "box" }),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a distance measurement primitive.
   */
  distance(
    params: DistanceMeasurementParams,
    custom?: CustomT,
    ref?: RefT,
  ): Primitives {
    const node: Node = {
      kind: "primitive",
      params: makeParams({ ...params, primitive_type: "distance" }),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a label primitive.
   */
  label(
    params: PrimitiveLabelParams,
    custom?: CustomT,
    ref?: RefT,
  ): Primitives {
    const node: Node = {
      kind: "primitive",
      params: makeParams({ ...params, primitive_type: "label" }),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add an ellipsoid primitive.
   *
   * @param params - Ellipsoid parameters
   * @param params.center - Center point of the ellipsoid
   * @param params.major_axis - Optional major axis vector
   * @param params.minor_axis - Optional minor axis vector
   * @param params.radius - Optional radius value or vector
   * @param params.color - Optional color
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Basic ellipsoid
   * ```typescript
   * primitives.ellipsoid({
   *   center: [0, 0, 0]
   * })
   * ```
   *
   * @example Ellipsoid with axes
   * ```typescript
   * primitives.ellipsoid({
   *   center: [0, 0, 0],
   *   major_axis: [1, 0, 0],
   *   minor_axis: [0, 1, 0],
   *   radius: [2, 1.5, 1]
   * })
   * ```
   */
  ellipsoid(
    params: EllipsoidParams & { custom?: CustomT; ref?: RefT },
  ): Primitives {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "primitive",
      params: makeParams({ ...rest, primitive_type: "ellipsoid" }),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a lines primitive.
   *
   * @param params - Lines parameters
   * @param params.vertices - Array of vertex coordinates (flat array)
   * @param params.indices - Array of line indices
   * @param params.color - Optional default color
   * @param params.width - Optional line width
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Basic lines
   * ```typescript
   * primitives.lines({
   *   vertices: [0, 0, 0, 1, 1, 1, 2, 2, 2],
   *   indices: [0, 1, 1, 2]
   * })
   * ```
   *
   * @example Lines with color
   * ```typescript
   * primitives.lines({
   *   vertices: [0, 0, 0, 1, 1, 1],
   *   indices: [0, 1],
   *   color: "red",
   *   width: 2
   * })
   * ```
   */
  lines(params: LinesParams & { custom?: CustomT; ref?: RefT }): Primitives {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "primitive",
      params: makeParams({ ...rest, primitive_type: "lines" }),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add an arrow primitive.
   *
   * @param params - Arrow parameters
   * @param params.start - Start position of the arrow
   * @param params.end - Optional end position
   * @param params.direction - Optional direction vector
   * @param params.show_tube - Whether to show the arrow shaft
   * @param params.color - Optional color
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Basic arrow
   * ```typescript
   * primitives.arrow({
   *   start: [0, 0, 0],
   *   end: [1, 1, 1]
   * })
   * ```
   *
   * @example Arrow with direction
   * ```typescript
   * primitives.arrow({
   *   start: [0, 0, 0],
   *   direction: [1, 0, 0],
   *   length: 5,
   *   color: "blue"
   * })
   * ```
   */
  arrow(params: ArrowParams & { custom?: CustomT; ref?: RefT }): Primitives {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "primitive",
      params: makeParams({ ...rest, primitive_type: "arrow" }),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add an ellipse primitive.
   *
   * @param params - Ellipse parameters
   * @param params.center - Center point of the ellipse
   * @param params.major_axis - Optional major axis vector
   * @param params.minor_axis - Optional minor axis vector
   * @param params.radius_major - Optional major radius
   * @param params.radius_minor - Optional minor radius
   * @param params.color - Optional color
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Basic ellipse
   * ```typescript
   * primitives.ellipse({
   *   center: [0, 0, 0]
   * })
   * ```
   *
   * @example Ellipse with radii
   * ```typescript
   * primitives.ellipse({
   *   center: [0, 0, 0],
   *   major_axis: [1, 0, 0],
   *   minor_axis: [0, 1, 0],
   *   radius_major: 2,
   *   radius_minor: 1,
   *   color: "green"
   * })
   * ```
   */
  ellipse(
    params: EllipseParams & { custom?: CustomT; ref?: RefT },
  ): Primitives {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "primitive",
      params: makeParams({ ...rest, primitive_type: "ellipse" }),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add an angle measurement primitive.
   *
   * @param params - Angle measurement parameters
   * @param params.start - First point
   * @param params.apex - Apex point (vertex of the angle)
   * @param params.end - Second point
   * @param params.custom - Optional custom data
   * @param params.ref - Optional reference identifier
   *
   * @example Basic angle measurement
   * ```typescript
   * primitives.angle({
   *   start: [1, 0, 0],
   *   apex: [0, 0, 0],
   *   end: [0, 1, 0]
   * })
   * ```
   *
   * @example Angle measurement with expressions
   * ```typescript
   * primitives.angle({
   *   start: { label_asym_id: "A", label_seq_id: 10 },
   *   apex: { label_asym_id: "A", label_seq_id: 11 },
   *   end: { label_asym_id: "A", label_seq_id: 12 }
   * })
   * ```
   */
  angle(
    params: AngleMeasurementParams & { custom?: CustomT; ref?: RefT },
  ): Primitives {
    const { custom, ref, ...rest } = params;
    const node: Node = {
      kind: "primitive",
      params: makeParams({ ...rest, primitive_type: "angle_measurement" }),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }
}
