from molviewspec.nodes import DownloadNode, NodeBase, ParseFormatT, ParseNode, RootNode


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
    def parse(self, *, format: ParseFormatT) -> "Parse":
        node: ParseNode = {"kind": "parse", "children": [], "format": format}
        self.node["children"].append(node)
        return Parse(node=node, root=self.root)


class Parse(_Base):
    def structure(self, *, kind) -> "Structure":
        raise NotImplementedError()


class Structure(_Base):
    pass
