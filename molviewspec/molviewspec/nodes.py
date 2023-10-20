from typing import Any, Literal, Mapping, Union

from typing_extensions import NotRequired, TypedDict

from .params_utils import Params

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


class Node(TypedDict):
    kind: KindT
    params: NotRequired[Mapping[str, Any]]
    children: NotRequired[list["Node"]]


class State(TypedDict):
    version: int
    root: Node


class DownloadParams(Params):
    url: str


ParseFormatT = Literal["mmcif", "bcif", "pdb"]


class ParseParams(Params):
    format: ParseFormatT


StructureKindT = Literal["model", "assembly", "symmetry", "symmetry_mates"]


class StructureParams(Params):
    kind: StructureKindT
    assembly_id: NotRequired[str]
    """Use the name to specify which assembly to load"""
    assembly_index: NotRequired[int]
    """0-based assembly index, use this to load the 1st assembly"""
    model_index: NotRequired[int]
    """0-based model index in case multiple NMR frames are present"""
    block_index: NotRequired[int]
    """0-based block index in case multiple mmCIF or SDF data blocks are present"""
    block_header: NotRequired[str]
    """Reference a specific mmCIF or SDF data block by its block header"""
    radius: NotRequired[float]
    """Radius around model coordinates when loading symmetry mates"""
    ijk_min: NotRequired[tuple[int, int, int]]
    """Bottom-left Miller indices"""
    ijk_max: NotRequired[tuple[int, int, int]]
    """Top-right Miller indices"""


ComponentSelectorT = Literal["all", "polymer", "protein", "nucleic", "branched", "ligand", "ion", "water"]


class ComponentExpression(TypedDict):  # Feel free to rename (this used to be InlineSchemaParams)
    label_entity_id: NotRequired[str]
    label_asym_id: NotRequired[str]
    auth_asym_id: NotRequired[str]
    label_seq_id: NotRequired[int]
    auth_seq_id: NotRequired[int]
    pdbx_PDB_ins_code: NotRequired[str]
    beg_label_seq_id: NotRequired[int]
    end_label_seq_id: NotRequired[int]
    """End indices are inclusive"""
    beg_auth_seq_id: NotRequired[int]
    end_auth_seq_id: NotRequired[int]
    """End indices are inclusive"""
    residue_index: NotRequired[int]
    """0-based residue index in the source file"""
    label_atom_id: NotRequired[int]
    """Atom name like 'CA', 'N', 'O' (`_atom_site.label_atom_id`)"""
    auth_atom_id: NotRequired[int]
    """Atom name like 'CA', 'N', 'O' (`_atom_site.auth_atom_id`)"""
    type_symbol: NotRequired[str]
    """Element symbol like 'H', 'HE', 'LI', 'BE' (`_atom_site.type_symbol`)"""
    atom_id: NotRequired[int]
    """Unique atom identifier (`_atom_site.id`)"""
    atom_index: NotRequired[int]
    """0-based atom index in the source file"""


RepresentationTypeT = Literal["ball_and_stick", "cartoon", "surface"]
ColorNamesT = Literal["white", "gray", "black", "red", "orange", "yellow", "green", "cyan", "blue", "magenta"]
ColorT = Union[ColorNamesT, str]  # str represents hex colors for now


class RepresentationParams(Params):
    type: RepresentationTypeT


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


class _DataFromUriParams(Params):
    uri: str
    format: SchemaFormatT
    category_name: NotRequired[str]
    """Only applies when format is 'cif' or 'bcif'"""
    field_name: NotRequired[str]
    """Name of the column in CIF or field name (key) in JSON that contains the desired value (color/label/tooltip/component...); the default value is 'color'/'label'/'tooltip'/'component' depending on the node type"""
    block_header: NotRequired[str]
    """Only applies when format is 'cif' or 'bcif'"""
    block_index: NotRequired[int]
    """Only applies when format is 'cif' or 'bcif'"""
    schema: SchemaT


class _DataFromSourceParams(Params):
    category_name: str
    field_name: NotRequired[str]
    """Name of the column in CIF that contains the desired value (color/label/tooltip/component...); the default value is 'color'/'label'/'tooltip'/'component' depending on the node type"""
    block_header: NotRequired[str]
    block_index: NotRequired[int]
    schema: SchemaT


class ComponentInlineParams(Params):
    selector: ComponentSelectorT | ComponentExpression | list[ComponentExpression]


class ComponentFromUriParams(_DataFromUriParams):
    field_values: NotRequired[list[str]]
    """Create the component from rows that have any of these values in the field specified by `field_name`. If not provided, create the component from all rows."""


class ComponentFromSourceParams(_DataFromSourceParams):
    field_values: NotRequired[list[str]]
    """Create the component from rows that have any of these values in the field specified by `field_name`. If not provided, create the component from all rows."""


class ColorInlineParams(ComponentInlineParams):
    color: ColorT


class ColorFromUriParams(_DataFromUriParams):
    pass


class ColorFromSourceParams(_DataFromSourceParams):
    pass


class LabelInlineParams(Params):
    text: str
    # schema and other stuff not needed here, the label will be applied on the whole parent Structure or Component


class LabelFromUriParams(_DataFromUriParams):
    pass


class LabelFromSourceParams(_DataFromSourceParams):
    pass


class TooltipInlineParams(Params):
    text: str
    # schema and other stuff not needed here, the tooltip will be applied on the whole parent Structure or Component


class TooltipFromUriParams(_DataFromUriParams):
    pass


class TooltipFromSourceParams(_DataFromSourceParams):
    pass


class FocusInlineParams(Params):
    direction: NotRequired[tuple[float, float, float]]
    """Direction of the view (vector position -> target)"""
    up: NotRequired[tuple[float, float, float]]
    """Controls the rotation around the vector between target and position"""


class TransformParams(Params):
    rotation: NotRequired[tuple[float, ...]]
    """In a column major (j * 3 + i indexing) format, this is equivalent to Fortran-order in numpy, to be multiplied 
    from the left"""
    translation: NotRequired[tuple[float, float, float]]


class CameraParams(Params):
    target: tuple[float, float, float]
    """What to look at"""
    position: tuple[float, float, float]
    """The position of the camera"""
    up: NotRequired[tuple[float, float, float]]
    """Controls the rotation around the vector between target and position"""


class CanvasParams(Params):
    background_color: ColorT


class SphereParams(Params):
    position: tuple[float, float, float]
    radius: float
    color: ColorT
    label: NotRequired[str]
    tooltip: NotRequired[str]


class LineParams(Params):
    position1: tuple[float, float, float]
    position2: tuple[float, float, float]
    radius: float
    color: ColorT
    label: NotRequired[str]
    tooltip: NotRequired[str]
