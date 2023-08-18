from typing import TypeVar

from molviewspec.nodes import (
    CameraParams,
    CanvasParams,
    ColorCifCategoryParams,
    ColorInlineParams,
    ColorJsonParams,
    ColorT,
    ColorUrlParams,
    ComponentParams,
    ComponentSelectorT,
    DownloadParams,
    FocusInlineParams,
    LabelCifCategoryParams,
    LabelInlineParams,
    LabelJsonParams,
    LabelUrlParams,
    LineParams,
    Node,
    ParseFormatT,
    ParseParams,
    RepresentationParams,
    RepresentationTypeT,
    SchemaT,
    SphereParams,
    State,
    StructureParams,
    TransformParams,
)


def create_builder() -> "Root":
    return Root()


def _assign_params(params: dict, type: TypeVar, lcs: dict):
    for k in type.__annotations__.keys():
        if k in lcs and lcs.get(k) is not None:
            params[k] = lcs.get(k)


class Root:
    def __init__(self) -> None:
        self.node = Node(kind="root")

    def get_state(self) -> State:
        return State(version=3, root=self.node)

    def camera(
        self,
        *,
        position: tuple[float, float, float] | None,
        direction: tuple[float, float, float] | None,
        radius: float | None,
    ):
        lcs = locals()
        params: CameraParams = {}
        _assign_params(params, CameraParams, lcs)
        node = Node(kind="camera", params=params)
        if "children" not in self.node:
            self.node["children"] = []
        self.node["children"].append(node)
        return self

    def canvas(self, *, background_color: ColorT | None = None) -> "Root":
        lcs = locals()
        params: CanvasParams = {}
        _assign_params(params, CanvasParams, lcs)
        node = Node(kind="canvas", params=params)
        if "children" not in self.node:
            self.node["children"] = []
        self.node["children"].append(node)
        return self

    def download(self, *, url: str) -> "Download":
        node = Node(kind="download", params=DownloadParams(url=url))
        if "children" not in self.node:
            self.node["children"] = []
        self.node["children"].append(node)
        return Download(node=node, root=self)

    def generic_visuals(self) -> "GenericVisuals":
        node = Node(kind="generic-visuals")
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
    # TODO defaults in signature makes them more obvious to users but this can't accommodate more complex cases
    def parse(self, *, format: ParseFormatT) -> "Parse":
        lcs = locals()
        params: ParseParams = {}
        _assign_params(params, ParseParams, lcs)
        node = Node(kind="parse", params=params)
        self.add_child(node)
        return Parse(node=node, root=self.root)


class Parse(_Base):
    def model_structure(
        self,
        *,
        model_index: int | None = None,  # TODO default candidate
        block_index: int | None = None,  # TODO default candidate
        block_header: str | None = None,
    ) -> "Structure":
        """
        Create a structure for the deposited coordinates.
        :param model_index: 0-based model index in case multiple NMR frames are present
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present
        :param block_header: Reference a specific mmCIF or SDF data block by its block header
        """
        lcs = locals()
        params: StructureParams = {"kind": "model"}
        _assign_params(params, StructureParams, lcs)
        node = Node(kind="structure", params=params)
        self.add_child(node)
        return Structure(node=node, root=self.root)

    def assembly_structure(
        self,
        *,
        assembly_id: str | None = None,
        assembly_index: int | None = None,
        model_index: int | None = None,
        block_index: int | None = None,
        block_header: str | None = None,
    ) -> "Structure":
        """
        Create an assembly structure.
        :param assembly_id: Use the name to specify which assembly to load
        :param assembly_index: 0-based assembly index, use this to load the 1st assembly
        :param model_index: 0-based model index in case multiple NMR frames are present
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present
        :param block_header: Reference a specific mmCIF or SDF data block by its block header
        """
        lcs = locals()
        params: StructureParams = {"kind": "assembly"}
        _assign_params(params, StructureParams, lcs)
        if assembly_id is None and assembly_index is None:
            params["assembly_index"] = 0
        node = Node(kind="structure", params=params)
        self.add_child(node)
        return Structure(node=node, root=self.root)

    def symmetry_structure(
        self,
        *,
        ijk_min: tuple[int, int, int] | None = None,
        ijk_max: tuple[int, int, int] | None = None,
        block_index: int | None = None,
        block_header: str | None = None,
    ) -> "Structure":
        """
        Create symmetry structure for a given range of Miller indices.
        :param ijk_min: Bottom-left Miller indices
        :param ijk_max: Top-right Miller indices
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present
        :param block_header: Reference a specific mmCIF or SDF data block by its block header
        """
        lcs = locals()
        params: StructureParams = {"kind": "symmetry"}
        _assign_params(params, StructureParams, lcs)
        if ijk_min is None:
            params["ijk_min"] = [-1, -1, -1]
        if ijk_max is None:
            params["ijk_max"] = [1, 1, 1]
        node = Node(kind="structure", params=params)
        self.add_child(node)
        return Structure(node=node, root=self.root)

    def symmetry_mate_structure(
        self,
        *,
        radius: float | None = None,
        block_index: int | None = None,
        block_header: str | None = None,
    ) -> "Structure":
        """
        Create structure of symmetry mates.
        :param radius: Radius of symmetry partners to include
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present
        :param block_header: Reference a specific mmCIF or SDF data block by its block header
        """
        lcs = locals()
        params: StructureParams = {"kind": "symmetry-mates"}
        _assign_params(params, StructureParams, lcs)
        if radius is None:
            params["radius"] = 5.0
        node = Node(kind="structure", params=params)
        self.add_child(node)
        return Structure(node=node, root=self.root)


class Structure(_Base):
    def component(self, *, selector: ComponentSelectorT = "all") -> "Component":
        params: ComponentParams = {"selector": selector}
        node = Node(kind="component", params=params)
        self.add_child(node)
        return Component(node=node, root=self.root)

    def label_from_cif(self, *, schema: SchemaT, category_name: str) -> "Structure":
        lcs = locals()
        params: LabelCifCategoryParams = {}
        _assign_params(params, LabelCifCategoryParams, lcs)
        node = Node(kind="label-from-cif", params=params)
        self.add_child(node)
        return self

    def label_from_url(self, *, schema: SchemaT, url: str, format: str) -> "Structure":
        lcs = locals()
        params: LabelUrlParams = {}
        _assign_params(params, LabelUrlParams, lcs)
        node = Node(kind="label-from-url", params=params)
        self.add_child(node)
        return self

    def label_from_json(self, *, schema: SchemaT, json: str) -> "Structure":
        lcs = locals()
        params: LabelJsonParams = {}
        _assign_params(params, LabelJsonParams, lcs)
        node = Node(kind="label-from-json", params=params)
        self.add_child(node)
        return self

    def label(
        self,
        *,
        schema: SchemaT,
        label_entity_id: str | None = None,
        label_asym_id: str | None = None,
        auth_asym_id: str | None = None,
        label_seq_id: int | None = None,
        auth_seq_id: int | None = None,
        pdbx_PDB_ins_code: str | None = None,
        beg_label_seq_id: int | None = None,
        end_label_seq_id: int | None = None,
        beg_auth_seq_id: int | None = None,
        end_auth_seq_id: int | None = None,
        residue_index: int | None = None,
        atom_id: int | None = None,
        atom_index: int | None = None,
        text: str,
    ) -> "Structure":
        # TODO at which level of the hierarchy do these make most sense?
        lcs = locals()
        params: LabelInlineParams = {}
        _assign_params(params, LabelInlineParams, lcs)
        node = Node(kind="label-from-inline", params=params)
        self.add_child(node)
        return self

    def focus(
        self,
        *,
        schema: SchemaT,
        label_entity_id: str | None = None,
        label_asym_id: str | None = None,
        auth_asym_id: str | None = None,
        label_seq_id: int | None = None,
        auth_seq_id: int | None = None,
        pdbx_PDB_ins_code: str | None = None,
        beg_label_seq_id: int | None = None,
        end_label_seq_id: int | None = None,
        beg_auth_seq_id: int | None = None,
        end_auth_seq_id: int | None = None,
        residue_index: int | None = None,
        atom_id: int | None = None,
        atom_index: int | None = None,
    ) -> "Structure":
        """
        Focus on a particular selection.
        :param schema: what is addressed? entities, chains, residues, atoms, ...
        :return: this builder
        """
        # TODO other focus flavors based on CIF/JSON?
        lcs = locals()
        params: FocusInlineParams = {}
        _assign_params(params, FocusInlineParams, lcs)
        node = Node(kind="focus-from-inline", params=params)
        self.add_child(node)
        return self

    def transform(
        self,
        *,
        transformation: tuple[
            float,
            float,
            float,
            float,
            float,
            float,
            float,
            float,
            float,
            float,
            float,
            float,
            float,
            float,
            float,
            float,
        ],
        rotation: tuple[float, float, float, float, float, float, float, float, float],
        translation: tuple[float, float, float],
    ) -> "Structure":
        lcs = locals()
        params: TransformParams = {}
        _assign_params(params, TransformParams, lcs)
        node = Node(kind="transform", params=params)
        self.add_child(node)
        return self


class Component(_Base):
    def representation(self, *, type: RepresentationTypeT = "cartoon", color: ColorT | None = None) -> "Representation":
        lcs = locals()
        params: RepresentationParams = {}
        _assign_params(params, RepresentationParams, lcs)
        node = Node(kind="representation", params=params)
        self.add_child(node)
        return Representation(node=node, root=self.root)


class Representation(_Base):
    def color_from_cif(self, *, schema: SchemaT, category_name: str) -> "Representation":
        lcs = locals()
        params: ColorCifCategoryParams = {}
        _assign_params(params, ColorCifCategoryParams, lcs)
        node = Node(kind="color-from-cif", params=params)
        self.add_child(node)
        return self

    def color_from_url(self, *, schema: SchemaT, url: str, format: str) -> "Representation":
        lcs = locals()
        params: ColorUrlParams = {}
        _assign_params(params, ColorUrlParams, lcs)
        node = Node(kind="color-from-url", params=params)
        self.add_child(node)
        return self

    def color_from_json(self, *, schema: SchemaT, json: str) -> "Representation":
        lcs = locals()
        params: ColorJsonParams = {}
        _assign_params(params, ColorJsonParams, lcs)
        node = Node(kind="color-from-json", params=params)
        self.add_child(node)
        return self

    def color(
        self,
        *,
        schema: SchemaT,
        label_entity_id: str | None = None,
        label_asym_id: str | None = None,
        auth_asym_id: str | None = None,
        label_seq_id: int | None = None,
        auth_seq_id: int | None = None,
        pdbx_PDB_ins_code: str | None = None,
        beg_label_seq_id: int | None = None,
        end_label_seq_id: int | None = None,
        beg_auth_seq_id: int | None = None,
        end_auth_seq_id: int | None = None,
        residue_index: int | None = None,
        atom_id: int | None = None,
        atom_index: int | None = None,
        color: ColorT,
        tooltip: str | None = None,
    ) -> "Representation":
        lcs = locals()
        params: ColorInlineParams = {}
        _assign_params(params, ColorInlineParams, lcs)
        node = Node(kind="color-from-inline", params=params)
        self.add_child(node)
        return self


class GenericVisuals(_Base):
    def sphere(
        self,
        *,
        position: tuple[float, float, float],
        radius: float,
        color: ColorT,
        label: str | None = None,
        tooltip: str | None = None,
    ) -> "GenericVisuals":
        lcs = locals()
        params: SphereParams = {}
        _assign_params(params, SphereParams, lcs)
        node = Node(kind="sphere", params=params)
        self.add_child(node)
        return self

    def line(
        self,
        *,
        position1: tuple[float, float, float],
        position2: tuple[float, float, float],
        radius: float,
        color: ColorT,
        label: str | None = None,
        tooltip: str | None = None,
    ) -> "GenericVisuals":
        lcs = locals()
        params: LineParams = {}
        _assign_params(params, LineParams, lcs)
        node = Node(kind="line", params=params)
        self.add_child(node)
        return self
