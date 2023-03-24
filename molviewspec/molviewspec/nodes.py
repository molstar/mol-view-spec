from typing import Literal, NotRequired, TypedDict


class NodeBase(TypedDict):
    children: NotRequired[list["NodeBase"]]


class RootNode(NodeBase):
    kind: Literal["root"]


class DownloadNode(NodeBase):
    kind: Literal["download"]
    url: str


ParseFormatT = Literal["mmcif", "pdb"]


class ParseNode(NodeBase):
    kind: Literal["parse"]
    format: ParseFormatT
    is_binary: NotRequired[bool]


class StructureNode(NodeBase):
    kind: Literal["structure"]
    assembly_id: NotRequired[str]
    model_index: NotRequired[int]


ComponentSelectorT = Literal["all", "polymer", "protein", "nucleic", "ligand", "ion", "water"]


class ComponentNode(NodeBase):
    kind: Literal["component"]
    selector: ComponentSelectorT


RepresentationTypeT = Literal["ball-and-stick", "cartoon", "surface"]
ColorT = Literal["red", "white", "blue"]  # presumably this is a general type and will be useful elsewhere
# TODO possible to type for hex color strings here?


class RepresentationNode(NodeBase):
    kind: Literal["representation"]
    type: RepresentationTypeT
    color: NotRequired[ColorT]


class LabelNode(NodeBase):
    kind: Literal["label"]
    label_asym_id: str
    label_seq_id: int
    text: str


class LabelCifCategoryNode(NodeBase):
    kind: Literal["label-from-cif"]
    category_name: str
