"""
Use this builder to navigate the creating of MolViewSpec files. Chain operations together as needed and invoke
`get_state` or `save_state` to export the corresponding JSON needed to recreate that scene.
"""

from __future__ import annotations

import math
import os
from abc import ABC, abstractmethod
from typing import Any, Literal, Sequence, overload

from pydantic import BaseModel, PrivateAttr
from typing_extensions import Self

from molviewspec.nodes import (
    AngleMeasurementParams,
    ArrowParams,
    BoxParams,
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
    EllipseParams,
    EllipsoidParams,
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
    RepresentationTypeParams,
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
    VolumeParams,
    VolumeRepresentationTypeParams,
    VolumeRepresentationTypeT,
)
from molviewspec.utils import make_params
from molviewspec.molstar_widgets import molstar_notebook, molstar_streamlit


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

    @abstractmethod
    def _get_root(self) -> Root:
        ...

    @abstractmethod
    def _get_node(self) -> Node:
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

    def _get_root(self) -> Root:
        # need to define this separately because Pydantic v2 PrivateAttr does not work with abstract methods
        return self._root

    def _get_node(self) -> Node:
        # need to define this separately because Pydantic v2 PrivateAttr does not work with abstract methods
        return self._node

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
        :param color: default color for primitives in this group (default: "white")
        :param label_color: default label color for primitives in this group (default: "white")
        :param tooltip: default tooltip for primitives in this group (default: no tooltip)
        :param opacity: opacity of primitive geometry in this group (default: 1)
        :param label_opacity: opacity of primitive labels in this group (default: 1)
        :param instances: instances of this primitive group defined as 4x4 column major (j * 4 + i indexing) transformation matrices
        """
        params = make_params(PrimitivesParams, locals())
        node = Node(kind="primitives", params=params)
        self._add_child(node)
        return Primitives(node=node, root=self._get_root())

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
        :param format: list of nodes the data are referencing
        :param references: list of nodes the data are referencing (default: [])
        :return: current builder node
        """
        params = make_params(PrimitivesFromUriParams, locals())
        node = Node(kind="primitives_from_uri", params=params)
        self._add_child(node)
        return PrimitivesFromUri(node=node, root=self._get_root())


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
        :param direction: the direction from which to look at this component (default: (0, 0, -1))
        :param up: where is up relative to the view direction (default: (0, 1, 0))
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
        state = State(root=self._node, metadata=metadata)

        # pydantic v1 compatibility
        if hasattr(state, "model_dump_json"):
            return state.model_dump_json(exclude_none=True, indent=indent)
        return state.json(exclude_none=True, indent=indent)

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
        up: Vec3[float] | None = None,
    ):
        """
        Manually position the camera.
        :param target: what to look at
        :param position: the position of the camera
        :param up: controls the rotation around the vector between target and position (default: (0, 1, 0))
        :return: this builder
        """
        params = make_params(CameraParams, locals())
        node = Node(kind="camera", params=params)
        self._add_child(node)
        return self

    def canvas(self, *, background_color: ColorT) -> Root:
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

    def _ipython_display_(self):
        """
        Display the current state as a Molstar HTML component for Jupyter or Google Colab.
        """
        self.molstar_notebook()

    def molstar_notebook(self, data: dict[str, bytes]=None, width=950, height=600, download_filename='molstar_download'):
        """
        Visualize the current state as a Molstar HTML component for Jupyter or Google Colab.

        :param data: optional, create MVSX archive with additional file contents to include (filename -> file contents)
        :param width: width of the Molstar viewer (default: 950)
        :param height: height of the Molstar viewer (default: 600)
        :param download_filename: filename for the Molstar HTML file (default: "molstar_download")
        """
        molstar_notebook(
            state=self.get_state(),
            data=data,
            width=width,
            height=height,
            download_filename=download_filename,
        )

    def molstar_streamlit(self, data=None, width=None, height=500):
        """
        Show Mol* viewer in a Streamlit app.

        :param data: optional, create MVSX archive with additional file contents to include (filename -> file contents)
        :param width: width of the Molstar viewer (default: full width)
        :param height: height of the Molstar viewer (default: 500)
        """
        return molstar_streamlit(
            self.get_state(),
            data=data,
            width=width,
            height=height,
        )


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
        :param model_index: 0-based model index in case multiple NMR frames are present (default: 0)
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present (default: 0)
        :param block_header: Reference a specific mmCIF or SDF data block by its block header (overrides `block_index`)
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
        :param assembly_id: Use the name to specify which assembly to load (default: load the first assembly)
        :param model_index: 0-based model index in case multiple NMR frames are present (default: 0)
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present (default: 0)
        :param block_header: Reference a specific mmCIF or SDF data block by its block header (overrides `block_index`)
        :return: a builder that handles operations at structure level
        """
        params = make_params(StructureParams, locals(), type="assembly")
        node = Node(kind="structure", params=params)
        self._add_child(node)
        return Structure(node=node, root=self._root)

    def symmetry_structure(
        self,
        *,
        ijk_min: Vec3[int] | None = None,
        ijk_max: Vec3[int] | None = None,
        model_index: int | None = None,
        block_index: int | None = None,
        block_header: str | None = None,
        ref: RefT = None,
    ) -> Structure:
        """
        Create symmetry structure for a given range of Miller indices.
        :param ijk_min: Bottom-left Miller indices (default: (-1, -1, -1))
        :param ijk_max: Top-right Miller indices (default: (1, 1, 1))
        :param model_index: 0-based model index in case multiple NMR frames are present (default: 0)
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present (default: 0)
        :param block_header: Reference a specific mmCIF or SDF data block by its block header (overrides `block_index`)
        :return: a builder that handles operations at structure level
        """
        params = make_params(StructureParams, locals(), type="symmetry")
        node = Node(kind="structure", params=params)
        self._add_child(node)
        return Structure(node=node, root=self._root)

    def symmetry_mates_structure(
        self,
        *,
        radius: float | None = None,
        model_index: int | None = None,
        block_index: int | None = None,
        block_header: str | None = None,
        ref: RefT = None,
    ) -> Structure:
        """
        Create structure of symmetry mates.
        :param radius: Radius of symmetry partners to include (default: 5)
        :param model_index: 0-based model index in case multiple NMR frames are present (default: 0)
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present (default: 0)
        :param block_header: Reference a specific mmCIF or SDF data block by its block header (overrides `block_index`)
        :return: a builder that handles operations at structure level
        """
        params = make_params(StructureParams, locals(), type="symmetry_mates")
        node = Node(kind="structure", params=params)
        self._add_child(node)
        return Structure(node=node, root=self._root)

    def volume(
        self,
        *,
        channel_id: str | None = None,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Volume:
        """
        Create volume node.
        :param channel_id: optional, channel identifier
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: a builder that handles operations at structure level
        """
        params = make_params(VolumeParams, locals())
        node = Node(kind="volume", params=params)
        self._add_child(node)
        return Volume(node=node, root=self._root)


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
        :param category_name: name of the CIF category to read annotation from (only applies when `format` is `"cif"` or `"bcif"`) (default: the first category in the block is used)
        :param field_name: name of the column in CIF or field name (key) in JSON that contains the component identifier (default: "component")
        :param block_header: header of the CIF block to read annotation from (only applies when `format` is `"cif"` or `"bcif"`) (default: block is selected based on `block_index`)
        :param block_index: 0-based index of the CIF block to read annotation from (only applies when `format` is `"cif"` or `"bcif"` and `block_header` is not specified) (default: 0)
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
        :param category_name: name of the CIF category to read annotation from (only applies when `format` is `"cif"` or `"bcif"`) (default: the first category in the block is used)
        :param field_name: name of the column in CIF or field name (key) in JSON that contains the component identifier (default: "component")
        :param block_header: header of the CIF block to read annotation from (only applies when `format` is `"cif"` or `"bcif"`) (default: block is selected based on `block_index`)
        :param block_index: 0-based index of the CIF block to read annotation from (only applies when `format` is `"cif"` or `"bcif"` and `block_header` is not specified) (default: 0)
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
        :param category_name: name of the CIF category to read annotation from (only applies when `format` is `"cif"` or `"bcif"`) (default: the first category in the block is used)
        :param field_name: name of the column in CIF or field name (key) in JSON that contains the label text (default: "label")
        :param block_header: header of the CIF block to read annotation from (only applies when `format` is `"cif"` or `"bcif"`) (default: block is selected based on `block_index`)
        :param block_index: 0-based index of the CIF block to read annotation from (only applies when `format` is `"cif"` or `"bcif"` and `block_header` is not specified) (default: 0)
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
        :param category_name: name of the CIF category to read annotation from (only applies when `format` is `"cif"` or `"bcif"`) (default: the first category in the block is used)
        :param field_name: name of the column in CIF or field name (key) in JSON that contains the label text (default: "label")
        :param block_header: header of the CIF block to read annotation from (only applies when `format` is `"cif"` or `"bcif"`) (default: block is selected based on `block_index`)
        :param block_index: 0-based index of the CIF block to read annotation from (only applies when `format` is `"cif"` or `"bcif"` and `block_header` is not specified) (default: 0)
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
        :param category_name: name of the CIF category to read annotation from (only applies when `format` is `"cif"` or `"bcif"`) (default: the first category in the block is used)
        :param field_name: name of the column in CIF or field name (key) in JSON that contains the tooltip text (default: "tooltip")
        :param block_header: header of the CIF block to read annotation from (only applies when `format` is `"cif"` or `"bcif"`) (default: block is selected based on `block_index`)
        :param block_index: 0-based index of the CIF block to read annotation from (only applies when `format` is `"cif"` or `"bcif"` and `block_header` is not specified) (default: 0)
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
        :param category_name: name of the CIF category to read annotation from (only applies when `format` is `"cif"` or `"bcif"`) (default: the first category in the block is used)
        :param field_name: name of the column in CIF or field name (key) in JSON that contains the tooltip text (default: "tooltip")
        :param block_header: header of the CIF block to read annotation from (only applies when `format` is `"cif"` or `"bcif"`) (default: block is selected based on `block_index`)
        :param block_index: 0-based index of the CIF block to read annotation from (only applies when `format` is `"cif"` or `"bcif"` and `block_header` is not specified) (default: 0)
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
        :param rotation: 9d vector describing the rotation, in column major (j * 3 + i indexing) format, this is equivalent to Fortran-order in numpy, to be multiplied from the left (default: identity matrix)
        :param translation: 3d vector describing the translation (default: (0, 0, 0))
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

    @overload
    def representation(
        self,
        *,
        type: Literal["cartoon"],
        size_factor: float | None = None,
        tubular_helices: bool | None = None,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Representation:
        """
        Add a cartoon representation for this component.
        :param type: the type of this representation ('cartoon')
        :param size_factor: adjust the scale of the visuals (relative to 1.0)
        :param tubular_helices: simplify helices to tubes
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: a builder that handles operations at representation level
        """
        ...

    @overload
    def representation(
        self,
        *,
        type: Literal["ball_and_stick"],
        ignore_hydrogens: bool | None = None,
        size_factor: float | None = None,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Representation:
        """
        Add a ball-and-stick representation for this component.
        :param type: the type of this representation ('ball_and_stick')
        :param ignore_hydrogens: draw hydrogen atoms?
        :param size_factor: adjust the scale of the visuals (relative to 1.0)
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: a builder that handles operations at representation level
        """
        ...

    @overload
    def representation(
        self,
        *,
        type: Literal["spacefill"],
        ignore_hydrogens: bool | None = None,
        size_factor: float | None = None,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Representation:
        """
        Add a spacefill representation for this component.
        :param type: the type of this representation ('ball_and_stick')
        :param ignore_hydrogens: draw hydrogen atoms?
        :param size_factor: adjust the scale of the visuals (relative to 1.0)
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: a builder that handles operations at representation level
        """
        ...

    @overload
    def representation(
        self,
        *,
        type: Literal["carbohydrate"],
        size_factor: float | None = None,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Representation:
        """
        Add a carbohydrate representation for this component.
        :param type: the type of this representation ('carbohydrate')
        :param size_factor: adjust the scale of the visuals (relative to 1.0)
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: a builder that handles operations at representation level
        """
        ...

    @overload
    def representation(
        self,
        *,
        type: Literal["surface"],
        ignore_hydrogens: bool | None = None,
        size_factor: float | None = None,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Representation:
        """
        Add a surface representation for this component.
        :param type: the type of this representation ('surface')
        :param ignore_hydrogens: draw hydrogen atoms?
        :param size_factor: adjust the scale of the visuals (relative to 1.0)
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: a builder that handles operations at representation level
        """
        ...

    @overload
    def representation(
        self, *, type: RepresentationTypeT = "cartoon", custom: CustomT = None, ref: RefT = None, **kwargs: Any
    ) -> Representation:
        """
        Add a representation for this component.
        :param type: the type of representation, defaults to 'cartoon'
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :param kwargs: optional, representation-specific params
        :return: a builder that handles operations at representation level
        """
        ...

    def representation(
        self, *, type: RepresentationTypeT = "cartoon", custom: CustomT = None, ref: RefT = None, **kwargs: Any
    ) -> Representation:
        """
        Add a representation for this component.
        :param type: the type of representation, defaults to 'cartoon'
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :param kwargs: optional, representation-specific params
        :return: a builder that handles operations at representation level
        """
        params_class = RepresentationTypeParams.get(type)
        params = make_params(params_class, locals(), **kwargs)  # type: ignore
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
        :param category_name: name of the CIF category to read annotation from (only applies when `format` is `"cif"` or `"bcif"`) (default: the first category in the block is used)
        :param field_name: name of the column in CIF or field name (key) in JSON that contains the color (default: "color")
        :param block_header: header of the CIF block to read annotation from (only applies when `format` is `"cif"` or `"bcif"`) (default: block is selected based on `block_index`)
        :param block_index: 0-based index of the CIF block to read annotation from (only applies when `format` is `"cif"` or `"bcif"` and `block_header` is not specified) (default: 0)
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
        format: SchemaFormatT,
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
        :param category_name: name of the CIF category to read annotation from (only applies when `format` is `"cif"` or `"bcif"`) (default: the first category in the block is used)
        :param field_name: name of the column in CIF or field name (key) in JSON that contains the color (default: "color")
        :param block_header: header of the CIF block to read annotation from (only applies when `format` is `"cif"` or `"bcif"`) (default: block is selected based on `block_index`)
        :param block_index: 0-based index of the CIF block to read annotation from (only applies when `format` is `"cif"` or `"bcif"` and `block_header` is not specified) (default: 0)
        :return: this builder
        """
        params = make_params(ColorFromUriParams, locals())
        node = Node(kind="color_from_uri", params=params)
        self._add_child(node)
        return self

    def color(
        self,
        *,
        color: ColorT | None = None,
        selector: ComponentSelectorT | ComponentExpression | list[ComponentExpression] | None = None,
        custom: CustomT = None,
    ) -> Representation:
        """
        Customize the color of this representation.
        :param color: color using SVG color names or RGB hex code
        :param selector: optional selector, defaults to applying the color to the whole representation (default: "all")
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


class Volume(_Base, _FocusMixin):
    @overload
    def representation(
        self,
        *,
        type: Literal["isosurface"],
        relative_isovalue: float | None = None,
        absolute_isovalue: float | None = None,
        show_wireframe: bool | None = None,
        show_faces: bool | None = None,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> VolumeRepresentation:
        """
        Add a iso surface representation for this component.
        :param type: the type of this representation ('isosurface')
        :param relative_isovalue: relative isovalue to use for the surface
        :param absolute_isovalue: absolute isovalue to use for the surface, overrides `relative_isovalue`
        :param show_wireframe: show wireframe on the surface (default: False)
        :param show_faces: show faces of the surface (default: True)
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: a builder that handles operations at representation level
        """
        ...

    @overload
    def representation(
        self, *, type: VolumeRepresentationTypeT = "isosurface", custom: CustomT = None, ref: RefT = None, **kwargs: Any
    ) -> VolumeRepresentation:
        """
        Add a representation for this component.
        :param type: the type of representation, defaults to 'isosurface'
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :param kwargs: optional, representation-specific params
        :return: a builder that handles operations at representation level
        """
        ...

    def representation(
        self, *, type: VolumeRepresentationTypeT = "isosurface", custom: CustomT = None, ref: RefT = None, **kwargs: Any
    ) -> VolumeRepresentation:
        """
        Add a representation for this component.
        :param type: the type of representation, defaults to 'isosurface'
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :param kwargs: optional, representation-specific params
        :return: a builder that handles operations at representation level
        """
        params_class = VolumeRepresentationTypeParams.get(type)
        params = make_params(params_class, locals(), **kwargs)  # type: ignore
        node = Node(kind="volume_representation", params=params)
        self._add_child(node)
        return VolumeRepresentation(node=node, root=self._root)


class VolumeRepresentation(_Base, _FocusMixin):
    """
    Builder step with operations relating to particular representations.
    """

    def color(
        self,
        *,
        color: ColorT | None = None,
        selector: ComponentSelectorT | ComponentExpression | list[ComponentExpression] | None = None,
        custom: CustomT = None,
    ) -> VolumeRepresentation:
        """
        Customize the color of this representation.
        :param color: color using SVG color names or RGB hex code
        :param selector: optional selector, defaults to applying the color to the whole representation (default: "all")
        :param custom: optional, custom data to attach to this node
        :return: this builder
        """
        params = make_params(ColorInlineParams, locals())
        node = Node(kind="color", params=params)
        self._add_child(node)
        return self

    def opacity(self, *, opacity: float) -> VolumeRepresentation:
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
        triangle_groups: list[int] | None = None,
        group_colors: dict[int, ColorT] | None = None,
        group_tooltips: dict[int, str] | None = None,
        color: ColorT | None = None,
        tooltip: str | None = None,
        show_triangles: bool | None = None,
        show_wireframe: bool | None = None,
        wireframe_width: float | None = None,
        wireframe_color: ColorT | None = None,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Primitives:
        """
        Construct custom meshes/shapes in a low-level fashion by providing vertices and indices.
        :param vertices: collection of vertices
        :param indices: collection of indices
        :param triangle_groups: group number for each triangle (default: each triangle is considered a separate group (triangle i = group i))
        :param group_colors: assign a color to each group. Where not assigned, uses `color` (default: {})
        :param group_tooltips: assign a tooltip to each group. Where not assigned, uses `tooltip` (default: {})
        :param color: color of the triangles and wireframe. Can be overwritten by `group_colors`. (default: use the parent primitives group `color`)
        :param tooltip: tooltip shown when hovering over. Can be overwritten by `group_tooltips`. (default: uses the parent primitives group `tooltip`)
        :param show_triangles: determine whether to render triangles of the mesh (default: true)
        :param show_wireframe: determine whether to render wireframe of the mesh (default: false)
        :param wireframe_width: wireframe line width (in screen-space units) (default: 1)
        :param wireframe_color: wireframe color (default: use `group_colors`)
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
        group_widths: dict[int, float] | None = None,
        tooltip: str | None = None,
        color: ColorT | None = None,
        width: float | None = None,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Primitives:
        """
        Construct custom set of lines in a low-level fashion by providing vertices and indices.
        :param vertices: 3N collection of vertices
        :param indices: 2N collection of indices
        :param line_groups: assign a number to each triangle to group them (default: each line is considered a separate group (line i = group i)
        :param group_colors: assign a color to each group. Where not assigned, uses `color` (default: {})
        :param group_tooltips: assign a tooltip to each group. Where not assigned, uses `tooltip` (default: {})
        :param group_widths: assign a line width to each group. Where not assigned, uses `width` (default: {})
        :param tooltip: tooltip shown when hovering over. Can be overwritten by `group_tooltips`. (default: use the parent primitives group `tooltip`)
        :param color: color of the lines. Can be overwritten by `group_colors`. (default: use the parent primitives group `color`)
        :param width: line width (in screen-space units). Can be overwritten by `group_widths` (default: 1)
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
        radius: float | None = None,
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
        :param radius: tube radius (in Angstroms) (default: 0.05)
        :param dash_length: length of each dash and gap between dashes (default: draw full line)
        :param color: color of the tube (default: use the parent primitives group `color`)
        :param tooltip: tooltip shown when hovering over (default: use the parent primitives group `tooltip`)
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: this builder
        """
        params = make_params(TubeParams, {"kind": "tube", **locals()})
        node = Node(kind="primitive", params=params)
        self._add_child(node)
        return self

    def arrow(
        self,
        *,
        start: PrimitivePositionT,
        end: PrimitivePositionT | None = None,
        direction: Vec3 | None = None,
        length: float | None = None,
        show_start_cap: bool | None = None,
        start_cap_length: float | None = None,
        start_cap_radius: float | None = None,
        show_end_cap: bool | None = None,
        end_cap_length: float | None = None,
        end_cap_radius: float | None = None,
        show_tube: bool | None = None,
        tube_radius: float | None = None,
        tube_dash_length: float | None = None,
        color: ColorT | None = None,
        tooltip: str | None = None,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Primitives:
        """
        Defines an arrow.
        :param start: origin coordinates
        :param end: destination coordinates
        :param direction: direction vector, if specified, `end` is ignored and computed as `start + direction`
        :param length: length of the arrow, if not specified, computed from `start` and `end`
        :param show_start_cap: if true, draw an arrow head at the start (default: False)
        :param start_cap_length: height of the arrow head at the start (default: 0.1)
        :param start_cap_radius: radius of the arrow head at the start (default: 0.1)
        :param show_end_cap: if true, draw an arrow head at the end (default: False)
        :param end_cap_length: height of the arrow head at the end (default: 0.1)
        :param end_cap_radius: radius of the arrow head at the end (default: 0.1)
        :param show_tube: if true, draw a tube connecting the start and end points (default: True)
        :param tube_radius: tube radius (in Angstroms) (default: 0.05)
        :param tube_dash_length: length of each dash and gap between dashes (default: draw full line)
        :param color: color of the arrow (default: use the parent primitives group `color`)
        :param tooltip: tooltip shown when hovering over (default: use the parent primitives group `tooltip`)
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        """
        params = make_params(ArrowParams, {"kind": "arrow", **locals()})
        node = Node(kind="primitive", params=params)
        self._add_child(node)
        return self

    def distance(
        self,
        *,
        start: PrimitivePositionT,
        end: PrimitivePositionT,
        radius: float | None = None,
        dash_length: float | None = None,
        color: ColorT | None = None,
        label_template: str | None = None,
        label_size: float | None = None,
        label_auto_size_scale: float | None = None,
        label_auto_size_min: float | None = None,
        label_color: ColorT | None = None,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Primitives:
        """
        Defines a tube, connecting a start and an end point, with label containing distance between start and end.
        :param start: origin coordinates
        :param end: destination coordinates
        :param radius: tube radius (in Angstroms) (default: 0.05)
        :param dash_length: length of each dash and gap between dashes (default: draw full line)
        :param color: color of the tube (default: use the parent primitives group `color`)
        :param label_template: template used to construct the label, use {{distance}} as placeholder for the distance value (default: "{{distance}}")
        :param label_size: size of the label (text height in Angstroms) (default: size will be relative to the distance (see label_auto_size_scale, label_auto_size_min))
        :param label_auto_size_scale: scaling factor for relative size when label_size is None (default: 0.1)
        :param label_auto_size_min: scaling factor for relative size when label_size is None (default: 0)
        :param label_color: color of the label (default: use the parent primitives group `label_color`)
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: this builder
        """
        params = make_params(DistanceMeasurementParams, {"kind": "distance_measurement", **locals()})
        node = Node(kind="primitive", params=params)
        self._add_child(node)
        return self

    def angle(
        self,
        *,
        a: PrimitivePositionT,
        b: PrimitivePositionT,
        c: PrimitivePositionT,
        radius: float | None = None,
        dash_length: float | None = None,
        color: ColorT | None = None,
        label_template: str | None = None,
        label_size: float | None = None,
        label_auto_size_scale: float | None = None,
        label_auto_size_min: float | None = None,
        label_color: ColorT | None = None,
        show_vector: bool | None = None,
        vector_color: ColorT | None = None,
        show_section: bool | None = None,
        section_color: ColorT | None = None,
        section_radius: float | None = None,
        section_radius_scale: float | None = None,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Primitives:
        """
        Defines a angle between vectors (b - a) and (c - b)
        :param a: first point
        :param b: second point
        :param c: third point
        :param label_template: template used to construct the label, use {{angle}} as placeholder for the angle value in degrees (default: "{{angle}}")
        :param label_size: size of the label (text height in Angstroms) (default: size will be relative to the distance (see label_auto_size_scale, label_auto_size_min))
        :param label_auto_size_scale: scaling factor for relative size when label_size is None (default: 0.33)
        :param label_auto_size_min: scaling factor for relative size when label_size is None (default: 0)
        :param label_color: color of the label (default: use the parent primitives group `label_color`)
        :param show_vector: if true, draw a vector from a to b, and b to c (default: True)
        :param vector_color: color of the vector (default: use the parent primitives group `color`)
        :param show_section: if true, draw a section of the angle (default: True)
        :param section_color: color of the section (default: use the parent primitives group `color`)
        :param section_radius: radius of the section (in Angstroms). If unset, computed as smaller of the distances from b to a and b to c.
        :param section_radius_scale: scaling factor for the section radius (default: 0.33). Ignored if `section_radius` is set.
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: this builder
        """
        params = make_params(AngleMeasurementParams, {"kind": "angle_measurement", **locals()})
        node = Node(kind="primitive", params=params)
        self._add_child(node)
        return self

    def label(
        self,
        *,
        position: PrimitivePositionT,
        text: str,
        label_size: float | None = None,
        label_color: ColorT | None = None,
        label_offset: float | None = None,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Primitives:
        """
        Defines a label.
        :param position: position coordinates
        :param text: label value
        :param label_size: size of the label (text height in Angstroms) (default: 1)
        :param label_color: color of the label (default: use the parent primitives group `label_color`)
        :param label_offset: camera-facing offset to prevent overlap with geometry (default: 0)
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: this builder
        """
        params = make_params(PrimitiveLabelParams, {"kind": "label", **locals()})
        node = Node(kind="primitive", params=params)
        self._add_child(node)
        return self

    def ellipse(
        self,
        *,
        center: PrimitivePositionT,
        as_circle: bool | None = None,
        major_axis: Vec3 | None = None,
        minor_axis: Vec3 | None = None,
        major_axis_endpoint: PrimitivePositionT | None = None,
        minor_axis_endpoint: PrimitivePositionT | None = None,
        radius_major: float | None = None,
        radius_minor: float | None = None,
        theta_start: float | None = None,
        theta_end: float | None = None,
        color: ColorT | None = None,
        tooltip: str | None = None,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Primitives:
        """
        Defines an ellipse.
        :param center: center coordinates
        :param as_circle: if true, true, ignores radius_minor/magnitude of the minor axis
        :param major_axis: major axis coordinates
        :param minor_axis: minor axis coordinates
        :param major_axis_endpoint: endpoint of the major axis, if specified, `major_axis` is ignored and computed from `center` and `major_axis_endpoint`
        :param minor_axis_endpoint: endpoint of the minor axis, if specified, `minor_axis` is ignored and computed from `center` and `minor_axis_endpoint`
        :param radius_major: major axis radius, if unset, computed from major axis magnitude
        :param radius_minor: minor axis radius, if unset, computed from minor axis magnitude
        :param theta_start: start angle in radians (default: 0)
        :param theta_end: end angle in radians (default: 360)
        :param color: color of the ellipse (default: use the parent primitives group `color`)
        :param tooltip: tooltip shown when hovering over (default: use the parent primitives group `tooltip`)
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: this builder
        """
        if major_axis is None and major_axis_endpoint is None:
            raise ValueError("Either `major_axis` or `major_axis_endpoint` must be provided.")
        if minor_axis is None and minor_axis_endpoint is None:
            raise ValueError("Either `minor_axis` or `minor_axis_endpoint` must be provided to define orientation.")

        params = make_params(EllipseParams, {"kind": "ellipse", **locals()})
        node = Node(kind="primitive", params=params)
        self._add_child(node)
        return self

    def ellipsoid(
        self,
        *,
        center: PrimitivePositionT,
        major_axis: Vec3 | None = None,
        minor_axis: Vec3 | None = None,
        major_axis_endpoint: PrimitivePositionT | None = None,
        minor_axis_endpoint: PrimitivePositionT | None = None,
        radius: Vec3 | float | None = None,
        radius_extent: Vec3 | float | None = None,
        color: ColorT | None = None,
        tooltip: str | None = None,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Primitives:
        """
        Defines an ellipsoid.
        :param center: center coordinates
        :param major_axis: major axis coordinates
        :param minor_axis: minor axis coordinates
        :param major_axis_endpoint: endpoint of the major axis, if specified, `major_axis` is ignored and computed from `center` and `major_axis_endpoint`
        :param minor_axis_endpoint: endpoint of the minor axis, if specified, `minor_axis` is ignored and computed from `center` and `minor_axis_endpoint`
        :param radius: ellipsoid radii, if unset, bounding sphere is computed for the center position
        :param radius_extent: ellipsoid radii extent added to the radius along each axis
        :param color: color of the ellipse (default: use the parent primitives group `color`)
        :param tooltip: tooltip shown when hovering over (default: use the parent primitives group `tooltip`)
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: this builder
        """
        params = make_params(EllipsoidParams, {"kind": "ellipsoid", **locals()})
        node = Node(kind="primitive", params=params)
        self._add_child(node)
        return self

    def sphere(
        self,
        *,
        center: PrimitivePositionT,
        radius: float | None = None,
        radius_extent: float | None = None,
        color: ColorT | None = None,
        tooltip: str | None = None,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Primitives:
        """
        Defines a sphere.
        :param center: center coordinates
        :param radius: sphere radius, if unset, computed from center bounding sphere
        :param radius_extent: radius extent added to the radius
        :param color: color of the sphere (default: use the parent primitives group `color`)
        :param tooltip: tooltip shown when hovering over (default: use the parent primitives group `tooltip`)
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: this builder
        """
        params = make_params(EllipsoidParams, {"kind": "ellipsoid", **locals()})
        node = Node(kind="primitive", params=params)
        self._add_child(node)
        return self

    def box(
        self,
        *,
        center: PrimitivePositionT,
        extent: Vec3 | None = None,
        show_faces: bool = True,
        face_color: ColorT | None = None,
        show_edges: bool = False,
        edge_radius: float = 0.1,
        edge_color: ColorT | None = None,
        show_wireframe: bool = False,
        wireframe_color: ColorT | None = None,
        wireframe_width: float | None = None,
        tooltip: str | None = None,
        custom: CustomT = None,
        ref: RefT = None,
    ) -> Primitives:
        """
        Defines a box.
        :param center: center coordinates
        :param extent: box extent (half-lengths along each axis)
        :param show_faces: show box faces
        :param face_color: color of the box faces
        :param show_edges: show box edges
        :param edge_radius: box edge radius
        :param edge_color: color of the box edges
        :param show_wireframe: show box wireframe
        :param wireframe_color: color of the box wireframe
        :param wireframe_width: box wireframe width
        :param tooltip: tooltip shown when hovering over
        :param custom: optional, custom data to attach to this node
        :param ref: optional, reference that can be used to access this node
        :return: this builder
        """
        params = make_params(BoxParams, {"kind": "box", **locals()})
        node = Node(kind="primitive", params=params)
        self._add_child(node)
        return self
