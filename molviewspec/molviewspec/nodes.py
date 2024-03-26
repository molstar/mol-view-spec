"""
Definitions of all 'nodes' used by the MolViewSpec format specification and its builder implementation.
"""

from __future__ import annotations

from typing import Any, Literal, Mapping, Optional, Union

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
    "generic_visuals",
    "label",
    "label_from_source",
    "label_from_uri",
    "line",
    "parse",
    "representation",
    "sphere",
    "structure",
    "tooltip",
    "tooltip_from_source",
    "tooltip_from_uri",
    "transform",
]


class Node(BaseModel):
    """
    Base impl of all state tree nodes.
    """

    kind: KindT = Field(description="The type of this node.")
    params: Optional[Mapping[str, Any]] = Field(description="Optional params that are needed for this node.")
    children: Optional[list[Node]] = Field(description="Optional collection of nested child nodes.")


DescriptionFormatT = Literal["markdown", "plaintext"]


class Metadata(BaseModel):
    """
    Global metadata, which describes the purpose and creation date of a state tree.
    """

    version: str = Field(description="Version of the spec used to write this tree.")
    title: Optional[str] = Field(description="Name of this view.")
    description: Optional[str] = Field(description="Detailed description of this view.")
    description_format: Optional[DescriptionFormatT] = Field(description="Format of the description.")
    timestamp: str = Field(description="Timestamp when this view was exported.")


class State(BaseModel):
    """
    Root node of all state trees.
    """

    root: Node = Field(description="Root of the node tree.")
    metadata: Metadata = Field(description="Associated metadata.")


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
    ijk_min: Optional[tuple[int, int, int]] = Field(description="Bottom-left Miller indices")
    ijk_max: Optional[tuple[int, int, int]] = Field(description="Top-right Miller indices")


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

    direction: Optional[tuple[float, float, float]] = Field(
        description="Direction of the view (vector position -> target)"
    )
    up: Optional[tuple[float, float, float]] = Field(
        description="Controls the rotation around the vector between target and position"
    )


class TransformParams(BaseModel):
    """
    Define a transformation.
    """

    rotation: Optional[tuple[float, ...]] = Field(
        description="9d vector describing the rotation, in a column major (j * 3 + i indexing) format, this is equivalent to Fortran-order in numpy, to be multiplied from the left",
    )
    translation: Optional[tuple[float, float, float]] = Field(description="3d vector describing the translation")


class CameraParams(BaseModel):
    """
    Controls the global camera position.
    """

    target: tuple[float, float, float] = Field(description="What to look at")
    position: tuple[float, float, float] = Field(description="The position of the camera")
    up: tuple[float, float, float] = Field(
        description="Controls the rotation around the vector between target and position", required=True
    )


class CanvasParams(BaseModel):
    """
    Controls global canvas properties.
    """

    background_color: ColorT = Field(description="Background color using SVG color names or RGB hex code")


class SphereParams(BaseModel):
    """
    Experimental: Defines a sphere primitive.
    """

    position: tuple[float, float, float] = Field(description="Position of the primitive")
    radius: float = Field(description="Radius of the sphere")
    color: ColorT = Field(description="Color of the sphere")
    label: Optional[str] = Field(description="Optional text label")
    tooltip: Optional[str] = Field(description="Optional tooltip label, shown upon hover")


class LineParams(BaseModel):
    """
    Experimental: Defines a line primitive.
    """

    position1: tuple[float, float, float] = Field(description="Start position of the primitive")
    position2: tuple[float, float, float] = Field(description="End position of the primitive")
    radius: float = Field(description="Radius of the line")
    color: ColorT = Field(description="Color of the line")
    label: Optional[str] = Field(description="Optional text label")
    tooltip: Optional[str] = Field(description="Optional tooltip label, shown upon hover")


def validate_state_tree(json: str) -> None:
    """
    Validates a JSON string and checks whether it's a valid state representation.
    :param json: payload to validate
    :raises ValidationError if JSON is malformed or state tree type definitions are violated
    """
    State.parse_raw(json)
