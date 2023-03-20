from molviewspec.nodes import ColorT, ComponentNode, ComponentSelectorT, DownloadNode, NodeBase, ParseFormatT,\
    ParseNode, RepresentationNode, RepresentationTypeT, RootNode, StructureNode


def create_builder() -> "Root":
    return Root()


class Root:
    node: RootNode = {"kind": "root", "children": []}

    def download(self, *, url: str) -> "Download":
        node: DownloadNode = {"kind": "download", "children": [], "url": url}
        self.node["children"].append(node)
        return Download(node=node, root=self)


class _Base:
    def __init__(self, *, root: Root, node: NodeBase) -> None:
        self.root = root
        self.node = node


class Download(_Base):
    def parse(self, *, format: ParseFormatT, is_binary: bool = False) -> "Parse":
        node: ParseNode = {"kind": "parse", "children": [], "format": format, "is_binary": is_binary}
        self.node["children"].append(node)
        return Parse(node=node, root=self.root)


class Parse(_Base):
    def structure(self, *, assembly_id: str = "1", model_index: int = 1) -> "Structure":
        node: StructureNode = {"kind": "structure", "children": [], "assembly_id": assembly_id,
                               "model_index": model_index}
        self.node["children"].append(node)
        return Structure(node=node, root=self.root)


class Structure(_Base):
    def component(self, *, selector: ComponentSelectorT) -> "Component":
        node: ComponentNode = {"kind": "component", "children": [], "selector": selector}
        self.node["children"].append(node)
        return Component(node=node, root=self.root)


class Component(_Base):
    def representation(self, *, type: RepresentationTypeT = "cartoon", color: ColorT = "red"):
        # TODO should there be terminal nodes without children?
        node: RepresentationNode = {"kind": "representation", "children": [], "type": type, "color": color}
        self.node["children"].append(node)
