/**
 * MolViewSpec TypeScript/Deno Library
 *
 * A TypeScript implementation of MolViewSpec for Deno runtime.
 * MolViewSpec is a JSON-based file format used to describe visual scenes
 * or views used in molecular visualization.
 *
 * ## Links
 * - **GitHub Repository**: https://github.com/molstar/mol-view-spec
 * - **Documentation**: https://molstar.org/mol-view-spec/
 * - **Specification**: https://molstar.org/mol-view-spec/docs/specification/
 *
 * ## Quick Start
 *
 * ```typescript
 * import { createBuilder } from "@molstar/molviewspec";
 *
 * const builder = createBuilder();
 * const structure = builder
 *   .download({ url: "https://www.ebi.ac.uk/pdbe/entry-files/1cbs.cif" })
 *   .parse({ format: "mmcif" })
 *   .modelStructure()
 *   .component()
 *   .representation({ type: "cartoon" })
 *   .color({ color: "green" });
 *
 * const state = builder.getState();
 * ```
 *
 * ## Features
 * - Type-safe builder API for creating molecular visualizations
 * - Support for MVSJ (JSON) and MVSX (ZIP archive) formats
 * - Integration with Deno Jupyter notebooks
 * - Export to standalone HTML with embedded Mol* viewer
 *
 *  @module
 */

// Export builder - main entry point
export { createBuilder } from "./molviewspec/builder.ts";

// Export display utilities
export {
  // displayHTML,
  // molstarHtml,
  molstarNotebook,
  saveMolstarHtml,
} from "./molviewspec/display.ts";

// // Export node types and interfaces
// export type {
//   AngleMeasurementParams,
//   AnimationNode,
//   AnimationParams,
//   ArrowParams,
//   BackboneParams,
//   BallAndStickParams,
//   BoxParams,
//   CameraParams,
//   CanvasParams,
//   CarbohydrateParams,
//   CartoonParams,
//   CategoricalPalette,
//   ClipBoxParams,
//   ClipPlaneParams,
//   ClipSphereParams,
//   ClipTypeParams,
//   ColorFromSourceParams,
//   ColorFromUriParams,
//   ColorInlineParams,
//   ColorInterpolationParams,
//   ComponentExpression,
//   ComponentFromSourceParams,
//   ComponentFromUriParams,
//   ComponentInlineParams,
//   ContinuousPalette,
//   CoordinatesParams,
//   DiscretePalette,
//   DistanceMeasurementParams,
//   DownloadParams,
//   EllipseParams,
//   EllipsoidParams,
//   FocusInlineParams,
//   GlobalMetadata,
//   InstanceParams,
//   InterpolationKindParams,
//   InterpolationParams,
//   LabelFromSourceParams,
//   LabelFromUriParams,
//   LabelInlineParams,
//   LineRepresentationParams,
//   LinesParams,
//   MeshParams,
//   MVSData,
//   Node,
//   OpacityInlineParams,
//   Palette,
//   ParseParams,
//   PrimitiveComponentExpressions,
//   PrimitiveLabelParams,
//   PrimitivesFromUriParams,
//   PrimitivesParams,
//   RepresentationParams,
//   RotationMatrixInterpolationParams,
//   ScalarInterpolationParams,
//   Snapshot,
//   SnapshotMetadata,
//   SpacefillParams,
//   State,
//   States,
//   StructureParams,
//   SurfaceParams,
//   TooltipFromSourceParams,
//   TooltipFromUriParams,
//   TooltipInlineParams,
//   TransformationMatrixInterpolationParams,
//   TransformParams,
//   TubeParams,
//   Vec3InterpolationParams,
//   VolumeGridSliceParams,
//   VolumeIsoSurfaceParams,
//   VolumeParams,
//   VolumeRepresentationParams,
// } from "./molviewspec/nodes.ts";

// Export node functions
export { findRef, validateStateTree } from "./molviewspec/nodes.ts";
