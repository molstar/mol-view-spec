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
  AnimationNode,
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
  FocusInlineParams,
  GlobalMetadata,
  LabelFromSourceParams,
  LabelFromUriParams,
  LabelInlineParams,
  MeshParams,
  Node,
  OpacityInlineParams,
  Palette,
  ParseParams,
  PrimitiveLabelParams,
  PrimitivesFromUriParams,
  PrimitivesParams,
  Snapshot,
  SnapshotMetadata,
  SphereParams,
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
 * Entry point to create a new builder instance.
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
      params: makeParams(params),
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
      params: makeParams(params),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a download node.
   */
  download(url: string, custom?: CustomT, ref?: RefT): Download {
    const node: Node = {
      kind: "download",
      params: makeParams<DownloadParams>({ url }),
      custom,
      ref,
    };
    this.addChild(node);
    return new Download(this, node);
  }

  /**
   * Add primitives node.
   */
  primitives(
    params?: PrimitivesParams,
    custom?: CustomT,
    ref?: RefT,
  ): Primitives {
    const node: Node = {
      kind: "primitives",
      params: makeParams(params),
      custom,
      ref,
    };
    this.addChild(node);
    return new Primitives(this, node);
  }

  /**
   * Add primitives from URI node.
   */
  primitivesFromUri(uri: string, custom?: CustomT, ref?: RefT): Root {
    const node: Node = {
      kind: "primitives_from_uri",
      params: makeParams<PrimitivesFromUriParams>({ uri }),
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
   */
  parse(format: ParseFormatT, custom?: CustomT, ref?: RefT): Parse {
    const node: Node = {
      kind: "parse",
      params: makeParams<ParseParams>({ format }),
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
      params: makeParams<StructureParams>({ ...params, type: "model" }),
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
      params: makeParams<StructureParams>({ ...params, type: "assembly" }),
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
      params: makeParams<StructureParams>({ ...params, type: "symmetry" }),
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
      params: makeParams<StructureParams>({
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
      params: makeParams(params),
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
      params: makeParams(params),
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
   */
  component(
    selector: ComponentSelectorT | ComponentExpression | ComponentExpression[],
    custom?: CustomT,
    ref?: RefT,
  ): Component {
    const node: Node = {
      kind: "component",
      params: makeParams<ComponentInlineParams>({ selector }),
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
      params: makeParams(params),
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
      params: makeParams(params),
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
      params: makeParams(params),
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
      params: makeParams(params),
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
   */
  representation(
    type: RepresentationTypeT,
    params?: Record<string, unknown>,
    custom?: CustomT,
    ref?: RefT,
  ): Representation {
    const node: Node = {
      kind: "representation",
      params: makeParams({ type, ...params }),
      custom,
      ref,
    };
    this.addChild(node);
    return new Representation(this.root, node);
  }

  /**
   * Add a label node.
   */
  label(text: string, custom?: CustomT, ref?: RefT): Component {
    const node: Node = {
      kind: "label",
      params: makeParams<LabelInlineParams>({ text }),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add a tooltip node.
   */
  tooltip(text: string, custom?: CustomT, ref?: RefT): Component {
    const node: Node = {
      kind: "tooltip",
      params: makeParams<TooltipInlineParams>({ text }),
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
      params: makeParams(params),
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
      params: makeParams(params),
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
   */
  color(
    color: ColorT,
    palette?: Palette,
    custom?: CustomT,
    ref?: RefT,
  ): Representation {
    const node: Node = {
      kind: "color",
      params: makeParams<ColorInlineParams>({ color, palette }),
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
      params: makeParams(params),
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
      params: makeParams(params),
      custom,
      ref,
    };
    this.addChild(node);
    return this;
  }

  /**
   * Add an opacity node.
   */
  opacity(opacity: number, custom?: CustomT, ref?: RefT): Representation {
    const node: Node = {
      kind: "opacity",
      params: makeParams<OpacityInlineParams>({ opacity }),
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
      params: makeParams(params),
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
      params: makeParams<ColorInlineParams>({ color }),
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
      params: makeParams<OpacityInlineParams>({ opacity }),
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
}
