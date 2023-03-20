from molviewspec.nodes import (
    ColorT,
    ComponentNode,
    ComponentSelectorT,
    DownloadNode,
    ParentNodeBase,
    ParseFormatT,
    ParseNode,
    RepresentationNode,
    RepresentationTypeT,
    RootNode,
    StructureNode,
)


def create_builder() -> "Root":
    return Root()


class Root:
    node: RootNode = {"kind": "root", "children": []}

    def download(self, *, url: str) -> "Download":
        node: DownloadNode = {"kind": "download", "url": url, "children": []}
        self.node["children"].append(node)
        return Download(node=node, root=self)


class _Base:
    def __init__(self, *, root: Root, node: ParentNodeBase) -> None:
        self.root = root
        self.node = node


class Download(_Base):
    def parse(self, *, format: ParseFormatT, is_binary: bool = False) -> "Parse":
        node: ParseNode = {"kind": "parse", "format": format, "is_binary": is_binary, "children": []}
        self.node["children"].append(node)
        return Parse(node=node, root=self.root)


class Parse(_Base):
    def structure(self, *, assembly_id: str = "1", model_index: int = 1) -> "Structure":
        node: StructureNode = {
            "kind": "structure",
            "assembly_id": assembly_id,
            "model_index": model_index,
            "children": [],
        }
        self.node["children"].append(node)
        return Structure(node=node, root=self.root)


class Structure(_Base):
    def component(self, *, selector: ComponentSelectorT) -> "Component":
        node: ComponentNode = {"kind": "component", "selector": selector, "children": []}
        self.node["children"].append(node)
        return Component(node=node, root=self.root)


class Component(_Base):
    def representation(self, *, type: RepresentationTypeT = "cartoon", color: ColorT = "red"):
        node: RepresentationNode = {"kind": "representation", "type": type, "color": color}
        self.node["children"].append(node)
