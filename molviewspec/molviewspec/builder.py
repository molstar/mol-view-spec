"""
Use this builder to navigate the creating of MolViewSpec files. Chain operations together as needed and invoke
`get_state` or `save_state` to export the corresponding JSON needed to recreate that scene.
"""

from __future__ import annotations

import math
import os
from abc import ABC, abstractmethod
from typing import Literal, Self, Sequence

from pydantic import BaseModel, PrivateAttr

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
    CustomT,
    DescriptionFormatT,
    DistanceMeasurementParams,
    DownloadParams,
    FocusInlineParams,
    GlobalMetadata,
    LabelFromSourceParams,
    LabelFromUriParams,
    LabelInlineParams,
    LinesParams,
    Mat4,
    MeshParams,
    Node,
    OpacityInlineParams,
    ParseFormatT,
    ParseParams,
    PrimitiveLabelParams,
    PrimitivePositionT,
    PrimitivesFromUriParams,
    PrimitivesParams,
    RefT,
    RepresentationParams,
    RepresentationTypeT,
    SchemaFormatT,
    SchemaT,
    Snapshot,
    SnapshotMetadata,
    State,
    StructureParams,
    TooltipFromSourceParams,
    TooltipFromUriParams,
    TooltipInlineParams,
    TransformParams,
    TubeParams,
    Vec3,
)
from molviewspec.utils import make_params


def create_builder() -> Root:
    """
    Entry point, which instantiates a new builder instance.
    :return: a new builder instance
    """
    return Root()


class _BuilderProtocol(ABC):
    """
    Interface for `_Base` for correctly typing mixins.
    """

    @property
    @abstractmethod
    def _root(self) -> Root:
        ...

    @property
    @abstractmethod
    def _node(self) -> Node:
        ...

    @abstractmethod
    def _add_child(self, node: Node) -> None:
        ...


class _Base(BaseModel, _BuilderProtocol):
    """
    Internal base node from which all other builder nodes are derived.
    """

    _root: Root = PrivateAttr()
    _node: Node = PrivateAttr()

    def __init__(self, *, root: Root, node: Node) -> None:
        super().__init__()
        self._root = root
        self._node = node

    def _add_child(self, node: Node) -> None:
        """
        Register a child node.
        :param node: obj to add
        """
        if self._node.children is None:
            self._node.children = []
        self._node.children.append(node)


class _PrimitivesMixin(_BuilderProtocol):
    def primitives(
        self,
        *,
        color: ColorT | None = None,
        label_color: ColorT | None = None,
        tooltip: str | None = None,
        opacity: float | None = None,
        label_opacity: float | None = None,
        instances: list[Mat4[float]] | None = None,
    ) -> Primitives:
        """
        Allows the definition of a (group of) geometric primitives. You can add any number of primitives and then assign
        shared options (color, opacity etc.).
        :param color: default color
        :param label_color: default label color
        :param tooltip: default tooltip
        :param opacity: default primitive opacity
        :param label_opacity: default label opacity
        :param instances: instances of this primitive group defined as 4x4 column major (j * 4 + i indexing) transformation matrices
        :return: a builder for geometric primitives
        """
        params = make_params(PrimitivesParams, locals())
        node = Node(kind="primitives", params=params)
        self._add_child(node)
        return Primitives(node=node, root=self._root)

    def primitives_from_uri(
        self,
        *,
        uri: str,
        format: Literal["mvs-node-json"] = "mvs-node-json",
        references: list[str] | None = None,
    ) -> PrimitivesFromUri:
        """
        Allows the definition of a (group of) geometric primitives provided dynamically.
        :param uri: location of the resource
        :param format: format of the data
        :param references: optional list of nodes the referenced by the dat
        :return: current builder node
        """
        params = make_params(PrimitivesFromUriParams, locals())
        node = Node(kind="primitives_from_uri", params=params)
        self._add_child(node)
        return PrimitivesFromUri(node=node, root=self._root)


class _FocusMixin(_BuilderProtocol):
    def focus(
        self,
        *,
        direction: Vec3[float] | None = None,
        up: Vec3[float] | None = None,
        radius: float | None = None,
        radius_factor: float | None = None,
        radius_extent: float | None = None,
    ) -> Self:
        """
        Focus on this structure or component.
        :param direction: the direction from which to look at this component
        :param up: where is up relative to the view direction
        :param radius: radius of the focused sphere (overrides `radius_factor` and `radius_extra`)
        :param radius_factor: radius of the focused sphere relative to the radius of parent component (default: 1); focused radius = component_radius * radius_factor + radius_extent
        :param radius_extent: addition to the radius of the focused sphere, if computed from the radius of parent component (default: 0); focused radius = component_radius * radius_factor + radius_extent
        :return: this builder
        """
        params = make_params(FocusInlineParams, locals())
        node = Node(kind="focus", params=params)
        self._add_child(node)
        return self


class Root(_Base, _PrimitivesMixin, _FocusMixin):
    """
    The builder for MolViewSpec state descriptions. Provides fine-grained options as well as global properties such as
    canvas color or camera position and functionality to eventually export this scene.
    """

    def __init__(self) -> None:
        super().__init__(root=self, node=Node(kind="root"))

    def get_node(self) -> Node:
        return self._node

    def get_snapshot(
        self,
        *,
        title: str | None = None,
        description: str | None = None,
        description_format: DescriptionFormatT | None = None,
        key: str | None = None,
        linger_duration_ms: int = 1000,
        transition_duration_ms: int | None = None,
    ) -> Snapshot:
        """
        Return a snapshot of the current state, which can be used to build multi-state views.
        :param title: optional title of the scene
        :param description: optional detailed description of the scene
        :param description_format: format of the description
        :return: object holding snapshot state tree and metadata
        """
        metadata = SnapshotMetadata(
            title=title,
            description=description,
            description_format=description_format,
            key=key,
            linger_duration_ms=linger_duration_ms,
            transition_duration_ms=transition_duration_ms,
        )
        return Snapshot(root=self._node, metadata=metadata)  # TODO create deep copy of node

    def get_state(
        self,
        *,
        title: str | None = None,
        description: str | None = None,
        description_format: DescriptionFormatT | None = None,
        indent: int | None = 2,
    ) -> str:
        """
        Return single-state MVSJ representation (JSON) of the current state. Can be enriched with metadata.
        :param title: optional title of the scene
        :param description: optional detailed description of the scene
        :param description_format: format of the description
        :param indent: control format by specifying if and how to indent attributes
        :return: JSON string that resembles that whole state
        """
        metadata = GlobalMetadata(
            title=title,
            description=description,
            description_format=description_format,
            # `version` and `timestamp` added by the constructor
        )
        return State(root=self._node, metadata=metadata).json(exclude_none=True, indent=indent)

    def save_state(
        self,
        *,
        destination: str | os.PathLike,
        title: str | None = None,
        description: str | None = None,
        description_format: DescriptionFormatT | None = None,
        indent: int | None = 2,
    ) -> None:
        """
        Saves the JSON representation of the current state to a file. Can be enriched with metadata.
        :param destination: file path to write
        :param title: optional title of the scene
        :param description: optional detailed description of the scene
        :param description_format: format of the description
        :param indent: control format by specifying if and how to indent attributes
        """
        state = self.get_state(
            title=title, description=description, description_format=description_format, indent=indent
        )
        with open(destination, "w") as out:
            out.write(state)

    def camera(
        self,
        *,
        target: Vec3[float],
        position: Vec3[float],
        up: Vec3[float] | None = (0, 1, 0),
    ):
        """
        Manually position the camera.
        :param target: what to look at
        :param position: the position of the camera
        :param up: controls the rotation around the vector between target and position
        :return: this builder
        """
        params = make_params(CameraParams, locals())
        node = Node(kind="camera", params=params)
        self._add_child(node)
        return self

    def canvas(self, *, background_color: ColorT | None = None) -> Root:
        """
        Customize canvas properties such as background color.
        :param background_color: desired background color, either as SVG color name or hex code
        :return: this builder
        """
        params = make_params(CanvasParams, locals())
        node = Node(kind="canvas", params=params)
        self._add_child(node)
        return self

    def download(self, *, url: str, ref: RefT = None) -> Download:
        """
        Add a new structure to the builder by downloading structure data from a URL.
        :param url: source of structure data
        :param ref: optional, reference that can be used to access this node
        :return: a builder that handles operations on the downloaded resource
        """
        params = make_params(DownloadParams, locals())
        node = Node(kind="download", params=params)
        self._add_child(node)
        return Download(node=node, root=self._root)


class Download(_Base):
    """
    Builder step with operations needed after downloading structure data.
    """

    def parse(self, *, format: ParseFormatT, ref: RefT = None) -> Parse:
        """
        Parse the content by specifying the file format.
        :param format: specify the format of your structure data
        :param ref: optional, reference that can be used to access this node
        :return: a builder that handles operations on the parsed content
        """
        params = make_params(ParseParams, locals())
        node = Node(kind="parse", params=params)
        self._add_child(node)
        return Parse(node=node, root=self._root)


class Parse(_Base):
    """
    Builder step with operations needed after parsing structure data.
    """

    def model_structure(
        self,
        *,
        model_index: int | None = None,
        block_index: int | None = None,
        block_header: str | None = None,
        ref: RefT = None,
    ) -> Structure:
        """
        Create a structure for the deposited coordinates.
        :param model_index: 0-based model index in case multiple NMR frames are present
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present
        :param block_header: Reference a specific mmCIF or SDF data block by its block header
        :return: a builder that handles operations at structure level
        """
        params = make_params(StructureParams, locals(), type="model")
        node = Node(kind="structure", params=params)
        self._add_child(node)
        return Structure(node=node, root=self._root)

    def assembly_structure(
        self,
        *,
        assembly_id: str | None = None,
        model_index: int | None = None,
        block_index: int | None = None,
        block_header: str | None = None,
        ref: RefT = None,
    ) -> Structure:
        """
        Create an assembly structure.
        :param assembly_id: Use the name to specify which assembly to load
        :param model_index: 0-based model index in case multiple NMR frames are present
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present
        :param block_header: Reference a specific mmCIF or SDF data block by its block header
        :return: a builder that handles operations at structure level
        """
        params = make_params(StructureParams, locals(), type="assembly")
        node = Node(kind="structure", params=params)
        self._add_child(node)
        return Structure(node=node, root=self._root)

    def symmetry_structure(
        self,
        *,
        ijk_min: Vec3[int] | None = (-1, -1, -1),
        ijk_max: Vec3[int] | None = (1, 1, 1),
        model_index: int | None = None,
        block_index: int | None = None,
        block_header: str | None = None,
        ref: RefT = None,
    ) -> Structure:
        """
        Create symmetry structure for a given range of Miller indices.
        :param ijk_min: Bottom-left Miller indices
        :param ijk_max: Top-right Miller indices
        :param model_index: 0-based model index in case multiple NMR frames are present
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present
        :param block_header: Reference a specific mmCIF or SDF data block by its block header
        :return: a builder that handles operations at structure level
        """
        params = make_params(StructureParams, locals(), type="symmetry")
        node = Node(kind="structure", params=params)
        self._add_child(node)
        return Structure(node=node, root=self._root)

    def symmetry_mates_structure(
        self,
        *,
        radius: float | None = 5.0,
        model_index: int | None = None,
        block_index: int | None = None,
        block_header: str | None = None,
        ref: RefT = None,
    ) -> Structure:
        """
        Create structure of symmetry mates.
        :param radius: Radius of symmetry partners to include
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present
        :param block_header: Reference a specific mmCIF or SDF data block by its block header
        :return: a builder that handles operations at structure level
        """
        params = make_params(StructureParams, locals(), type="symmetry_mates")
        node = Node(kind="structure", params=params)
        self._add_child(node)
        return Structure(node=node, root=self._root)


class Structure(_Base, _PrimitivesMixin):
    """
    Builder step with operations needed after defining the structure to work with.
    """

    def component(
        self,
        *,
        selector: ComponentSelectorT | ComponentExpression | list[ComponentExpression] = "all",
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Component:
        """
        Define a new component/selection for the given structure.
        :param selector: a predefined component selector or one or more component selection expressions
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: a builder that handles operations at component level
        """
        params = make_params(ComponentInlineParams, locals())
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
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Component:
        """
        Define a new component/selection for the given structure by fetching additional data from a resource.
        :param uri: resource location
        :param format: format ('cif', 'bcif', 'json') of the content
        :param category_name: only applies when format is 'cif' or 'bcif'
        :param field_name: name of the column in CIF or field name (key) in JSON that contains the desired value (color/label/tooltip/component...); the default value is 'color'/'label'/'tooltip'/'component' depending on the node kind
        :param block_header: only applies when format is 'cif' or 'bcif'
        :param block_index: only applies when format is 'cif' or 'bcif'
        :param schema: granularity/type of the selection
        :param field_values: create the component from rows that have any of these values in the field specified by `field_name`. If not provided, create the component from all rows.
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: a builder that handles operations at component level
        """
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
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Component:
        """
        Define a new component/selection for the given structure by using categories from the source file.
        :param category_name: only applies when format is 'cif' or 'bcif'
        :param field_name: name of the column in CIF or field name (key) in JSON that contains the desired value (color/label/tooltip/component...); the default value is 'color'/'label'/'tooltip'/'component' depending on the node kind
        :param block_header: only applies when format is 'cif' or 'bcif'
        :param block_index: only applies when format is 'cif' or 'bcif'
        :param schema: granularity/type of the selection
        :param field_values: create the component from rows that have any of these values in the field specified by `field_name`. If not provided, create the component from all rows.
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: a builder that handles operations at component level
        """
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
        """
        Define a new label for the given structure by fetching additional data from a resource.
        :param uri: resource location
        :param format: format ('cif', 'bcif', 'json') of the content
        :param category_name: only applies when format is 'cif' or 'bcif'
        :param field_name: name of the column in CIF or field name (key) in JSON that contains the desired value (color/label/tooltip/component...); the default value is 'color'/'label'/'tooltip'/'component' depending on the node kind
        :param block_header: only applies when format is 'cif' or 'bcif'
        :param block_index: only applies when format is 'cif' or 'bcif'
        :param schema: granularity/type of the selection
        :return: this builder
        """
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
        """
        Define a new label for the given structure by fetching additional data from the source file.
        :param category_name: only applies when format is 'cif' or 'bcif'
        :param field_name: name of the column in CIF or field name (key) in JSON that contains the desired value (color/label/tooltip/component...); the default value is 'color'/'label'/'tooltip'/'component' depending on the node kind
        :param block_header: only applies when format is 'cif' or 'bcif'
        :param block_index: only applies when format is 'cif' or 'bcif'
        :param schema: granularity/type of the selection
        :return: this builder
        """
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
        """
        Define a new tooltip for the given structure by fetching additional data from a resource.
        :param uri: resource location
        :param format: format ('cif', 'bcif', 'json') of the content
        :param category_name: only applies when format is 'cif' or 'bcif'
        :param field_name: name of the column in CIF or field name (key) in JSON that contains the desired value (color/label/tooltip/component...); the default value is 'color'/'label'/'tooltip'/'component' depending on the node kind
        :param block_header: only applies when format is 'cif' or 'bcif'
        :param block_index: only applies when format is 'cif' or 'bcif'
        :param schema: granularity/type of the selection
        :return: this builder
        """
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
        """
        Define a new tooltip for the given structure by fetching additional data from the source file.
        :param category_name: only applies when format is 'cif' or 'bcif'
        :param field_name: name of the column in CIF or field name (key) in JSON that contains the desired value (color/label/tooltip/component...); the default value is 'color'/'label'/'tooltip'/'component' depending on the node kind
        :param block_header: only applies when format is 'cif' or 'bcif'
        :param block_index: only applies when format is 'cif' or 'bcif'
        :param schema: granularity/type of the selection
        :return: this builder
        """
        params = make_params(TooltipFromSourceParams, locals())
        node = Node(kind="tooltip_from_source", params=params)
        self._add_child(node)
        return self

    def transform(
        self,
        *,
        rotation: Sequence[float] | None = None,
        translation: Sequence[float] | None = None,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Structure:
        """
        Transform a structure by applying a rotation matrix and/or translation vector.
        :param rotation: 9d vector describing the rotation, in column major (j * 3 + i indexing) format, this is equivalent to Fortran-order in numpy, to be multiplied from the left
        :param translation: 3d vector describing the translation
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: this builder
        """
        if rotation is not None:
            if len(rotation) != 9:
                raise ValueError(f"Parameter `rotation` must have length 9")
            if not self._is_rotation_matrix(rotation):
                raise ValueError(f"Parameter `rotation` must be a rotation matrix")
        if translation is not None:
            if len(translation) != 3:
                raise ValueError(f"Parameter `translation` must have length 3")

        params = make_params(TransformParams, locals())
        node = Node(kind="transform", params=params)
        self._add_child(node)
        return self

    @staticmethod
    def _is_rotation_matrix(t: Sequence[float], eps: float = 0.005):
        a00, a01, a02, a10, a11, a12, a20, a21, a22 = t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], t[8]

        det3x3 = math.fabs(
            a00 * (a11 * a22 - a12 * a21) - a01 * (a10 * a22 - a12 * a20) + a02 * (a10 * a21 - a11 * a20)
        )
        return math.isclose(det3x3, 1, abs_tol=eps)


class Component(_Base, _FocusMixin):
    """
    Builder step with operations relevant for a particular component.
    """

    def representation(
        self, *, type: RepresentationTypeT = "cartoon", custom: CustomT = None, ref: RefT = None
    ) -> Representation:
        """
        Add a representation for this component.
        :param type: the type of representation, defaults to 'cartoon'
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: a builder that handles operations at representation level
        """
        params = make_params(RepresentationParams, locals())
        node = Node(kind="representation", params=params)
        self._add_child(node)
        return Representation(node=node, root=self._root)

    def label(self, *, text: str) -> Component:
        """
        Add a text label to a component.
        :param text: label to add in 3D
        :return: this builder
        """
        params = make_params(LabelInlineParams, locals())
        node = Node(kind="label", params=params)
        self._add_child(node)
        return self

    def tooltip(self, *, text: str) -> Component:
        """
        Add a tooltip that shows additional information of a component when hovering over it.
        :param text: text to show upon hover
        :return: this builder
        """
        params = make_params(TooltipInlineParams, locals())
        node = Node(kind="tooltip", params=params)
        self._add_child(node)
        return self


class Representation(_Base):
    """
    Builder step with operations relating to particular representations.
    """

    def color_from_source(
        self,
        *,
        schema: SchemaT,
        category_name: str,
        field_name: str | None = None,
        block_header: str | None = None,
        block_index: int | None = None,
    ) -> Representation:
        """
        Use a custom category from the source file to define colors of this representation.
        :param schema: granularity/type of the selection
        :param category_name: only applies when format is 'cif' or 'bcif'
        :param field_name: name of the column in CIF or field name (key) in JSON that contains the desired value (color/label/tooltip/component...); the default value is 'color'/'label'/'tooltip'/'component' depending on the node kind
        :param block_header: only applies when format is 'cif' or 'bcif'
        :param block_index: only applies when format is 'cif' or 'bcif'
        :return: this builder
        """
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
        """
        Use another resource to define colors of this representation.
        :param schema: granularity/type of the selection
        :param uri: resource location
        :param format: format ('cif', 'bcif', 'json') of the content
        :param category_name: only applies when format is 'cif' or 'bcif'
        :param field_name: name of the column in CIF or field name (key) in JSON that contains the desired value (color/label/tooltip/component...); the default value is 'color'/'label'/'tooltip'/'component' depending on the node kind
        :param block_header: only applies when format is 'cif' or 'bcif'
        :param block_index: only applies when format is 'cif' or 'bcif'
        :return: this builder
        """
        params = make_params(ColorFromUriParams, locals())
        node = Node(kind="color_from_uri", params=params)
        self._add_child(node)
        return self

    def color(
        self,
        *,
        color: ColorT,
        selector: ComponentSelectorT | ComponentExpression | list[ComponentExpression] = "all",
        custom: CustomT = None,
    ) -> Representation:
        """
        Customize the color of this representation.
        :param color: color using SVG color names or RGB hex code
        :param selector: optional selector, defaults to applying the color to the whole representation
        :param custom: optional, custom data to attach to this node
        :return: this builder
        """
        params = make_params(ColorInlineParams, locals())
        node = Node(kind="color", params=params)
        self._add_child(node)
        return self

    def opacity(self, *, opacity: float) -> Representation:
        """
        Customize the opacity/transparency of this representation.
        :param opacity: float describing how opaque this representation should be, 0.0: fully transparent, 1.0: fully opaque
        :return: this builder
        """
        params = make_params(OpacityInlineParams, locals())
        node = Node(kind="opacity", params=params)
        self._add_child(node)
        return self


class PrimitivesFromUri(_Base, _FocusMixin):
    """
    A collection of primitives (such as spheres, lines, ...) that will be loaded from provided resource.
    """


class Primitives(_Base, _FocusMixin):
    """
    A collection of primitives (such as spheres, lines, ...) that will be grouped together and can be customized using
    options.
    """

    def as_data_node(self) -> dict:
        """
        Convert the current primitives builder to data which can be serialized and served independently.
        Only primitive kind children are kept.
        """
        return Node(
            kind="primitives",
            params=self._node.params,
            children=[child for child in self._node.children or [] if child.kind == "primitive"],
            custom=self._node.custom,
            ref=self._node.ref,
        ).dict()

    def mesh(
        self,
        *,
        vertices: list[float],
        indices: list[int],
        triangle_colors: list[ColorT] | None = None,
        triangle_groups: list[int] | None = None,
        group_colors: dict[int, ColorT] | None = None,
        group_tooltips: dict[int, str] | None = None,
        tooltip: str | None = None,
        color: ColorT | None = None,
        show_triangles: bool | None = True,
        show_wireframe: bool | None = False,
        wireframe_width: float | None = 1.0,
        wireframe_color: ColorT | None = None,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Primitives:
        """
        Construct custom meshes/shapes in a low-level fashion by providing vertices and indices.
        :param vertices: collection of vertices
        :param indices: collection of indices
        :param triangle_colors: color value of each triangle
        :param triangle_groups: group number for each triangle
        :param group_colors: mapping of group number to color, if not specified, use primitive group global option color
        :param group_tooltips: mapping of group number to optional hover tooltip
        :param tooltip: tooltip, assigned group_tooltips take precedence
        :param color: default color of triangle faces
        :param show_triangles: determine whether to render triangles of the mesh
        :param show_wireframe: determine whether to render wireframe of the mesh
        :param wireframe_width: wireframe line width
        :param wireframe_color: wireframe color, uses triangle/group colors when not set
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: this builder
        """
        params = make_params(MeshParams, {"kind": "mesh", **locals()})
        node = Node(kind="primitive", params=params)
        self._add_child(node)
        return self

    def lines(
        self,
        *,
        vertices: list[float],
        indices: list[int],
        line_groups: list[int] | None = None,
        group_colors: dict[int, ColorT] | None = None,
        group_tooltips: dict[int, str] | None = None,
        group_width: dict[int, float] | None = None,
        tooltip: str | None = None,
        color: ColorT | None = None,
        width: float | None = 1.0,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Primitives:
        """
        Construct custom meshes/shapes in a low-level fashion by providing vertices and indices.
        :param vertices: 3N collection of vertices
        :param indices: 2N collection of indices
        :param line_groups: group number for each line
        :param group_colors: mapping of group number to color, if not specified, use primitive group global option color
        :param group_tooltips: mapping of group number to optional hover tooltip
        :param group_width: mapping of group number to optional line width
        :param tooltip: tooltip, assigned group_tooltips take precedence
        :param color: default color of tre lines
        :param width: line width
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: this builder
        """
        params = make_params(LinesParams, {"kind": "lines", **locals()})
        node = Node(kind="primitive", params=params)
        self._add_child(node)
        return self

    def tube(
        self,
        *,
        start: PrimitivePositionT,
        end: PrimitivePositionT,
        radius: float | None = 0.05,
        dash_length: float | None = None,
        color: ColorT | None = None,
        tooltip: str | None = None,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Primitives:
        """
        Defines a tube (3D cylinder), connecting a start and an end point.
        :param start: origin coordinates
        :param end: destination coordinates
        :param radius: tube radius (in Angstroms)
        :param dash_length: length of each dash
        :param color: color of the tube
        :param tooltip: tooltip to show when hovering the tube
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: this builder
        """
        params = make_params(TubeParams, {"kind": "tube", **locals()})
        node = Node(kind="primitive", params=params)
        self._add_child(node)
        return self

    def distance(
        self,
        *,
        start: PrimitivePositionT,
        end: PrimitivePositionT,
        radius: float | None = 0.01,
        dash_length: float | None = 0.05,
        color: ColorT | None = None,
        label_template: str | None = "{{distance}}",
        label_size: float | None = None,
        label_auto_size_scale: float | None = 0.1,
        label_auto_size_min: float | None = 0.2,
        label_color: ColorT | None = None,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Primitives:
        """
        Defines a tube, connecting a start and an end point, with label containing distance between start and end.
        :param start: origin coordinates
        :param end: destination coordinates
        :param radius: tube radius (in Angstroms)
        :param dash_length: length of each dash
        :param color: color of the tube
        :param label_template: template used to construct the label, use {{distance}} as placeholder for the distance value
        :param label_size: size of the label; if not provided (None), size will be computed relative to the distance (see label_auto_size_scale, label_auto_size_min)
        :param label_auto_size_scale: scaling factor when label_size is None
        :param label_auto_size_min: minimum size when label_size is None
        :param label_color: color of the label
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: this builder
        """
        params = make_params(DistanceMeasurementParams, {"kind": "distance_measurement", **locals()})
        node = Node(kind="primitive", params=params)
        self._add_child(node)
        return self

    def label(
        self,
        *,
        position: PrimitivePositionT,
        text: str,
        label_size: float | None = 1,
        label_color: ColorT | None = None,
        label_offset: float | None = 1.0,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Primitives:
        """
        Defines a label
        :param position: position coordinates
        :param text: label value
        :param label_size: size of the label
        :param label_color: color of the label
        :param label_offset: camera-facing offset to prevent overlap with geometry
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: this builder
        """
        params = make_params(PrimitiveLabelParams, {"kind": "label", **locals()})
        node = Node(kind="primitive", params=params)
        self._add_child(node)
        return self
