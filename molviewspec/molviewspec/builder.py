from molviewspec.nodes import (
    ColorCifCategoryParams,
    ColorParams,
    ColorT,
    ComponentParams,
    ComponentSelectorT,
    DownloadParams,
    LabelCifCategoryParams,
    LabelParams,
    Node,
    ParseFormatT,
    ParseParams,
    RepresentationParams,
    RepresentationTypeT,
    StructureParams,
)


def create_builder() -> "Root":
    return Root()


class Root:
    def __init__(self) -> None:
        self.node = Node(kind="root")

    def download(self, *, url: str) -> "Download":
        node = Node(kind="download", params=DownloadParams(url=url))
        if "children" not in self.node:
            self.node["children"] = []
        self.node["children"].append(node)
        return Download(node=node, root=self)

    # TODO Root inherit from _Base and have special __init__ with `self.root = self`?


class _Base:
    def __init__(self, *, root: Root, node: Node) -> None:
        self.root = root
        self.node = node

    def add_child(self, node: Node) -> None:
        if "children" not in self.node:
            self.node["children"] = []
        self.node["children"].append(node)


class Download(_Base):
    def parse(self, *, format: ParseFormatT, is_binary: bool | None = None) -> "Parse":
        params: ParseParams = {"format": format}
        if is_binary is not None:
            params["is_binary"] = is_binary
        node = Node(kind="parse", params=params)
        self.add_child(node)
        return Parse(node=node, root=self.root)


class Parse(_Base):
    def structure(self, *, assembly_id: str | None = None, model_index: int | None = None) -> "Structure":
        params: StructureParams = {}
        if assembly_id is not None:
            params["assembly_id"] = assembly_id
        if model_index is not None:
            params["model_index"] = model_index
        node = Node(kind="structure", params=params)
        self.add_child(node)
        return Structure(node=node, root=self.root)


class Structure(_Base):
    def component(self, *, selector: ComponentSelectorT = "all") -> "Component":
        params: ComponentParams = {"selector": selector}
        node = Node(kind="component", params=params)
        self.add_child(node)
        return Component(node=node, root=self.root)

    def label(self, *,
              label_entity_id: str | None = None, label_asym_id: str | None = None, label_seq_id: int | None = None,
              auth_asym_id: str | None = None, auth_seq_id: int | None = None, pdbx_pdb_ins_code: str | None = None,
              beg_label_seq_id: int | None = None, end_label_seq_id: int | None = None,
              beg_auth_seq_id: int | None = None, end_auth_seq_id: int | None = None,
              text: str) -> "Structure":
        # TODO at which level of the hierarchy do these make most sense?
        params: LabelParams = {"text": text}
        if label_entity_id is not None:
            params["label_entity_id"] = label_entity_id
        if label_asym_id is not None:
            params["label_asym_id"] = label_asym_id
        if label_seq_id is not None:
            params["label_seq_id"] = label_seq_id
        if auth_asym_id is not None:
            params["auth_asym_id"] = auth_asym_id
        if auth_seq_id is not None:
            params["auth_seq_id"] = auth_seq_id
        if pdbx_pdb_ins_code is not None:
            params["pdbx_PDB_ins_code"] = pdbx_pdb_ins_code
        if beg_label_seq_id is not None:
            params["beg_label_seq_id"] = beg_label_seq_id
        if end_label_seq_id is not None:
            params["end_label_seq_id"] = end_label_seq_id
        if beg_auth_seq_id is not None:
            params["beg_auth_seq_id"] = beg_auth_seq_id
        if end_auth_seq_id is not None:
            params["end_auth_seq_id"] = end_auth_seq_id
        # TODO could validate here against "too few params"
        node = Node(kind="label", params=params)
        self.add_child(node)
        return self

    def label_from_cif(self, *, cif_category_name: str) -> "Structure":
        params: LabelCifCategoryParams = {"category_name": cif_category_name}
        node = Node(kind="label_from_cif", params=params)
        self.add_child(node)
        return self


class Component(_Base):
    def representation(self, *, type: RepresentationTypeT = "cartoon", color: ColorT | None = None) -> "Representation":
        params: RepresentationParams = {"type": type}
        if color is not None:
            params["color"] = color
        node = Node(kind="representation", params=params)
        self.add_child(node)
        return Representation(node=node, root=self.root)


class Representation(_Base):
    def color(self, *,
              label_entity_id: str | None = None, label_asym_id: str | None = None, label_seq_id: int | None = None,
              auth_asym_id: str | None = None, auth_seq_id: int | None = None, pdbx_pdb_ins_code: str | None = None,
              beg_label_seq_id: int | None = None, end_label_seq_id: int | None = None,
              beg_auth_seq_id: int | None = None, end_auth_seq_id: int | None = None,
              color: ColorT, tooltip: str | None = None) -> "Representation":
        params: ColorParams = {"color": color}
        if label_entity_id is not None:
            params["label_entity_id"] = label_entity_id
        if label_asym_id is not None:
            params["label_asym_id"] = label_asym_id
        if label_seq_id is not None:
            params["label_seq_id"] = label_seq_id
        if auth_asym_id is not None:
            params["auth_asym_id"] = auth_asym_id
        if auth_seq_id is not None:
            params["auth_seq_id"] = auth_seq_id
        if pdbx_pdb_ins_code is not None:
            params["pdbx_PDB_ins_code"] = pdbx_pdb_ins_code
        if beg_label_seq_id is not None:
            params["beg_label_seq_id"] = beg_label_seq_id
        if end_label_seq_id is not None:
            params["end_label_seq_id"] = end_label_seq_id
        if beg_auth_seq_id is not None:
            params["beg_auth_seq_id"] = beg_auth_seq_id
        if end_auth_seq_id is not None:
            params["end_auth_seq_id"] = end_auth_seq_id
        if tooltip is not None:
            params["tooltip"] = tooltip
        node = Node(kind="color", params=params)
        self.add_child(node)
        return self

    def color_from_cif(self, *, cif_category_name: str) -> "Representation":
        params: ColorCifCategoryParams = {"category_name": cif_category_name}
        node = Node(kind="color-from-cif", params=params)
        self.add_child(node)
        return self
