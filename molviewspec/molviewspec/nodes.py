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
    "apply_selection",
    "camera",
    "canvas",
    "circle",  # TODO should be prefix/namespace geom prims?
    "color",
    "color_from_source",
    "color_from_uri",
    "component",
    "component_from_source",
    "component_from_uri",
    "download",
    "focus",
    "primitives",
    "label",
    "label_from_source",
    "label_from_uri",
    "mesh",
    "mesh_from_source",
    "mesh_from_uri",
    "options",
    "parse",
    "plane",
    "representation",
    "structure",
    "tooltip",
    "tooltip_from_source",
    "tooltip_from_uri",
    "transform",
    "transparency",
]


AdditionalProperties = Optional[Mapping[str, Any]]
additional_properties_name = "additional_properties"  # make potential refactors a bit easier -- check also refs below


class Node(BaseModel):
    """
    Base impl of all state tree nodes.
    """

    kind: KindT = Field(description="The type of this node.")
    params: Optional[Mapping[str, Any]] = Field(description="Optional params that are needed for this node.")
    additional_properties: AdditionalProperties = Field(
        description="Optional free-style dict with custom, non-schema props."
    )
    children: Optional[list[Node]] = Field(description="Optional collection of nested child nodes.")


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
    lingerDurationMs: Optional[int] = Field(
        description="How long to linger on one snapshot. Leave empty to not transition automatically."
    )
    transitionDurationMs: Optional[int] = Field(
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


class ApplySelectionInlineParams(BaseModel):
    """
    Params to customize how surroundings of a Component are presented.
    """

    surroundings_radius: Optional[float] = Field(
        description="Distance threshold in Angstrom, everything below this cutoff will be included as surroundings"
    )
    show_non_covalent_interactions: Optional[bool] = Field(
        description="Show non-covalent interactions between this component and its surroundings?"
    )


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


# TODO anything but Vec3[float] are placeholders and need to be impled
PositionT = Union[Vec3[float], str, ComponentExpression, list[ComponentExpression]]
"""
Positions of primitives can be defined by 3D vector, by providing a unique reference of a component, or by providing 
appropriate selection expressions.
"""


class MeshInlineParams(BaseModel):
    """
    Low-level, fully customizable mesh representation of a shape.
    """

    vertices: list[Vec3[float]]
    indices: list[Vec3[int]]
    colors: Optional[list[ColorT]]


class MeshFromUriParams(_DataFromUriParams):
    """
    Mesh based on another resource. Currently, only JSON is supported.
    """


class MeshFromSourceParams(_DataFromSourceParams):
    """
    Mesh based on a category in the source file. Currently, only JSON is supported.
    """


class CircleParams(BaseModel):
    center: PositionT = Field(description="Center of circle.")
    radius: float = Field(description="Radius of circle.", gt=0.0)
    segments: Optional[int] = Field(description="Number of segments to draw, level of detail.")
    theta_start: Optional[float] = Field(description="Start point position (relevant when this is an arc).")
    theta_length: Optional[float] = Field(description="Values < PI*2 will result in an arc.")
    rotation: Optional[Mat3[float]] = Field(description="Optional rotation of this item.")


class PlaneParams(BaseModel):
    point: PositionT = Field(description="Point on plane.")
    normal: Vec3[float] = Field(description="Normal vector of plane.")


def validate_state_tree(json: str) -> None:
    """
    Validates a JSON string and checks whether it's a valid state representation.
    :param json: payload to validate
    :raises ValidationError if JSON is malformed or state tree type definitions are violated
    """
    State.parse_raw(json)
