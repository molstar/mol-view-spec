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
from typing import TypeVar


def create_builder() -> "Root":
    return Root()


def _assign_params(params: dict, type: TypeVar, lcs: dict):
    for k in type.__annotations__.keys():
        if k in lcs and lcs.get(k) is not None:
            params[k] = lcs.get(k)


class Root:
    def __init__(self) -> None:
        self.node = Node(kind="root")

    def download(self, *, url: str) -> "Download":
        node = Node(kind="download", params=DownloadParams(url=url))
        if "children" not in self.node:
            self.node["children"] = []
        self.node["children"].append(node)
        return Download(node=node, root=self)

    # TODO Root inherit from _Base and have special __init__ with `self.root = self`? (to be able to use `add_child` in `download`)


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
        lcs = locals()
        params: ParseParams = {}
        _assign_params(params, ParseParams, lcs)
        node = Node(kind="parse", params=params)
        self.add_child(node)
        return Parse(node=node, root=self.root)


class Parse(_Base):
    def model_structure(
        self, *, model_index: int | None = None, block_index: int | None = None, block_header: str | None = None,
    ) -> "Structure":
        lcs = locals()
        params: StructureParams = {"kind": "model"}
        _assign_params(params, StructureParams, lcs)
        node = Node(kind="structure", params=params)
        self.add_child(node)
        return Structure(node=node, root=self.root)

    def assembly_structure(
        # TODO made this optional again, where do we draw the line between
        self, *, assembly_id: str | None = None, block_index: int | None = None, block_header: str | None = None,
    ) -> "Structure":
        lcs = locals()
        params: StructureParams = {"kind": "assembly"}
        _assign_params(params, StructureParams, lcs)
        node = Node(kind="structure", params=params)
        self.add_child(node)
        return Structure(node=node, root=self.root)

    def symmetry_mate_structure(
            # TODO symmetry by index? unit cell?
            # TODO is radius too Mol* specific, how do other viewers do this?
            self, *, radius: float | None = None, block_index: int | None = None, block_header: str | None = None,
    ) -> "Structure":
        lcs = locals()
        params: StructureParams = {"kind": "symmetry-mates"}
        _assign_params(params, StructureParams, lcs)
        node = Node(kind="structure", params=params)
        self.add_child(node)
        return Structure(node=node, root=self.root)


class Structure(_Base):
    def component(self, *, selector: ComponentSelectorT = "all") -> "Component":
        params: ComponentParams = {"selector": selector}
        node = Node(kind="component", params=params)
        self.add_child(node)
        return Component(node=node, root=self.root)

    def label(
        self,
        *,
        label_entity_id: str | None = None,
        label_asym_id: str | None = None,
        label_seq_id: int | None = None,
        auth_asym_id: str | None = None,
        auth_seq_id: int | None = None,
        pdbx_PDB_ins_code: str | None = None,
        beg_label_seq_id: int | None = None,
        end_label_seq_id: int | None = None,
        beg_auth_seq_id: int | None = None,
        end_auth_seq_id: int | None = None,
        text: str
    ) -> "Structure":
        # TODO at which level of the hierarchy do these make most sense?
        lcs = locals()
        params: LabelParams = {}
        _assign_params(params, LabelParams, lcs)
        # TODO could validate here against "too few params"
        node = Node(kind="label", params=params)
        self.add_child(node)
        return self

    def label_from_cif(self, *, category_name: str) -> "Structure":
        lcs = locals()
        params: LabelCifCategoryParams = {}
        _assign_params(params, LabelCifCategoryParams, lcs)
        node = Node(kind="label-from-cif", params=params)
        self.add_child(node)
        return self


class Component(_Base):
    def representation(
        self, *, type: RepresentationTypeT = "cartoon", color: ColorT | None = None
    ) -> "Representation":
        lcs = locals()
        params: RepresentationParams = {}
        _assign_params(params, RepresentationParams, lcs)
        node = Node(kind="representation", params=params)
        self.add_child(node)
        return Representation(node=node, root=self.root)


class Representation(_Base):
    def color(
        self,
        *,
        label_entity_id: str | None = None,
        label_asym_id: str | None = None,
        label_seq_id: int | None = None,
        auth_asym_id: str | None = None,
        auth_seq_id: int | None = None,
        pdbx_PDB_ins_code: str | None = None,
        beg_label_seq_id: int | None = None,
        end_label_seq_id: int | None = None,
        beg_auth_seq_id: int | None = None,
        end_auth_seq_id: int | None = None,
        color: ColorT,
        tooltip: str | None = None
    ) -> "Representation":
        lcs = locals()
        params: ColorParams = {}
        _assign_params(params, ColorParams, lcs)
        node = Node(kind="color", params=params)
        self.add_child(node)
        return self

    def color_from_cif(self, *, category_name: str) -> "Representation":
        lcs = locals()
        params: ColorCifCategoryParams = {}
        _assign_params(params, ColorCifCategoryParams, lcs)
        node = Node(kind="color-from-cif", params=params)
        self.add_child(node)
        return self
