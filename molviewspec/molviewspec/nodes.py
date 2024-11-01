"""
Definitions of all 'nodes' used by the MolViewSpec format specification and its builder implementation.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal, Mapping, Optional, Tuple, TypeVar, Union
from uuid import uuid4

from pydantic import BaseModel, Field

KindT = Literal[
    "root",
    "camera",
    "canvas",
    "color",
    "color_from_source",
    "color_from_uri",
    "component",
    "component_from_source",
    "component_from_uri",
    "download",
    "focus",
    "label",
    "label_from_source",
    "label_from_uri",
    "mesh_from_source",
    "mesh_from_uri",
    "parse",
    "primitives",
    "primitives_from_uri",
    "primitive",
    "representation",
    "structure",
    "tooltip",
    "tooltip_from_source",
    "tooltip_from_uri",
    "transform",
    "transparency",
]


CustomT = Optional[Mapping[str, Any]]
RefT = Optional[str]

# TODO: to be used for angle, dihedral
class LabelCommonProps(BaseModel):
    label_template: Optional[str] = Field(
        description="Template used to construct the label. Use {{distance}} as placeholder for the distance."
    )
    label_size: Optional[float | Literal["auto"]] = Field(
        description="Size of the label. Auto scales it by the distance."
    )
    label_auto_size_scale: Optional[float] = Field(description="Scaling factor for auto size.")
    label_auto_size_min: Optional[float] = Field(description="Minimum size for auto size.")
    label_color: Optional[ColorT] = Field(description="Color of the label.")

class Node(BaseModel):
    """
    Base impl of all state tree nodes.
    """

    kind: KindT = Field(description="The type of this node.")
    params: Optional[Mapping[str, Any]] = Field(description="Optional params that are needed for this node.")
    children: Optional[list[Node]] = Field(description="Optional collection of nested child nodes.")
    custom: CustomT = Field(description="Custom data to store attached to this node.")
    ref: RefT = Field(description="Optional reference that can be used to access this node.")

    def __init__(self, **data):
        # extract `custom` value from `params`
        params = data.get("params", {})
        if "custom" in params:
            data["custom"] = params.pop("custom")
        if "ref" in params:
            data["ref"] = params.pop("ref")

        super().__init__(**data)


class FormatMetadata(BaseModel):
    """
    Metadata describing global properties relating to the format specification.
    """

    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="Timestamp when this view was exported.",
    )
    version: str = Field(description="Version of the spec used to write this tree.")


DescriptionFormatT = Literal["markdown", "plaintext"]


def generate_uuid():
    return str(uuid4())


class SnapshotMetadata(BaseModel):
    """
    Metadata describing details of an individual state/snapshot.
    """

    def __init__(self, **data):
        super().__init__(**data)
        if self.key is None:
            self.key = generate_uuid()

    description: Optional[str] = Field(description="Detailed description of this view.")
    description_format: Optional[DescriptionFormatT] = Field(description="Format of the description.")
    key: Optional[str] = Field(
        default_factory=generate_uuid,
        description="Unique identifier of this state, useful when working with collections of states.",
    )
    title: Optional[str] = Field(description="Name of this view.")
    linger_duration_ms: Optional[int] = Field(
        description="How long to linger on one snapshot. Leave empty to not transition automatically."
    )
    transition_duration_ms: Optional[int] = Field(
        description="Timespan for the animation to the next snapshot. Leave empty to skip animations."
    )


class Metadata(FormatMetadata, SnapshotMetadata):
    """
    Union of all metadata properties.
    """


"""
Type of a state description, either 'single' (individual state) or 'multiple' (ordered collection of multiple states).
"""
StateTreeT = Literal["single", "multiple"]


class Snapshot(BaseModel):
    """
    Root node of an individual state trees. Intended to use when combining multiple snapshots.
    """

    kind: StateTreeT = Field(
        default="single", description="Specifies whether this is an individual state or a collection of states."
    )
    root: Node = Field(description="Root of the node tree.")
    metadata: SnapshotMetadata = Field(description="Associated metadata.")


class State(Snapshot):
    """
    Root node of an individual state trees with metadata.
    """

    metadata: Metadata = Field(description="Associated metadata.")


class States(BaseModel):
    """
    Root node of state descriptions that encompass multiple distinct state trees.
    """

    kind: StateTreeT = Field(
        default="multiple", description="Specifies whether this is an individual state or a collection of states."
    )
    metadata: Metadata = Field(description="Associated metadata.")
    snapshots: list[Snapshot] = Field(description="Ordered collection of individual states.")
    # TODO add ordered collection that describes transition/interpolation wrt previous state


"""
Flavors of MolViewSpec states.
"""
MVSData = Union[State, States]


class DownloadParams(BaseModel):
    """
    Download node, describing where structure data should be fetched from.
    """

    url: str = Field(description="URL from which to pull structure data.")


ParseFormatT = Literal["mmcif", "bcif", "pdb"]


class ParseParams(BaseModel):
    """
    Parse node, describing how to parse downloaded data.
    """

    format: ParseFormatT = Field(description="The format of the structure data.")


StructureTypeT = Literal["model", "assembly", "symmetry", "symmetry_mates"]


ScalarT = TypeVar("ScalarT", int, float)
Vec3 = Tuple[ScalarT, ScalarT, ScalarT]
Mat3 = Tuple[ScalarT, ScalarT, ScalarT, ScalarT, ScalarT, ScalarT, ScalarT, ScalarT, ScalarT]
Mat4 = Tuple[
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
]


class StructureParams(BaseModel):
    """
    Structure node, describing which type (assembly 1, deposited coordinates, etc.) of the parsed data to create.
    """

    type: StructureTypeT = Field(description="How to interpret the loaded data")
    assembly_id: Optional[str] = Field(description="Use the name to specify which assembly to load")
    assembly_index: Optional[int] = Field(description="0-based assembly index, use this to load the 1st assembly")
    model_index: Optional[int] = Field(description="0-based model index in case multiple NMR frames are present")
    block_index: Optional[int] = Field(
        description="0-based block index in case multiple mmCIF or SDF data blocks are " "present"
    )
    block_header: Optional[str] = Field(description="Reference a specific mmCIF or SDF data block by its block header")
    radius: Optional[float] = Field(description="Radius around model coordinates when loading symmetry mates")
    ijk_min: Optional[Vec3[int]] = Field(description="Bottom-left Miller indices")
    ijk_max: Optional[Vec3[int]] = Field(description="Top-right Miller indices")


ComponentSelectorT = Literal["all", "polymer", "protein", "nucleic", "branched", "ligand", "ion", "water"]


class ComponentExpression(BaseModel):
    """
    Component expressions are used to make selections.
    """

    label_entity_id: Optional[str] = Field(description="Select an entity by its identifier")
    label_asym_id: Optional[str] = Field(
        description="Select a chain using its standard, programmatically-assigned identifier"
    )
    auth_asym_id: Optional[str] = Field(description="Select a chain using its legacy, author-assigned identifier")
    label_seq_id: Optional[int] = Field(
        description="Select a residue by its standard, programmatically-assigned sequence position"
    )
    auth_seq_id: Optional[int] = Field(description="Select a residue by its legacy, author-assigned sequence position")
    pdbx_PDB_ins_code: Optional[str] = Field(
        description="Optional legacy insertion code, only relevant for `auth_seq_id`"
    )
    beg_label_seq_id: Optional[int] = Field(
        description="Defines a consecutive range of residues when combined with `end_label_seq_id`."
    )
    end_label_seq_id: Optional[int] = Field(
        description="Defines a consecutive range of residues when combined with `beg_label_seq_id`. End indices are inclusive."
    )
    beg_auth_seq_id: Optional[int] = Field(
        description="Defines a consecutive range of residues when combined with `end_auth_seq_id`."
    )
    end_auth_seq_id: Optional[int] = Field(
        description="Defines a consecutive range of residues when combined with `beg_auth_seq_id`. End indices are inclusive."
    )
    residue_index: Optional[int] = Field(description="0-based residue index in the source file")
    label_atom_id: Optional[str] = Field(description="Atom name like 'CA', 'N', 'O' (`_atom_site.label_atom_id`)")
    auth_atom_id: Optional[str] = Field(description="Atom name like 'CA', 'N', 'O' (`_atom_site.auth_atom_id`)")
    type_symbol: Optional[str] = Field(
        description="Element symbol like 'H', 'HE', 'LI', 'BE' (`_atom_site.type_symbol`)"
    )
    atom_id: Optional[int] = Field(description="Unique atom identifier (`_atom_site.id`)")
    atom_index: Optional[int] = Field(description="0-based atom index in the source file")


RepresentationTypeT = Literal["ball_and_stick", "cartoon", "surface"]
ColorNamesT = Literal[
    "aliceblue",
    "antiquewhite",
    "aqua",
    "aquamarine",
    "azure",
    "beige",
    "bisque",
    "black",
    "blanchedalmond",
    "blue",
    "blueviolet",
    "brown",
    "burlywood",
    "cadetblue",
    "chartreuse",
    "chocolate",
    "coral",
    "cornflowerblue",
    "cornsilk",
    "crimson",
    "cyan",
    "darkblue",
    "darkcyan",
    "darkgoldenrod",
    "darkgray",
    "darkgreen",
    "darkgrey",
    "darkkhaki",
    "darkmagenta",
    "darkolivegreen",
    "darkorange",
    "darkorchid",
    "darkred",
    "darksalmon",
    "darkseagreen",
    "darkslateblue",
    "darkslategray",
    "darkslategrey",
    "darkturquoise",
    "darkviolet",
    "deeppink",
    "deepskyblue",
    "dimgray",
    "dimgrey",
    "dodgerblue",
    "firebrick",
    "floralwhite",
    "forestgreen",
    "fuchsia",
    "gainsboro",
    "ghostwhite",
    "gold",
    "goldenrod",
    "gray",
    "green",
    "greenyellow",
    "grey",
    "honeydew",
    "hotpink",
    "indianred",
    "indigo",
    "ivory",
    "khaki",
    "lavender",
    "lavenderblush",
    "lawngreen",
    "lemonchiffon",
    "lightblue",
    "lightcoral",
    "lightcyan",
    "lightgoldenrodyellow",
    "lightgray",
    "lightgreen",
    "lightgrey",
    "lightpink",
    "lightsalmon",
    "lightseagreen",
    "lightskyblue",
    "lightslategray",
    "lightslategrey",
    "lightsteelblue",
    "lightyellow",
    "lime",
    "limegreen",
    "linen",
    "magenta",
    "maroon",
    "mediumaquamarine",
    "mediumblue",
    "mediumorchid",
    "mediumpurple",
    "mediumseagreen",
    "mediumslateblue",
    "mediumspringgreen",
    "mediumturquoise",
    "mediumvioletred",
    "midnightblue",
    "mintcream",
    "mistyrose",
    "moccasin",
    "navajowhite",
    "navy",
    "oldlace",
    "olive",
    "olivedrab",
    "orange",
    "orangered",
    "orchid",
    "palegoldenrod",
    "palegreen",
    "paleturquoise",
    "palevioletred",
    "papayawhip",
    "peachpuff",
    "peru",
    "pink",
    "plum",
    "powderblue",
    "purple",
    "red",
    "rosybrown",
    "royalblue",
    "saddlebrown",
    "salmon",
    "sandybrown",
    "seagreen",
    "seashell",
    "sienna",
    "silver",
    "skyblue",
    "slateblue",
    "slategray",
    "slategrey",
    "snow",
    "springgreen",
    "steelblue",
    "tan",
    "teal",
    "thistle",
    "tomato",
    "turquoise",
    "violet",
    "wheat",
    "white",
    "whitesmoke",
    "yellow",
    "yellowgreen",
]
ColorT = Union[ColorNamesT, str]  # str represents hex colors for now


class RepresentationParams(BaseModel):
    """
    Representation node, describing how to represent a component.
    """

    type: RepresentationTypeT = Field(description="Representation type, i.e. cartoon, ball-and-stick, etc.")


SchemaT = Literal[
    "whole_structure",
    "entity",
    "chain",
    "auth_chain",
    "residue",
    "auth_residue",
    "residue_range",
    "auth_residue_range",
    "atom",
    "auth_atom",
    "all_atomic",
]
SchemaFormatT = Literal["cif", "bcif", "json"]


class _DataFromUriParams(BaseModel):
    """
    Abstract node that's shared by all resource-based selections.
    """

    uri: str = Field(description="Location of the resource")
    format: SchemaFormatT = Field(description="Format of the resource, i.e. 'cif', 'bcif', or 'json'")
    category_name: Optional[str] = Field(
        description="Category wherein selection is located. Only applies when format is 'cif' or 'bcif'."
    )
    field_name: Optional[str] = Field(
        description="Name of the column in CIF or field name (key) in JSON that "
        "contains the desired value (color/label/tooltip/component...); the "
        "default value is 'color'/'label'/'tooltip'/'component' depending "
        "on the node kind",
    )
    block_header: Optional[str] = Field(
        description="Block name wherein selection is located. Only applies when format is 'cif' or 'bcif'."
    )
    block_index: Optional[int] = Field(
        description="Block index wherein selection is located. Only applies when format is 'cif' or 'bcif'."
    )
    # must be aliased to not shadow BaseModel attribute
    schema_: SchemaT = Field(alias="schema", description="granularity/type of the selection")


class _DataFromSourceParams(BaseModel):
    """
    Abstract node that's shared by all selections based on the source file.
    """

    category_name: str = Field(description="Category wherein selection is located.")
    field_name: Optional[str] = Field(
        description="Name of the column in CIF that contains the desired value ("
        "color/label/tooltip/component...); the default value is "
        "'color'/'label'/'tooltip'/'component' depending on the node kind",
    )
    block_header: Optional[str] = Field(description="Block name wherein selection is located.")
    block_index: Optional[int] = Field(description="Block index wherein selection is located.")
    # must be aliased to not shadow BaseModel attribute
    schema_: SchemaT = Field(alias="schema", description="granularity/type of the selection")


class ComponentInlineParams(BaseModel):
    """
    Selection based on function arguments.
    """

    selector: Union[ComponentSelectorT, ComponentExpression, list[ComponentExpression]] = Field(
        description="Describes one or more selections or one of the enumerated selectors."
    )


class ComponentFromUriParams(_DataFromUriParams):
    """
    Selection based on another resource.
    """

    field_values: Optional[list[str]] = Field(
        description="Create the component from rows that have any of these "
        "values in the field specified by `field_name`. If not "
        "provided, create the component from all rows."
    )


class ComponentFromSourceParams(_DataFromSourceParams):
    """
    Selection based on a category in the source file.
    """

    field_values: Optional[list[str]] = Field(
        description="Create the component from rows that have any of these "
        "values in the field specified by `field_name`. If not "
        "provided, create the component from all rows."
    )


class ColorInlineParams(ComponentInlineParams):
    """
    Color based on function arguments.
    """

    color: ColorT = Field(description="Color using SVG color names or RGB hex code")


class ColorFromUriParams(_DataFromUriParams):
    """
    Color based on another resource.
    """


class ColorFromSourceParams(_DataFromSourceParams):
    """
    Color based on a category in the source file.
    """


class TransparencyInlineParams(ComponentInlineParams):
    """
    Change the transparency of a representation based on function arguments.
    """

    transparency: float = Field(
        description="Transparency of a representation. 0.0: fully opaque, 1.0: fully transparent"
    )


class LabelInlineParams(BaseModel):
    """
    Label based on function arguments.
    """

    text: str = Field(description="Text to show as label")
    # schema and other stuff not needed here, the label will be applied on the whole parent Structure or Component


class LabelFromUriParams(_DataFromUriParams):
    """
    Label based on another resource.
    """


class LabelFromSourceParams(_DataFromSourceParams):
    """
    Label based on a category in the source file.
    """


class TooltipInlineParams(BaseModel):
    text: str = Field(description="Text to show as tooltip upon hover")
    # schema and other stuff not needed here, the tooltip will be applied on the whole parent Structure or Component


class TooltipFromUriParams(_DataFromUriParams):
    pass


class TooltipFromSourceParams(_DataFromSourceParams):
    pass


class FocusInlineParams(BaseModel):
    """
    Define the camera focus based on function arguments.
    """

    direction: Optional[Vec3[float]] = Field(description="Direction of the view (vector position -> target)")
    up: Optional[Vec3[float]] = Field(description="Controls the rotation around the vector between target and position")


class TransformParams(BaseModel):
    """
    Define a transformation.
    """

    rotation: Optional[Mat3[float]] = Field(
        description="9d vector describing the rotation, in a column major (j * 3 + i indexing) format, this is equivalent to Fortran-order in numpy, to be multiplied from the left",
    )
    translation: Optional[Vec3[float]] = Field(description="3d vector describing the translation")

class CameraParams(BaseModel):
    """
    Controls the global camera position.
    """

    target: Vec3[float] = Field(description="What to look at")
    position: Vec3[float] = Field(description="The position of the camera")
    up: Vec3[float] = Field(
        description="Controls the rotation around the vector between target and position", required=True
    )


class CanvasParams(BaseModel):
    """
    Controls global canvas properties.
    """

    background_color: ColorT = Field(description="Background color using SVG color names or RGB hex code")


class PrimitiveComponentExpressions(BaseModel):
    structure_ref: Optional[RefT] = Field(
        description="Reference to a structure node to apply this expresion to. If undefined, get the structure implicitly from the tree."
    )
    expression_schema: Optional[SchemaT] = Field(
        description="Schema the expressions follow, used for optimization of structure query resolution."
    )
    expressions: list[ComponentExpression] = Field(description="Expression refencing elements froms the structure_ref.")


# TODO: Consider supporting a list of PrimitiveComponentExpressions too to enable things like
#       boundings boxes around docked ligands that contains surrounding residues
PrimitivePositionT = Union[Vec3[float], ComponentExpression, PrimitiveComponentExpressions]
"""
Positions of primitives can be defined by 3D vector, by providing a selection expressions, or by providing 
a list of expressions within a specific structure.
"""


class PrimitivesParams(BaseModel):
    color: Optional[ColorT] = Field(description="Default color for primitives in this group")
    label_color: Optional[ColorT] = Field(description="Default label color for primitives in this group")
    tooltip: Optional[str] = Field(description="Default tooltip for primitives in this group")
    transparency: Optional[float] = Field(description="Transparency of primitive geometry in this group")
    label_transparency: Optional[float] = Field(description="Transparency of primitive labels in this group")
    instances: Optional[list[Mat4[float]]] = Field(
        description="Instances of this primitive group defined as 4x4 column major (j * 4 + i indexing) transformation matrices"
    )


class MeshParams(BaseModel):
    """
    Low-level, fully customizable mesh representation of a shape.
    """

    kind: Literal["mesh"] = "mesh"
    vertices: list[float] = Field(description="3N length array of floats with vertex position (x1, y1, z1, ...)")
    indices: list[int] = Field(
        description="3N length array of indices into vertices that form triangles (t1_1, t1_2, t1_3, ...)"
    )
    triangle_groups: Optional[list[int]] = Field(description="Assign a number to each triangle to group them.")
    group_colors: Optional[Mapping[int, ColorT]] = Field(
        description="Assign a color to each group. If not assigned, default primitives group color is used. Takes precedence over triangle_colors."
    )
    group_tooltips: Optional[Mapping[int, str]] = Field(description="Assign an optional tooltip to each group.")
    triangle_colors: Optional[list[ColorT]] = Field(description="Assign a color to each triangle.")
    tooltip: Optional[str] = Field(
        description="Tooltip shown when hovering over the mesh. Assigned group_tooltips take precedence."
    )
    color: Optional[ColorT] = Field(description="Default color of the triangles.")
    show_triangles: Optional[bool] = Field(description="Determine whether to render triangles of the mesh")
    show_wireframe: Optional[bool] = Field(description="Determine whether to render wireframe of the mesh")
    wireframe_radius: Optional[float] = Field(description="Wireframe line radius")
    wireframe_color: Optional[ColorT] = Field(description="Wireframe color, uses triangle/group colors when not set")


class LinesParams(BaseModel):
    """
    Low-level, fully customizable lines representation of a shape.
    """

    kind: Literal["lines"] = "lines"
    vertices: list[float] = Field(description="3N length array of floats with vertex position (x1, y1, z1, ...)")
    indices: list[int] = Field(
        description="2N length array of indices into vertices that form lines (l1_1, ll1_2, ...)"
    )
    line_groups: Optional[list[int]] = Field(description="Assign a number to each triangle to group them.")
    group_colors: Optional[Mapping[int, ColorT]] = Field(
        description="Assign a color to each group. If not assigned, default primitives group color is used. Takes precedence over line_colors."
    )
    group_tooltips: Optional[Mapping[int, str]] = Field(description="Assign an optional tooltip to each group.")
    group_radius: Optional[Mapping[int, float]] = Field(
        description="Assign an optional radius to each group. Take precenence over line_radius."
    )
    line_colors: Optional[list[ColorT]] = Field(description="Assign a color to each line.")
    tooltip: Optional[str] = Field(
        description="Tooltip shown when hovering over the lines. Assigned group_tooltips take precedence."
    )
    line_radius: Optional[float] = Field(description="Line radius")
    color: Optional[ColorT] = Field(description="Default color of the lines.")


class _LineParamsBase(BaseModel):
    start: PrimitivePositionT = Field(description="Start of this line.")
    end: PrimitivePositionT = Field(description="End of this line.")
    thickness: Optional[float] = Field(description="Thickness of this line.")
    dash_length: Optional[float] = Field(description="Length of each dash.")
    # NOTE: this is currently not supported by Mol*, but can add it later if needed.
    # dash_start: Optional[float] = Field(description="Offset from start coords before the 1st dash is drawn.")
    # gap_length: Optional[float] = Field(description="Length of optional gaps between dashes. Set to 0 for solid line.")
    color: Optional[ColorT] = Field(
        description="Color of the line. If not specified, the primitives group color is used."
    )


class LineParams(_LineParamsBase):
    kind: Literal["line"] = "line"
    tooltip: Optional[str] = Field(description="Tooltip to show when hovering on the line.")


class DistanceMeasurementParams(_LineParamsBase, LabelCommonProps):
    kind: Literal["distance_measurement"] = "distance_measurement"

class PrimitiveLabelParams(_LineParamsBase):
    kind: Literal["label"] = "label"
    position: PrimitivePositionT = Field(description="Position of this label.")
    text: str = Field(default="The label.")
    label_size: Optional[float] = Field(description="Size of the label.")
    label_color: Optional[ColorT] = Field(description="Color of the label.")
    label_offset: Optional[float] = Field(description="Camera-facing offset to prevent overlap with geometry.")


class PlaneParams(BaseModel):
    # TODO: bounding_box?
    kind: Literal["plane"] = "plane"
    point: PrimitivePositionT = Field(description="Point on plane.")
    normal: Vec3[float] = Field(description="Normal vector of plane.")


PrimitiveParamsT = MeshParams | LinesParams | LineParams | DistanceMeasurementParams | PlaneParams


class PrimitivesFromUriParams(BaseModel):
    uri: str = Field(description="Location of the resource")
    format: Literal["mvs-node-json"] = Field(description="Format of the data")
    references: Optional[list[str]] = Field(description="List of nodes the data are referencing")


def validate_state_tree(json: str) -> None:
    """
    Validates a JSON string and checks whether it's a valid state representation.
    :param json: payload to validate
    :raises ValidationError if JSON is malformed or state tree type definitions are violated
    """
    State.parse_raw(json)

# TODO: to be discussed
# class TooltipAndColorProps(BaseModel):
#     tooltip: Optional[str] = Field(description="Default tooltip for primitives in this group")
#     color: Optional[ColorT] = Field(
#         description="Color of the line. If not specified, the primitives group color is used."
#     )

# TODO: fields instead of plain types
class CircleParams(BaseModel):
    center: Vec3 = Field(description="The center of the circle.")
    # TODO: elaborate names and semantics depending on
    # how Mol* implements circles
    # (should be dir_major and dir_minor perhaps as these two here are just Vec3)
    major_axis: PrimitivePositionT = Field(description="Major axis of this circle.")
    minor_axis: PrimitivePositionT = Field(description="Minor axis of this circle.")

# TODO: add collection of descriptions for the fields with the same name
class Polygon(BaseModel):
    vertices: list[float] = Field(description="3N length array of floats with vertex position (x1, y1, z1, ...)")
    
class Star(BaseModel):
    center: Vec3 = Field(description="The center of the star.")
    inner_radius: float = Field(description="The inner radius of the star")
    outer_radius: float = Field(description="The outer radius of the star")
    # TODO: is this correct meaning?
    point_count: int = Field(description="The number of points the star contains")
    # TODO: inherit from TransformParams instead?
    rotation: Optional[Mat3[float]] = Field(
        description="9d vector describing the rotation, in a column major (j * 3 + i indexing) format, this is equivalent to Fortran-order in numpy, to be multiplied from the left",
    )
    
class BoxParams(TransformParams):
    center: Vec3 = Field(description="The center of the box")
    # TODO: is this correct meaning?
    extent: Vec3 = Field(description="The height and width of the box")
    # TODO: include in TransformParams instead?
    scaling: Optional[Vec3[float]] = Field(description="3d vector describing the scaling.")
    as_edges: Optional[bool] = Field(description="Determine whether to render the box as edges.")
    # TODO: meaning of this? Thickness of edges?
    edge_radius: Optional[float] = Field(description="The thickness of edges.")

class CylinderParams(BaseModel):
    center: Vec3 = Field(description="The center of the box")
    radius_top: float = Field(description="The radius of the top of the cylinder top. Radius equal to zero will yield a cone.")
    radius_bottom: float = Field(description="The radius of the bottom of the cylinder. Radius equal to zero will yield a reversed cone.")
    height: float = Field(description="The height of the cone.")
    # TODO: meaning of the following two? Check Sebastian's answers in some of the PRs.
    theta_start: float = Field(description="TODO")
    theta_length: float = Field(description="TODO")
    # TODO: type for rotation as field
    rotation: Optional[Mat3[float]] = Field(
        description="9d vector describing the rotation, in a column major (j * 3 + i indexing) format, this is equivalent to Fortran-order in numpy, to be multiplied from the left",
    )
    bottom_cap: bool = Field(description="Determine whether to cap the top of the cylinder.")
    top_cap: bool = Field(description="Determine whether to cap the bottom of the cylinder.")
    

# NOTE: arrow should be derived from line perhaps?
# This allows us to make use of inheritance 
class ArrowParams(_LineParamsBase):
    # TODO: clarify meaning of the following to and modify depending
    # on frontend implementation
    arrow_radius: float = Field(description="The radius (extent) of the arrow.")
    arrow_height: float = Field(description="The height of the arrow.")
    arrow_from: Vec3 = Field(description="Start of the arrow.")
    arrow_to: Vec3 = Field(description="End of the arrow.")
    
SolidKindTypeT = Literal["tetra", "octa", "dodeca", "icosahedron"]

class PlatonicSolidParams(BaseModel):
    solid_kind: SolidKindTypeT
    center: float = Field(description="The center of the platonic solid.")
    radius: float = Field(description="The radius of the platonic solid.")
    rotation: Optional[Mat3[float]] = Field(
        description="9d vector describing the rotation, in a column major (j * 3 + i indexing) format, this is equivalent to Fortran-order in numpy, to be multiplied from the left",
    )
    
class PrismParams(BaseModel):
    position: PrimitivePositionT = Field(description="Position of this prism.")
    # TODO: meaning?
    base_point_count: int = Field(description="Count of base points")
    height: float = Field(description="The height of the prism.")
    rotation: Optional[Mat3[float]] = Field(
        description="9d vector describing the rotation, in a column major (j * 3 + i indexing) format, this is equivalent to Fortran-order in numpy, to be multiplied from the left",
    )
    
class PyramidParams(BaseModel):
    vertices: list[float] = Field(description="3N length array of floats with vertex position (x1, y1, z1, ...)")
    translation: Optional[Vec3[float]] = Field(description="3d vector describing the translation")
    scaling: Optional[Vec3[float]] = Field(description="3d vector describing the scaling")
    rotation: Optional[Mat3[float]] = Field(
        description="9d vector describing the rotation, in a column major (j * 3 + i indexing) format, this is equivalent to Fortran-order in numpy, to be multiplied from the left",
    )

class SphereParams(BaseModel):
    center: Vec3 = Field(description="The center of the circle.")
    radius: float | PrimitivePositionT = Field(description="The radius of the sphere.")
    
    # TODO:
class TorusParams(BaseModel):
    center: Vec3 = Field(description="The center of the torus.")
    outer_radius: float = Field(description="The outer radius of the torus")
    tube_radius: float = Field(description="The tube radius.")
    # TODO:
    theta_start: float = Field(description="TODO")
    # TODO:
    theta_length: float = Field(description="TODO")
    rotation: Optional[Mat3[float]] = Field(
        description="9d vector describing the rotation, in a column major (j * 3 + i indexing) format, this is equivalent to Fortran-order in numpy, to be multiplied from the left",
    )

class WedgeParams(BaseModel):
    center: Vec3 = Field(description="The center of the wedge.")
    width: float = Field(description="The width of the wedge.")
    height: float = Field(description="The height of the wedge.")
    depth: float = Field(description="The depth of the wedge.")
    rotation: Optional[Mat3[float]] = Field(
        description="9d vector describing the rotation, in a column major (j * 3 + i indexing) format, this is equivalent to Fortran-order in numpy, to be multiplied from the left",
    )
    
class EllipsoidParams(BaseModel):
    # TODO: adjust based on frontend implementation
    direction_major: Vec3[float] = Field(description="Major direction of the ellipsoid.")
    direction_minor: Vec3[float] = Field(description="Minor direction of the ellipsoid.")
    direction_normal: Vec3[float] = Field(description="Normal direction of the ellipsoid.")
    center: Vec3 = Field(description="The center of the ellipsoid.")
    # TODO: is the meaning correct
    radius_scale: Optional[Vec3[float]] = Field(description="3d vector describing the radius scaling.")

# TODO:
class DistanceParams(LabelCommonProps):
    a: PrimitivePositionT = Field(description="The first point.")
    b: PrimitivePositionT = Field(description="The second point.")

class AngleParams(LabelCommonProps):
    a: PrimitivePositionT = Field(description="The first point.")
    b: PrimitivePositionT = Field(description="The second point.")
    c: PrimitivePositionT = Field(description="The third point.")
        
class DihedralParams(LabelCommonProps, _LineParamsBase): 
    a: PrimitivePositionT = Field(description="The first point.")
    b: PrimitivePositionT = Field(description="The second point.")
    c: PrimitivePositionT = Field(description="The third point.")
    d: PrimitivePositionT = Field(description="The fourth point.")
    # TODO: angle visual props - what does it mean?
