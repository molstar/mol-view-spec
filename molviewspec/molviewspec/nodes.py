from typing import Any, Literal, Mapping, NotRequired, TypedDict, Union

from .params_utils import Params


KindT = Literal[
    "root",
    "camera",
    "canvas",
    "color",
    "color-from-cif",
    "color-from-url",
    "component",
    "download",
    "focus",
    "generic-visuals",
    "label",
    "label-from-cif",
    "label-from-url",
    "line",
    "parse",
    "representation",
    "sphere",
    "structure",
    "tooltip",
    "tooltip-from-cif",
    "tooltip-from-url",
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


class StructureParams(Params):
    kind: Literal["model", "assembly", "symmetry", "crystal-symmetry"]
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
    # group_id: NotRequired[str]
    # """This allows to merge multiple selections into one (when they have the same `group_id`) for example to show one label for two chains; if the `group_id` is not given, the selection is processed separately"""
    # Not sure if group_id should be here (it makes sense in data from JSON/CIF, but not for inline)


class ComponentParams(Params):
    selector: ComponentSelectorT | ComponentExpression | list[ComponentExpression]


RepresentationTypeT = Literal["ball-and-stick", "cartoon", "surface"]
ColorNamesT = Literal["white", "gray", "black", "red", "orange", "yellow", "green", "cyan", "blue", "magenta"]
ColorT = Union[ColorNamesT, str]  # str represents hex colors for now


class RepresentationParams(Params):
    type: RepresentationTypeT
    color: NotRequired[ColorT]


SchemaT = Literal[
    "whole-structure",
    "entity",
    "chain",
    "auth-chain",
    "residue",
    "auth-residue",
    "residue-range",
    "auth-residue-range",
    "atom",
    "auth-atom",
]
SchemaFormatT = Literal["cif", "bcif", "json"]


class _DataFromUrlParams(Params):
    url: str
    format: SchemaFormatT
    category_name: NotRequired[str]
    """Only applies when format is 'cif' or 'bcif'"""
    field_name: NotRequired[str]
    """Name of the column in CIF or field name (key) in JSON that contains the desired value (color/label/tooltip...); the default value is 'color'/'label'/'tooltip' depending on the node type"""
    block_header: NotRequired[str]
    """Only applies when format is 'cif' or 'bcif'"""
    block_index: NotRequired[int]
    """Only applies when format is 'cif' or 'bcif'"""
    schema: SchemaT


class _DataFromCifParams(Params):
    category_name: str
    field_name: NotRequired[str]
    """Name of the column in CIF that contains the desired value (color/label/tooltip...); the default value is 'color'/'label'/'tooltip' depending on the node type"""
    block_header: NotRequired[str]
    block_index: NotRequired[int]
    schema: SchemaT


class ColorInlineParams(Params):
    color: ColorT
    # schema and other stuff not needed here, the color will be applied on the whole parent Structure or Component


class ColorUrlParams(_DataFromUrlParams):
    pass


class ColorCifCategoryParams(_DataFromCifParams):
    pass


class LabelInlineParams(Params):
    text: str
    # schema and other stuff not needed here, the label will be applied on the whole parent Structure or Component


class LabelUrlParams(_DataFromUrlParams):
    pass


class LabelCifCategoryParams(_DataFromCifParams):
    pass


class TooltipInlineParams(Params):
    text: str
    # schema and other stuff not needed here, the tooltip will be applied on the whole parent Structure or Component


class TooltipUrlParams(_DataFromUrlParams):
    pass


class TooltipCifCategoryParams(_DataFromCifParams):
    pass


class FocusInlineParams(Params):
    pass
    # nothing needed here, the focus will be applied on the whole parent Structure or Component


class TransformParams(Params):
    transformation: NotRequired[tuple[float, ...]]
    """4x4 matrix in a column major (j * 4 + i indexing) format, this is equivalent to Fortran-order in numpy, 
    to be multiplied from the left"""
    rotation: NotRequired[tuple[float, ...]]
    """In a column major (j * 3 + i indexing) format, this is equivalent to Fortran-order in numpy, to be multiplied 
    from the left"""
    translation: NotRequired[tuple[float, float, float]]


class CameraParams(Params):
    position: tuple[float, float, float]
    direction: tuple[float, float, float]
    radius: float


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
