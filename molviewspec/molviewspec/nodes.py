from typing import Literal, NotRequired, TypedDict


class NodeBase(TypedDict):
    pass


class ParentNodeBase(NodeBase):
    children: list["NodeBase"]


class TerminalNodeBase(NodeBase):
    pass


class RootNode(ParentNodeBase):
    kind: Literal["root"]


class DownloadNode(ParentNodeBase):
    kind: Literal["download"]
    url: str


ParseFormatT = Literal["mmcif", "pdb"]


class ParseNode(ParentNodeBase):
    kind: Literal["parse"]
    format: ParseFormatT
    is_binary: NotRequired[bool]


class StructureNode(ParentNodeBase):
    kind: Literal["structure"]
    assembly_id: NotRequired[str]
    model_index: NotRequired[int]


ComponentSelectorT = Literal["all", "polymer", "protein", "nucleic", "ligand", "ion", "water"]


class ComponentNode(ParentNodeBase):
    kind: Literal["component"]
    selector: ComponentSelectorT


RepresentationTypeT = Literal["ball-and-stick", "cartoon", "surface"]
ColorT = Literal["red", "white", "blue"]  # presumably this is a general type and will be useful elsewhere
# TODO possible to type for hex color strings here?


class RepresentationNode(TerminalNodeBase):
    kind: Literal["representation"]
    type: RepresentationTypeT
    color: NotRequired[ColorT]
