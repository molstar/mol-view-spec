from typing import Literal, NotRequired, TypedDict


class NodeBase(TypedDict):
    children: list["NodeBase"]


class RootNode(NodeBase):
    kind: Literal["root"]


class DownloadNode(NodeBase):
    kind: Literal["download"]
    url: str
    is_binary: NotRequired[bool]


ParseFormatT = Literal["mmcif", "pdb"]


class ParseNode(NodeBase):
    kind: Literal["parse"]
    format: ParseFormatT
