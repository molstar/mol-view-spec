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


class DownloadParams(TypedDict):
    url: str


ParseFormatT = Literal["mmcif", "pdb"]


class ParseParams(TypedDict):
    format: ParseFormatT
    is_binary: NotRequired[bool]


class StructureParams(TypedDict):
    assembly_id: NotRequired[str]
    model_index: NotRequired[int]


ComponentSelectorT = Literal[
    "all", "polymer", "protein", "nucleic", "ligand", "ion", "water"
]


class ComponentParams(TypedDict):
    selector: ComponentSelectorT


RepresentationTypeT = Literal["ball-and-stick", "cartoon", "surface"]
ColorT = Literal[
    "red", "white", "blue"
]  # presumably this is a general type and will be useful elsewhere
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
