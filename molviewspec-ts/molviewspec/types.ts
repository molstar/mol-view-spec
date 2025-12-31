/**
 * Core type definitions for MolViewSpec
 */

// Scalar and Vector Types
export type Vec3<T extends number = number> = [T, T, T];
export type Mat3<T extends number = number> = [T, T, T, T, T, T, T, T, T];
export type Mat4<T extends number = number> = [
  T,
  T,
  T,
  T,
  T,
  T,
  T,
  T,
  T,
  T,
  T,
  T,
  T,
  T,
  T,
  T,
];

// Node Kind Types
export type KindT =
  | "root"
  | "animation"
  | "camera"
  | "canvas"
  | "clip"
  | "color"
  | "color_from_source"
  | "color_from_uri"
  | "component"
  | "component_from_source"
  | "component_from_uri"
  | "coordinates"
  | "download"
  | "focus"
  | "instance"
  | "label"
  | "label_from_source"
  | "label_from_uri"
  | "mesh_from_source"
  | "mesh_from_uri"
  | "opacity"
  | "parse"
  | "primitives"
  | "primitives_from_uri"
  | "primitive"
  | "representation"
  | "structure"
  | "tooltip"
  | "tooltip_from_source"
  | "tooltip_from_uri"
  | "transform"
  | "volume"
  | "volume_representation";

export type AnimationKindT = "animation" | "interpolate";

export type CustomT = Record<string, unknown> | null;
export type RefT = string | null;

// State Tree Types
export type StateTreeT = "single" | "multiple";

// Description Format Types
export type DescriptionFormatT = "markdown" | "plaintext";

// Parse Format Types
export type ParseFormatT =
  | "mmcif"
  | "bcif"
  | "pdb"
  | "pdbqt"
  | "gro"
  | "xyz"
  | "mol"
  | "sdf"
  | "mol2"
  | "lammpstrj"
  | "xtc"
  | "nctraj"
  | "dcd"
  | "trr"
  | "psf"
  | "prmtop"
  | "top"
  | "map"
  | "dx"
  | "dxbin";

// Structure Types
export type StructureTypeT =
  | "model"
  | "assembly"
  | "symmetry"
  | "symmetry_mates";

// Component Selector Types
export type ComponentSelectorT =
  | "all"
  | "polymer"
  | "protein"
  | "nucleic"
  | "branched"
  | "ligand"
  | "ion"
  | "water"
  | "coarse";

// Representation Types
export type RepresentationTypeT =
  | "ball_and_stick"
  | "spacefill"
  | "cartoon"
  | "surface"
  | "isosurface"
  | "carbohydrate"
  | "backbone"
  | "line";

export type VolumeRepresentationTypeT = "isosurface" | "grid_slice";

// Color Types
export type ColorNamesT =
  | "aliceblue"
  | "antiquewhite"
  | "aqua"
  | "aquamarine"
  | "azure"
  | "beige"
  | "bisque"
  | "black"
  | "blanchedalmond"
  | "blue"
  | "blueviolet"
  | "brown"
  | "burlywood"
  | "cadetblue"
  | "chartreuse"
  | "chocolate"
  | "coral"
  | "cornflowerblue"
  | "cornsilk"
  | "crimson"
  | "cyan"
  | "darkblue"
  | "darkcyan"
  | "darkgoldenrod"
  | "darkgray"
  | "darkgreen"
  | "darkgrey"
  | "darkkhaki"
  | "darkmagenta"
  | "darkolivegreen"
  | "darkorange"
  | "darkorchid"
  | "darkred"
  | "darksalmon"
  | "darkseagreen"
  | "darkslateblue"
  | "darkslategray"
  | "darkslategrey"
  | "darkturquoise"
  | "darkviolet"
  | "deeppink"
  | "deepskyblue"
  | "dimgray"
  | "dimgrey"
  | "dodgerblue"
  | "firebrick"
  | "floralwhite"
  | "forestgreen"
  | "fuchsia"
  | "gainsboro"
  | "ghostwhite"
  | "gold"
  | "goldenrod"
  | "gray"
  | "green"
  | "greenyellow"
  | "grey"
  | "honeydew"
  | "hotpink"
  | "indianred"
  | "indigo"
  | "ivory"
  | "khaki"
  | "lavender"
  | "lavenderblush"
  | "lawngreen"
  | "lemonchiffon"
  | "lightblue"
  | "lightcoral"
  | "lightcyan"
  | "lightgoldenrodyellow"
  | "lightgray"
  | "lightgreen"
  | "lightgrey"
  | "lightpink"
  | "lightsalmon"
  | "lightseagreen"
  | "lightskyblue"
  | "lightslategray"
  | "lightslategrey"
  | "lightsteelblue"
  | "lightyellow"
  | "lime"
  | "limegreen"
  | "linen"
  | "magenta"
  | "maroon"
  | "mediumaquamarine"
  | "mediumblue"
  | "mediumorchid"
  | "mediumpurple"
  | "mediumseagreen"
  | "mediumslateblue"
  | "mediumspringgreen"
  | "mediumturquoise"
  | "mediumvioletred"
  | "midnightblue"
  | "mintcream"
  | "mistyrose"
  | "moccasin"
  | "navajowhite"
  | "navy"
  | "oldlace"
  | "olive"
  | "olivedrab"
  | "orange"
  | "orangered"
  | "orchid"
  | "palegoldenrod"
  | "palegreen"
  | "paleturquoise"
  | "palevioletred"
  | "papayawhip"
  | "peachpuff"
  | "peru"
  | "pink"
  | "plum"
  | "powderblue"
  | "purple"
  | "red"
  | "rosybrown"
  | "royalblue"
  | "saddlebrown"
  | "salmon"
  | "sandybrown"
  | "seagreen"
  | "seashell"
  | "sienna"
  | "silver"
  | "skyblue"
  | "slateblue"
  | "slategray"
  | "slategrey"
  | "snow"
  | "springgreen"
  | "steelblue"
  | "tan"
  | "teal"
  | "thistle"
  | "tomato"
  | "turquoise"
  | "violet"
  | "wheat"
  | "white"
  | "whitesmoke"
  | "yellow"
  | "yellowgreen";

// HexColorT represents hex color codes like '#f0f0f0'
export type HexColorT = string;
export type ColorT = ColorNamesT | HexColorT;

// Named color palette types (for categorical palettes)
export type ColorListNameT =
  // Sequential single-hue
  | "Reds"
  | "Oranges"
  | "Greens"
  | "Blues"
  | "Purples"
  | "Greys"
  // Sequential multi-hue
  | "OrRd"
  | "PuBu"
  | "BuPu"
  | "BuGn"
  | "YlOrBr"
  | "YlOrRd"
  | "YlGn"
  | "YlGnBu"
  | "RdPu"
  | "PuRd"
  | "GnBu"
  | "PuBuGn"
  // Diverging
  | "Spectral"
  | "RdYlGn"
  | "RdYlBu"
  | "RdGy"
  | "RdBu"
  | "PiYG"
  | "PRGn"
  | "PuOr"
  | "BrBG"
  // Qualitative/Categorical
  | "Set1"
  | "Set2"
  | "Set3"
  | "Pastel1"
  | "Pastel2"
  | "Dark2"
  | "Paired"
  | "Accent"
  // Additional lists commonly used for structures
  | "Chainbow";

export type ColorDictNameT =
  | "ElementSymbol"
  | "ResidueName"
  | "ResidueProperties"
  | "SecondaryStructure";

// Schema Types
export type SchemaFormatT = "json" | "cif" | "bcif";
export type SchemaT =
  | "whole_structure"
  | "entity"
  | "chain"
  | "auth_chain"
  | "residue"
  | "auth_residue"
  | "residue_range"
  | "auth_residue_range"
  | "atom"
  | "auth_atom"
  | "all_atomic";

// Surface Types
export type SurfaceTypeT = "molecular" | "gaussian";

// Label Types
export type LabelAttachmentT =
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "top-left"
  | "top-center"
  | "top-right";

// Primitive Types
export type PrimitivePositionT = [number, number, number];

// Clip Types
export type ClipTypeT = "plane" | "sphere" | "box";

// Palette Types
export type PaletteT = "categorical" | "discrete" | "continuous";

// Easing Types
export type EasingKindT =
  | "linear"
  | "quadratic-in"
  | "quadratic-out"
  | "quadratic-in-out"
  | "cubic-in"
  | "cubic-out"
  | "cubic-in-out"
  | "quartic-in"
  | "quartic-out"
  | "quartic-in-out"
  | "quintic-in"
  | "quintic-out"
  | "quintic-in-out"
  | "exponential-in"
  | "exponential-out"
  | "exponential-in-out"
  | "circular-in"
  | "circular-out"
  | "circular-in-out"
  | "sine-in"
  | "sine-out"
  | "sine-in-out"
  | "elastic-in"
  | "elastic-out"
  | "elastic-in-out"
  | "back-in"
  | "back-out"
  | "back-in-out"
  | "bounce-in"
  | "bounce-out"
  | "bounce-in-out";

// Interpolation Types
export type InterpolationKindT =
  | "scalar"
  | "vec3"
  | "rotation_matrix"
  | "color"
  | "transformation_matrix";
