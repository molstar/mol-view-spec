from typing import Any, Literal, Mapping, NotRequired, TypedDict

KindT = Literal[
    "root",
    "download",
    "parse",
    "structure",
    "component",
    "representation",
    "label",
    "label-from-cif",
    "color",
    "color-from-cif",
]


class Node(TypedDict):
    kind: KindT
    params: NotRequired[Mapping[str, Any]]
    children: NotRequired[list["Node"]]


class State(TypedDict):
    version: int
    root: Node


class DownloadParams(TypedDict):
    url: str


ParseFormatT = Literal["mmcif", "pdb"]


class ParseParams(TypedDict):
    format: ParseFormatT
    is_binary: NotRequired[bool]


class StructureParams(TypedDict):
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


class ComponentParams(TypedDict):
    selector: ComponentSelectorT


# TODO add possibility to define custom selections
#     - category name | URL | data
#     - schema: chain, ... residue-ranges, auth-residue-ranges, atom...
#     - is_binary
#     - format

RepresentationTypeT = Literal["ball-and-stick", "cartoon", "surface"]
ColorT = Literal["red", "white", "blue"]  # presumably this is a general type and will be useful elsewhere
# TODO possible to type for hex color strings here?


class RepresentationParams(TypedDict):
    type: RepresentationTypeT
    color: NotRequired[ColorT]


class LabelParams(TypedDict):
    label_asym_id: NotRequired[str]
    label_entity_id: NotRequired[str]
    label_seq_id: NotRequired[int]
    auth_asym_id: NotRequired[str]
    auth_seq_id: NotRequired[int]
    pdbx_PDB_ins_code: NotRequired[str]
    beg_label_seq_id: NotRequired[int]
    end_label_seq_id: NotRequired[int]
    beg_auth_seq_id: NotRequired[int]
    end_auth_seq_id: NotRequired[int]
    text: str


class LabelCifCategoryParams(TypedDict):
    category_name: str


class ColorParams(TypedDict):
    label_asym_id: NotRequired[str]  # TODO how are we feelin'?
    label_entity_id: NotRequired[str]
    label_seq_id: NotRequired[int]
    auth_asym_id: NotRequired[str]
    auth_seq_id: NotRequired[int]
    pdbx_PDB_ins_code: NotRequired[str]
    # TODO all of these could be broken into subclasses: ColorLabelParams, ColorAuthParams, ColorLabelRangeParams, ...
    # TODO on top of that, both label and color basically extend the same "Identifier" class
    beg_label_seq_id: NotRequired[int]
    end_label_seq_id: NotRequired[int]
    beg_auth_seq_id: NotRequired[int]
    end_auth_seq_id: NotRequired[int]
    tooltip: NotRequired[str]
    color: ColorT


class ColorCifCategoryParams(TypedDict):
    category_name: str
