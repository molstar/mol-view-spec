/**
 * MolViewSpec TypeScript/Deno Library
 *
 * A TypeScript implementation of MolViewSpec for Deno runtime.
 * MolViewSpec is a JSON-based file format used to describe visual scenes
 * or views used in molecular visualization.
 *
 * @module molviewspec
 * @version 1.8.0
 */

// Export types
export type {
  AnimationKindT,
  ClipTypeT,
  ColorNamesT,
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
  PaletteT,
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
} from "./molviewspec/types.ts";

// Export node types and interfaces
export type {
  AngleMeasurementParams,
  AnimationNode,
  AnimationParams,
  ArrowParams,
  BackboneParams,
  BallAndStickParams,
  BoxParams,
  CameraParams,
  CanvasParams,
  CarbohydrateParams,
  CartoonParams,
  CategoricalPalette,
  ClipBoxParams,
  ClipPlaneParams,
  ClipSphereParams,
  ClipTypeParams,
  ColorFromSourceParams,
  ColorFromUriParams,
  ColorInlineParams,
  ColorInterpolationParams,
  ComponentExpression,
  ComponentFromSourceParams,
  ComponentFromUriParams,
  ComponentInlineParams,
  ContinuousPalette,
  CoordinatesParams,
  DiscretePalette,
  DistanceMeasurementParams,
  DownloadParams,
  EllipseParams,
  EllipsoidParams,
  FocusInlineParams,
  GlobalMetadata,
  InterpolationKindParams,
  InterpolationParams,
  LabelFromSourceParams,
  LabelFromUriParams,
  LabelInlineParams,
  LineRepresentationParams,
  LinesParams,
  MeshParams,
  MVSData,
  Node,
  OpacityInlineParams,
  Palette,
  ParseParams,
  PrimitiveComponentExpressions,
  PrimitiveLabelParams,
  PrimitivesFromUriParams,
  PrimitivesParams,
  RepresentationParams,
  RotationMatrixInterpolationParams,
  ScalarInterpolationParams,
  Snapshot,
  SnapshotMetadata,
  SpacefillParams,
  State,
  States,
  StructureParams,
  SurfaceParams,
  TooltipFromSourceParams,
  TooltipFromUriParams,
  TooltipInlineParams,
  TransformationMatrixInterpolationParams,
  TransformParams,
  TubeParams,
  Vec3InterpolationParams,
  VolumeGridSliceParams,
  VolumeIsoSurfaceParams,
  VolumeParams,
  VolumeRepresentationParams,
} from "./molviewspec/nodes.ts";

// Export node functions
export {
  createGlobalMetadata,
  createSnapshotMetadata,
  findRef,
  validateStateTree,
} from "./molviewspec/nodes.ts";

// Export builder classes and functions
export {
  Component,
  createBuilder,
  Download,
  Parse,
  Primitives,
  Representation,
  Root,
  Structure,
  Volume,
  VolumeRepresentation,
} from "./molviewspec/builder.ts";

// Export MVSJ
export { MVSJ, stateToMVSJ, statesToMVSJ } from "./molviewspec/mvsj.ts";

// Export MVSX
export { mvsjToMvsx, MVSX } from "./molviewspec/mvsx.ts";

// Export utilities
export {
  excludeNone,
  generateUUID,
  getMajorVersionTag,
  getTimestamp,
  makeParams,
  VERSION,
} from "./molviewspec/utils.ts";

// Export display utilities
export {
  displayHTML,
  molstarHtml,
  molstarNotebook,
  saveMolstarHtml,
  type SupportedStates,
} from "./molviewspec/display.ts";
