from __future__ import annotations

import json
import math
from typing import Sequence

from molviewspec.nodes import (
    CameraParams,
    CanvasParams,
    ColorFromSourceParams,
    ColorFromUriParams,
    ColorInlineParams,
    ColorT,
    ComponentExpression,
    ComponentFromSourceParams,
    ComponentFromUriParams,
    ComponentInlineParams,
    ComponentSelectorT,
    DownloadParams,
    FocusInlineParams,
    LabelFromSourceParams,
    LabelFromUriParams,
    LabelInlineParams,
    LineParams,
    Node,
    ParseFormatT,
    ParseParams,
    RepresentationParams,
    RepresentationTypeT,
    SchemaFormatT,
    SchemaT,
    SphereParams,
    State,
    StructureParams,
    TooltipFromSourceParams,
    TooltipFromUriParams,
    TooltipInlineParams,
    TransformParams,
)
from molviewspec.params_utils import make_params

VERSION = 6


def create_builder() -> Root:
    return Root()


class _Base:
    _root: Root
    _node: Node

    def __init__(self, *, root: Root, node: Node) -> None:
        self._root = root
        self._node = node

    def _add_child(self, node: Node) -> None:
        if "children" not in self._node:
            self._node["children"] = []
        self._node["children"].append(node)


class Root(_Base):
    def __init__(self) -> None:
        super().__init__(root=self, node=Node(kind="root"))

    def get_state(self) -> State:
        return State(version=VERSION, root=self._node)

    def save_state(self, *, destination: str):
        state = self.get_state()
        with open(destination, "w") as out:
            out.write(json.dumps(state, indent=2))

    def camera(
        self,
        *,
        target: tuple[float, float, float],
        position: tuple[float, float, float],
        up: tuple[float, float, float] | None = None,
    ):
        params = make_params(CameraParams, locals())
        if up is None:
            params["up"] = (0, 1, 0)
        node = Node(kind="camera", params=params)
        self._add_child(node)
        return self

    def canvas(self, *, background_color: ColorT | None = None) -> Root:
        params = make_params(CanvasParams, locals())
        node = Node(kind="canvas", params=params)
        self._add_child(node)
        return self

    def download(self, *, url: str) -> Download:
        node = Node(kind="download", params=DownloadParams(url=url))
        self._add_child(node)
        return Download(node=node, root=self._root)

    def generic_visuals(self) -> GenericVisuals:
        node = Node(kind="generic_visuals")
        self._add_child(node)
        return GenericVisuals(node=node, root=self._root)


class Download(_Base):
    # TODO defaults in signature makes them more obvious to users but this can't accommodate more complex cases
    def parse(self, *, format: ParseFormatT) -> Parse:
        params = make_params(ParseParams, locals())
        node = Node(kind="parse", params=params)
        self._add_child(node)
        return Parse(node=node, root=self._root)


class Parse(_Base):
    def model_structure(
        self,
        *,
        model_index: int | None = None,  # TODO default candidate
        block_index: int | None = None,  # TODO default candidate
        block_header: str | None = None,
    ) -> Structure:
        """
        Create a structure for the deposited coordinates.
        :param model_index: 0-based model index in case multiple NMR frames are present
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present
        :param block_header: Reference a specific mmCIF or SDF data block by its block header
        """
        params = make_params(StructureParams, locals(), kind="model")
        node = Node(kind="structure", params=params)
        self._add_child(node)
        return Structure(node=node, root=self._root)

    def assembly_structure(
        self,
        *,
        assembly_id: str | None = None,
        assembly_index: int | None = None,
        model_index: int | None = None,
        block_index: int | None = None,
        block_header: str | None = None,
    ) -> Structure:
        """
        Create an assembly structure.
        :param assembly_id: Use the name to specify which assembly to load
        :param assembly_index: 0-based assembly index, use this to load the 1st assembly
        :param model_index: 0-based model index in case multiple NMR frames are present
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present
        :param block_header: Reference a specific mmCIF or SDF data block by its block header
        """
        if assembly_id is None and assembly_index is None:
            assembly_index = 0
        params = make_params(StructureParams, locals(), kind="assembly")
        node = Node(kind="structure", params=params)
        self._add_child(node)
        return Structure(node=node, root=self._root)

    def symmetry_structure(
        self,
        *,
        ijk_min: tuple[int, int, int] | None = None,
        ijk_max: tuple[int, int, int] | None = None,
        block_index: int | None = None,
        block_header: str | None = None,
    ) -> Structure:
        """
        Create symmetry structure for a given range of Miller indices.
        :param ijk_min: Bottom-left Miller indices
        :param ijk_max: Top-right Miller indices
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present
        :param block_header: Reference a specific mmCIF or SDF data block by its block header
        """
        params = make_params(StructureParams, locals(), kind="symmetry")
        if ijk_min is None:
            params["ijk_min"] = (-1, -1, -1)
        if ijk_max is None:
            params["ijk_max"] = (1, 1, 1)
        node = Node(kind="structure", params=params)
        self._add_child(node)
        return Structure(node=node, root=self._root)

    def symmetry_mates_structure(
        self,
        *,
        radius: float | None = None,
        block_index: int | None = None,
        block_header: str | None = None,
    ) -> Structure:
        """
        Create structure of symmetry mates.
        :param radius: Radius of symmetry partners to include
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present
        :param block_header: Reference a specific mmCIF or SDF data block by its block header
        """
        params = make_params(StructureParams, locals(), kind="symmetry_mates")
        if radius is None:
            params["radius"] = 5.0
        node = Node(kind="structure", params=params)
        self._add_child(node)
        return Structure(node=node, root=self._root)


class Structure(_Base):
    def component(
        self, *, selector: ComponentSelectorT | ComponentExpression | list[ComponentExpression] = "all"
    ) -> Component:
        params: ComponentInlineParams = {"selector": selector}
        node = Node(kind="component", params=params)
        self._add_child(node)
        return Component(node=node, root=self._root)

    def component_from_uri(
        self,
        *,
        uri: str,
        format: SchemaFormatT,
        category_name: str | None = None,
        field_name: str | None = None,
        block_header: str | None = None,
        block_index: int | None = None,
        schema: SchemaT,
        field_values: str | list[str] | None = None,
    ) -> Component:
        if isinstance(field_values, str):
            field_values = [field_values]
        params = make_params(ComponentFromUriParams, locals())
        node = Node(kind="component_from_uri", params=params)
        self._add_child(node)
        return Component(node=node, root=self._root)

    def component_from_source(
        self,
        *,
        category_name: str,
        field_name: str | None = None,
        block_header: str | None = None,
        block_index: int | None = None,
        schema: SchemaT,
        field_values: str | list[str] | None = None,
    ) -> Component:
        if isinstance(field_values, str):
            field_values = [field_values]
        params = make_params(ComponentFromSourceParams, locals())
        node = Node(kind="component_from_source", params=params)
        self._add_child(node)
        return Component(node=node, root=self._root)

    def label_from_uri(
        self,
        *,
        uri: str,
        format: SchemaFormatT,
        category_name: str | None = None,
        field_name: str | None = None,
        block_header: str | None = None,
        block_index: int | None = None,
        schema: SchemaT,
    ) -> Structure:
        params = make_params(LabelFromUriParams, locals())
        node = Node(kind="label_from_uri", params=params)
        self._add_child(node)
        return self

    def label_from_source(
        self,
        *,
        category_name: str,
        field_name: str | None = None,
        block_header: str | None = None,
        block_index: int | None = None,
        schema: SchemaT,
    ) -> Structure:
        params = make_params(LabelFromSourceParams, locals())
        node = Node(kind="label_from_source", params=params)
        self._add_child(node)
        return self

    def tooltip_from_uri(
        self,
        *,
        uri: str,
        format: SchemaFormatT,
        category_name: str | None = None,
        field_name: str | None = None,
        block_header: str | None = None,
        block_index: int | None = None,
        schema: SchemaT,
    ) -> Structure:
        params = make_params(TooltipFromUriParams, locals())
        node = Node(kind="tooltip_from_uri", params=params)
        self._add_child(node)
        return self

    def tooltip_from_source(
        self,
        *,
        category_name: str,
        field_name: str | None = None,
        block_header: str | None = None,
        block_index: int | None = None,
        schema: SchemaT,
    ) -> Structure:
        params = make_params(TooltipFromSourceParams, locals())
        node = Node(kind="tooltip_from_source", params=params)
        self._add_child(node)
        return self

    def transform(
        self,
        *,
        rotation: Sequence[float] | None = None,
        translation: Sequence[float] | None = None,
    ) -> Structure:
        if rotation is not None:
            rotation = tuple(rotation)
            if len(rotation) != 9:
                raise ValueError(f"Parameter `rotation` must have length 9")
            if not self._is_rotation_matrix(rotation):
                raise ValueError(f"Parameter `rotation` must be a rotation matrix")
        if translation is not None:
            translation = tuple(translation)
            if len(translation) != 3:
                raise ValueError(f"Parameter `translation` must have length 3")

        params = make_params(TransformParams, locals())
        node = Node(kind="transform", params=params)
        self._add_child(node)
        return self

    # TODO factor out as general purpose validation?
    @staticmethod
    def _is_rotation_matrix(t: Sequence[float], eps: float = 0.005):
        a00, a01, a02, a10, a11, a12, a20, a21, a22 = t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], t[8]

        det3x3 = math.fabs(
            a00 * (a11 * a22 - a12 * a21) - a01 * (a10 * a22 - a12 * a20) + a02 * (a10 * a21 - a11 * a20)
        )
        return math.isclose(det3x3, 1, abs_tol=eps)


class Component(_Base):
    def representation(self, *, type: RepresentationTypeT = "cartoon") -> Representation:
        params = make_params(RepresentationParams, locals())
        node = Node(kind="representation", params=params)
        self._add_child(node)
        return Representation(node=node, root=self._root)

    def label(self, *, text: str) -> Component:
        params = make_params(LabelInlineParams, locals())
        node = Node(kind="label", params=params)
        self._add_child(node)
        return self

    def tooltip(self, *, text: str) -> Component:
        params = make_params(TooltipInlineParams, locals())
        node = Node(kind="tooltip", params=params)
        self._add_child(node)
        return self

    def focus(
        self, *, direction: tuple[float, float, float] | None = None, up: tuple[float, float, float] | None = None
    ) -> Component:
        """
        Focus on this structure or component.
        :return: this builder
        """
        params = make_params(FocusInlineParams, locals())
        node = Node(kind="focus", params=params)
        self._add_child(node)
        return self


class Representation(_Base):
    def color_from_source(
        self,
        *,
        schema: SchemaT,
        category_name: str,
        field_name: str | None = None,
        block_header: str | None = None,
        block_index: int | None = None,
    ) -> Representation:
        params = make_params(ColorFromSourceParams, locals())
        node = Node(kind="color_from_source", params=params)
        self._add_child(node)
        return self

    def color_from_uri(
        self,
        *,
        schema: SchemaT,
        uri: str,
        format: str,
        category_name: str | None = None,
        field_name: str | None = None,
        block_header: str | None = None,
        block_index: int | None = None,
    ) -> Representation:
        params = make_params(ColorFromUriParams, locals())
        node = Node(kind="color_from_uri", params=params)
        self._add_child(node)
        return self

    def color(
        self, *, color: ColorT, selector: ComponentSelectorT | ComponentExpression | list[ComponentExpression] = "all"
    ) -> Representation:
        params = make_params(ColorInlineParams, locals())
        node = Node(kind="color", params=params)
        self._add_child(node)
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
    ) -> GenericVisuals:
        params = make_params(SphereParams, locals())
        node = Node(kind="sphere", params=params)
        self._add_child(node)
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
    ) -> GenericVisuals:
        params = make_params(LineParams, locals())
        node = Node(kind="line", params=params)
        self._add_child(node)
        return self
