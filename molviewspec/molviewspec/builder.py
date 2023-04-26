from molviewspec.nodes import (
    ColorCifCategoryNode,
    ColorNode,
    ColorT,
    ComponentNode,
    ComponentSelectorT,
    DownloadNode,
    LabelCifCategoryNode,
    LabelNode,
    NodeBase,
    ParseFormatT,
    ParseNode,
    RepresentationNode,
    RepresentationTypeT,
    StructureNode,
)


def create_builder() -> "Root":
    return Root()


class Root:
    def __init__(self) -> None:
        self.node = {"kind": "root", "children": []}

    def download(self, *, url: str) -> "Download":
        node: DownloadNode = {"kind": "download", "url": url, "children": []}
        self.node["children"].append(node)
        return Download(node=node, root=self)


class _Base:
    def __init__(self, *, root: Root, node: NodeBase) -> None:
        self.root = root
        self.node = node


class Download(_Base):
    def parse(self, *, format: ParseFormatT, is_binary: bool = None) -> "Parse":
        node: ParseNode = {"kind": "parse", "format": format, "children": []}
        if is_binary is not None:
            node["is_binary"] = is_binary
        self.node["children"].append(node)
        return Parse(node=node, root=self.root)


class Parse(_Base):
    def structure(self, *, assembly_id: str = None, model_index: int = None) -> "Structure":
        node: StructureNode = {"kind": "structure", "children": []}
        if assembly_id is not None:
            node["assembly_id"] = assembly_id
        if model_index is not None:
            node["model_index"] = model_index
        self.node["children"].append(node)
        return Structure(node=node, root=self.root)


class Structure(_Base):
    def component(self, *, selector: ComponentSelectorT = "all") -> "Component":
        node: ComponentNode = {"kind": "component", "selector": selector, "children": []}
        self.node["children"].append(node)
        return Component(node=node, root=self.root)

    def label(self, *, label_asym_id: str, label_seq_id: int, text: str):
        # TODO at which level of the hierarchy do these make most sense?
        node: LabelNode = {"kind": "label", "label_asym_id": label_asym_id, "label_seq_id": label_seq_id, "text": text}
        self.node["children"].append(node)
        return self

    def label_from_cif(self, *, cif_category_name: str):
        node: LabelCifCategoryNode = {"kind": "label-from-cif", "category_name": cif_category_name}
        self.node["children"].append(node)
        return self


class Component(_Base):
    def representation(self, *, type: RepresentationTypeT = "cartoon", color: ColorT = None) -> "Representation":
        node: RepresentationNode = {"kind": "representation", "type": type, "children": []}
        if color is not None:
            node["color"] = color
        self.node["children"].append(node)
        return Representation(node=node, root=self.root)


class Representation(_Base):
    def color(self, *, label_asym_id: str, label_seq_id: int, color: ColorT):
        node: ColorNode = {
            "kind": "color",
            "label_asym_id": label_asym_id,
            "label_seq_id": label_seq_id,
            "color": color
        }
        self.node["children"].append(node)
        return self

    def color_from_cif(self, *, cif_category_name: str):
        node: ColorCifCategoryNode = {"kind": "color-from-cif", "category_name": cif_category_name}
        self.node["children"].append(node)
        return self
