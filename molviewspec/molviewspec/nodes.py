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
    children: NotRequired[list["Node"]]
    params: NotRequired[Mapping[str, Any]]  # TODO try to make more exact


class DownloadParams(TypedDict):
    url: str


ParseFormatT = Literal["mmcif", "pdb"]


class ParseParams(TypedDict):
    format: ParseFormatT
    is_binary: NotRequired[bool]


class StructureParams(TypedDict):
    assembly_id: NotRequired[str]
    model_index: NotRequired[int]


ComponentSelectorT = Literal["all", "polymer", "protein", "nucleic", "ligand", "ion", "water"]


class ComponentParams(TypedDict):
    selector: ComponentSelectorT


RepresentationTypeT = Literal["ball-and-stick", "cartoon", "surface"]
ColorT = Literal["red", "white", "blue"]  # presumably this is a general type and will be useful elsewhere
# TODO possible to type for hex color strings here?


class RepresentationParams(TypedDict):
    type: RepresentationTypeT
    color: NotRequired[ColorT]


class LabelParams(TypedDict):
    label_asym_id: str
    label_seq_id: int
    text: str


class LabelCifCategoryParams(TypedDict):
    category_name: str


class ColorParams(TypedDict):
    label_asym_id: str
    label_seq_id: int
    color: ColorT


class ColorCifCategoryParams(TypedDict):
    category_name: str
