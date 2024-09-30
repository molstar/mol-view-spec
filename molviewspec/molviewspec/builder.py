"""
Use this builder to navigate the creating of MolViewSpec files. Chain operations together as needed and invoke
`get_state` or `save_state` to export the corresponding JSON needed to recreate that scene.
"""

from __future__ import annotations

import math
import os
from typing import Sequence

from pydantic import BaseModel, PrivateAttr

from molviewspec.nodes import (
    AdditionalProperties,
    ApplySelectionInlineParams,
    CameraParams,
    CanvasParams,
    CircleParams,
    ColorFromSourceParams,
    ColorFromUriParams,
    ColorInlineParams,
    ColorT,
    ComponentExpression,
    ComponentFromSourceParams,
    ComponentFromUriParams,
    ComponentInlineParams,
    ComponentSelectorT,
    DescriptionFormatT,
    DownloadParams,
    FocusInlineParams,
    LabelFromSourceParams,
    LabelFromUriParams,
    LabelInlineParams,
    Mat3,
    MeshInlineParams,
    Metadata,
    Node,
    ParseFormatT,
    ParseParams,
    PlaneParams,
    PositionT,
    RepresentationParams,
    RepresentationTypeT,
    SchemaFormatT,
    SchemaT,
    State,
    StructureParams,
    TooltipFromSourceParams,
    TooltipFromUriParams,
    TooltipInlineParams,
    TransformParams,
    TransparencyInlineParams,
    Vec3,
)
from molviewspec.utils import get_major_version_tag, make_params


def create_builder() -> Root:
    """
    Entry point, which instantiates a new builder instance.
    :return: a new builder instance
    """
    return Root()


class _Base(BaseModel):
    """
    Internal base node from which all other nodes are derived.
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


class Root(_Base):
    """
    The builder for MolViewSpec state descriptions. Provides fine-grained options as well as global properties such as
    canvas color or camera position and functionality to eventually export this scene.
    """

    def __init__(self) -> None:
        super().__init__(root=self, node=Node(kind="root"))

    def get_node(self) -> Node:
        return self._node

    def get_state(
        self,
        *,
        title: str | None = None,
        description: str | None = None,
        description_format: DescriptionFormatT | None = None,
        key: str | None = None,
        indent: int | None = 2,
    ) -> str:
        """
        Emits JSON representation of the current state. Can be enriched with metadata.
        :param title: optional title of the scene
        :param description: optional detailed description of the scene
        :param description_format: format of the description
        :param key: (unique) identifier of this state, leave empty to assign a UUID
        :param indent: control format by specifying if and how to indent attributes
        :return: JSON string that resembles that whole state
        """
        metadata = Metadata(
            description=description,
            description_format=description_format,
            key=key,
            title=title,
            version=get_major_version_tag(),
        )
        return State(root=self._node, metadata=metadata).json(exclude_none=True, indent=indent)

    def save_state(
        self,
        *,
        destination: str | os.PathLike,
        indent: int | None = 2,
        title: str | None = None,
        description: str | None = None,
        description_format: DescriptionFormatT | None = None,
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
        additional_properties: AdditionalProperties = None,
    ):
        """
        Manually position the camera.
        :param target: what to look at
        :param position: the position of the camera
        :param up: controls the rotation around the vector between target and position
        :param additional_properties: optional, custom data to attach to this node
        :return: this builder
        """
        params = make_params(CameraParams, locals())
        node = Node(kind="camera", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return self

    def canvas(
        self, *, background_color: ColorT | None = None, additional_properties: AdditionalProperties = None
    ) -> Root:
        """
        Customize canvas properties such as background color.
        :param background_color: desired background color, either as SVG color name or hex code
        :param additional_properties: optional, custom data to attach to this node
        :return: this builder
        """
        params = make_params(CanvasParams, locals())
        node = Node(kind="canvas", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return self

    def download(self, *, url: str, additional_properties: AdditionalProperties = None) -> Download:
        """
        Add a new structure to the builder by downloading structure data from a URL.
        :param url: source of structure data
        :param additional_properties: optional, custom data to attach to this node
        :return: a builder that handles operations on the downloaded resource
        """
        params = make_params(DownloadParams, locals())
        node = Node(kind="download", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return Download(node=node, root=self._root)

    def primitives(self, *, additional_properties: AdditionalProperties = None) -> Primitives:
        """
        Allows the definition of a (group of) geometric primitives. You can add any number of primitives and then assign
        shared options (color, transparency etc.).
        :return: a builder for geometric primitives
        """
        node = Node(kind="primitives", additional_properties=additional_properties)
        self._add_child(node)
        return Primitives(node=node, root=self._root)


class Download(_Base):
    """
    Builder step with operations needed after downloading structure data.
    """

    def parse(self, *, format: ParseFormatT, additional_properties: AdditionalProperties = None) -> Parse:
        """
        Parse the content by specifying the file format.
        :param format: specify the format of your structure data
        :param additional_properties: optional, custom data to attach to this node
        :return: a builder that handles operations on the parsed content
        """
        params = make_params(ParseParams, locals())
        node = Node(kind="parse", params=params, additional_properties=additional_properties)
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
        additional_properties: AdditionalProperties = None,
    ) -> Structure:
        """
        Create a structure for the deposited coordinates.
        :param model_index: 0-based model index in case multiple NMR frames are present
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present
        :param block_header: Reference a specific mmCIF or SDF data block by its block header
        :param additional_properties: optional, custom data to attach to this node
        :return: a builder that handles operations at structure level
        """
        params = make_params(StructureParams, locals(), type="model")
        node = Node(kind="structure", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return Structure(node=node, root=self._root)

    def assembly_structure(
        self,
        *,
        assembly_id: str | None = None,
        model_index: int | None = None,
        block_index: int | None = None,
        block_header: str | None = None,
        additional_properties: AdditionalProperties = None,
    ) -> Structure:
        """
        Create an assembly structure.
        :param assembly_id: Use the name to specify which assembly to load
        :param model_index: 0-based model index in case multiple NMR frames are present
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present
        :param block_header: Reference a specific mmCIF or SDF data block by its block header
        :param additional_properties: optional, custom data to attach to this node
        :return: a builder that handles operations at structure level
        """
        params = make_params(StructureParams, locals(), type="assembly")
        node = Node(kind="structure", params=params, additional_properties=additional_properties)
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
        additional_properties: AdditionalProperties = None,
    ) -> Structure:
        """
        Create symmetry structure for a given range of Miller indices.
        :param ijk_min: Bottom-left Miller indices
        :param ijk_max: Top-right Miller indices
        :param model_index: 0-based model index in case multiple NMR frames are present
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present
        :param block_header: Reference a specific mmCIF or SDF data block by its block header
        :param additional_properties: optional, custom data to attach to this node
        :return: a builder that handles operations at structure level
        """
        params = make_params(StructureParams, locals(), type="symmetry")
        node = Node(kind="structure", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return Structure(node=node, root=self._root)

    def symmetry_mates_structure(
        self,
        *,
        radius: float | None = 5.0,
        model_index: int | None = None,
        block_index: int | None = None,
        block_header: str | None = None,
        additional_properties: AdditionalProperties = None,
    ) -> Structure:
        """
        Create structure of symmetry mates.
        :param radius: Radius of symmetry partners to include
        :param block_index: 0-based block index in case multiple mmCIF or SDF data blocks are present
        :param block_header: Reference a specific mmCIF or SDF data block by its block header
        :param additional_properties: optional, custom data to attach to this node
        :return: a builder that handles operations at structure level
        """
        params = make_params(StructureParams, locals(), type="symmetry_mates")
        node = Node(kind="structure", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return Structure(node=node, root=self._root)


class Structure(_Base):
    """
    Builder step with operations needed after defining the structure to work with.
    """

    def component(
        self,
        *,
        selector: ComponentSelectorT | ComponentExpression | list[ComponentExpression] = "all",
        additional_properties: AdditionalProperties = None,
    ) -> Component:
        """
        Define a new component/selection for the given structure.
        :param selector: a predefined component selector or one or more component selection expressions
        :param additional_properties: optional, custom data to attach to this node
        :return: a builder that handles operations at component level
        """
        params = make_params(ComponentInlineParams, locals())
        node = Node(kind="component", params=params, additional_properties=additional_properties)
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
        additional_properties: AdditionalProperties = None,
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
        :param additional_properties: optional, custom data to attach to this node
        :return: a builder that handles operations at component level
        """
        if isinstance(field_values, str):
            field_values = [field_values]
        params = make_params(ComponentFromUriParams, locals())
        node = Node(kind="component_from_uri", params=params, additional_properties=additional_properties)
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
        additional_properties: AdditionalProperties = None,
    ) -> Component:
        """
        Define a new component/selection for the given structure by using categories from the source file.
        :param category_name: only applies when format is 'cif' or 'bcif'
        :param field_name: name of the column in CIF or field name (key) in JSON that contains the desired value (color/label/tooltip/component...); the default value is 'color'/'label'/'tooltip'/'component' depending on the node kind
        :param block_header: only applies when format is 'cif' or 'bcif'
        :param block_index: only applies when format is 'cif' or 'bcif'
        :param schema: granularity/type of the selection
        :param field_values: create the component from rows that have any of these values in the field specified by `field_name`. If not provided, create the component from all rows.
        :param additional_properties: optional, custom data to attach to this node
        :return: a builder that handles operations at component level
        """
        if isinstance(field_values, str):
            field_values = [field_values]
        params = make_params(ComponentFromSourceParams, locals())
        node = Node(kind="component_from_source", params=params, additional_properties=additional_properties)
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
        additional_properties: AdditionalProperties = None,
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
        :param additional_properties: optional, custom data to attach to this node
        :return: this builder
        """
        params = make_params(LabelFromUriParams, locals())
        node = Node(kind="label_from_uri", params=params, additional_properties=additional_properties)
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
        additional_properties: AdditionalProperties = None,
    ) -> Structure:
        """
        Define a new label for the given structure by fetching additional data from the source file.
        :param category_name: only applies when format is 'cif' or 'bcif'
        :param field_name: name of the column in CIF or field name (key) in JSON that contains the desired value (color/label/tooltip/component...); the default value is 'color'/'label'/'tooltip'/'component' depending on the node kind
        :param block_header: only applies when format is 'cif' or 'bcif'
        :param block_index: only applies when format is 'cif' or 'bcif'
        :param schema: granularity/type of the selection
        :param additional_properties: optional, custom data to attach to this node
        :return: this builder
        """
        params = make_params(LabelFromSourceParams, locals())
        node = Node(kind="label_from_source", params=params, additional_properties=additional_properties)
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
        additional_properties: AdditionalProperties = None,
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
        :param additional_properties: optional, custom data to attach to this node
        :return: this builder
        """
        params = make_params(TooltipFromUriParams, locals())
        node = Node(kind="tooltip_from_uri", params=params, additional_properties=additional_properties)
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
        additional_properties: AdditionalProperties = None,
    ) -> Structure:
        """
        Define a new tooltip for the given structure by fetching additional data from the source file.
        :param category_name: only applies when format is 'cif' or 'bcif'
        :param field_name: name of the column in CIF or field name (key) in JSON that contains the desired value (color/label/tooltip/component...); the default value is 'color'/'label'/'tooltip'/'component' depending on the node kind
        :param block_header: only applies when format is 'cif' or 'bcif'
        :param block_index: only applies when format is 'cif' or 'bcif'
        :param schema: granularity/type of the selection
        :param additional_properties: optional, custom data to attach to this node
        :return: this builder
        """
        params = make_params(TooltipFromSourceParams, locals())
        node = Node(kind="tooltip_from_source", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return self

    def transform(
        self,
        *,
        rotation: Mat3[float] | None = None,
        translation: Vec3[float] | None = None,
        additional_properties: AdditionalProperties = None,
    ) -> Structure:
        """
        Transform a structure by applying a rotation matrix and/or translation vector.
        :param rotation: 9d vector describing the rotation, in column major (j * 3 + i indexing) format, this is equivalent to Fortran-order in numpy, to be multiplied from the left
        :param translation: 3d vector describing the translation
        :param additional_properties: optional, custom data to attach to this node
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
        node = Node(kind="transform", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return self

    @staticmethod
    def _is_rotation_matrix(t: Sequence[float], eps: float = 0.005):
        a00, a01, a02, a10, a11, a12, a20, a21, a22 = t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], t[8]

        det3x3 = math.fabs(
            a00 * (a11 * a22 - a12 * a21) - a01 * (a10 * a22 - a12 * a20) + a02 * (a10 * a21 - a11 * a20)
        )
        return math.isclose(det3x3, 1, abs_tol=eps)


class Component(_Base):
    """
    Builder step with operations relevant for a particular component.
    """

    def representation(
        self, *, type: RepresentationTypeT = "cartoon", additional_properties: AdditionalProperties = None
    ) -> Representation:
        """
        Add a representation for this component.
        :param type: the type of representation, defaults to 'cartoon'
        :param additional_properties: optional, custom data to attach to this node
        :return: a builder that handles operations at representation level
        """
        params = make_params(RepresentationParams, locals())
        node = Node(kind="representation", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return Representation(node=node, root=self._root)

    def label(self, *, text: str, additional_properties: AdditionalProperties = None) -> Component:
        """
        Add a text label to a component.
        :param text: label to add in 3D
        :param additional_properties: optional, custom data to attach to this node
        :return: this builder
        """
        params = make_params(LabelInlineParams, locals())
        node = Node(kind="label", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return self

    def tooltip(self, *, text: str, additional_properties: AdditionalProperties = None) -> Component:
        """
        Add a tooltip that shows additional information of a component when hovering over it.
        :param text: text to show upon hover
        :param additional_properties: optional, custom data to attach to this node
        :return: this builder
        """
        params = make_params(TooltipInlineParams, locals())
        node = Node(kind="tooltip", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return self

    def focus(
        self,
        *,
        direction: Vec3[float] | None = None,
        up: Vec3[float] | None = None,
        additional_properties: AdditionalProperties = None,
    ) -> Component:
        """
        Focus on this structure or component.
        :param direction: the direction from which to look at this component
        :param up: where is up relative to the view direction
        :param additional_properties: optional, custom data to attach to this node
        :return: this builder
        """
        params = make_params(FocusInlineParams, locals())
        node = Node(kind="focus", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return self

    # TODO: make representation customizable
    def apply_selection(
        self,
        *,
        surroundings_radius: float = 5.0,
        show_non_covalent_interactions: bool = True,
        additional_properties: AdditionalProperties = None,
    ) -> Component:
        """
        Show the surroundings of this component. Typically, you'll want to chain this with `#focus()`.
        :param surroundings_radius: distance threshold in Angstrom, everything below this cutoff will be included
        :param show_non_covalent_interactions: show non-covalent interactions between this component and its surroundings?
        :param additional_properties: optional, custom data to attach to this node
        :return: this builder
        """
        params = make_params(ApplySelectionInlineParams, locals())
        node = Node(kind="apply_selection", params=params, additional_properties=additional_properties)
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
        additional_properties: AdditionalProperties = None,
    ) -> Representation:
        """
        Use a custom category from the source file to define colors of this representation.
        :param schema: granularity/type of the selection
        :param category_name: only applies when format is 'cif' or 'bcif'
        :param field_name: name of the column in CIF or field name (key) in JSON that contains the desired value (color/label/tooltip/component...); the default value is 'color'/'label'/'tooltip'/'component' depending on the node kind
        :param block_header: only applies when format is 'cif' or 'bcif'
        :param block_index: only applies when format is 'cif' or 'bcif'
        :param additional_properties: optional, custom data to attach to this node
        :return: this builder
        """
        params = make_params(ColorFromSourceParams, locals())
        node = Node(kind="color_from_source", params=params, additional_properties=additional_properties)
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
        additional_properties: AdditionalProperties = None,
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
        :param additional_properties: optional, custom data to attach to this node
        :return: this builder
        """
        params = make_params(ColorFromUriParams, locals())
        node = Node(kind="color_from_uri", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return self

    def color(
        self,
        *,
        color: ColorT,
        selector: ComponentSelectorT | ComponentExpression | list[ComponentExpression] = "all",
        additional_properties: AdditionalProperties = None,
    ) -> Representation:
        """
        Customize the color of this representation.
        :param color: color using SVG color names or RGB hex code
        :param selector: optional selector, defaults to applying the color to the whole representation
        :param additional_properties: optional, custom data to attach to this node
        :return: this builder
        """
        params = make_params(ColorInlineParams, locals())
        node = Node(kind="color", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return self

    def transparency(
        self, *, transparency: float = 0.8, additional_properties: AdditionalProperties = None
    ) -> Representation:
        """
        Customize the transparency/opacity of this representation.
        :param transparency: float describing how transparent this representation should be, 0.0: fully opaque, 1.0: fully transparent
        :param additional_properties: optional, custom data to attach to this node
        :return: this builder
        """
        params = make_params(TransparencyInlineParams, locals())
        node = Node(kind="transparency", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return self


class Primitives(_Base):
    """
    A collection of primitives (such as spheres, lines, ...) that will be grouped together and can be customized using
    options.
    """

    def mesh(
        self,
        *,
        vertices: list[Vec3[float]],
        indices: list[Vec3[int]],
        colors: list[ColorT] | None = None,
        # TODO should everything support `rotation`, just for convenience & consistency?
        additional_properties: AdditionalProperties = None,
    ) -> Primitives:
        """
        Construct custom meshes/shapes in a low-level fashion by providing vertices and indices.
        :param vertices: collection of vertices
        :param indices: collection of indices
        :param colors: color value of each triangle
        :param additional_properties: optional, custom data to attach to this node
        :return: this builder
        """
        params = make_params(MeshInlineParams, locals())
        node = Node(kind="mesh", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return self

    # TODO mesh_from_uri, mesh_from_source

    def circle(
        self,
        *,
        center: PositionT,
        radius: float,
        segments: int | None = None,
        theta_start: float = 0,
        theta_length: float = math.pi * 2,
        rotation: Mat3[float] | None = None,
        additional_properties: AdditionalProperties = None,
    ) -> Primitives:
        """
        Add a circle.
        :param center: Center coordinates of this item
        :param radius: Radius of circle
        :param segments: Number of segments used to approximate a circle.
        :param theta_start: Start point position (relevant when this is an arc)
        :param theta_length: Values < PI*2 will result in an arc
        :param rotation: Optional: Control orientation of this item
        :param additional_properties: optional, custom data to attach to this node
        :return: the corresponding geometric primitive builder, allowing further customization
        """
        params = make_params(CircleParams, locals())
        node = Node(kind="circle", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return self

    def line(
        self,
        *,
        start: PositionT,
        end: PositionT,
        additional_properties: AdditionalProperties = None,
    ) -> Primitives:
        # TODO doc & impl
        return self

    def plane(
        self,
        *,
        point: PositionT,
        normal: PositionT,
        additional_properties: AdditionalProperties = None,
    ) -> Primitives:
        """
        Add a plane.
        :param point: Coordinates on plane.
        :param normal: Normal vector of plane.
        :param additional_properties: optional, custom data to attach to this node
        :return: the corresponding geometric primitive builder, allowing further customization
        """
        params = make_params(PlaneParams, locals())
        node = Node(kind="plane", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return self

    def polygon(
        self,
        *,
        vertices: list[PositionT],
        additional_properties: AdditionalProperties = None,
    ) -> Primitives:
        # TODO doc & impl
        return self

    def star(
        self,
        *,
        center: PositionT,
        inner_radius: float,
        outer_radius: float,
        point_count: int,
        rotation: Mat3[float] | None = None,
        additional_properties: AdditionalProperties = None,
    ) -> Primitives:
        # TODO doc & impl
        return self

    def box(
        self,
        *,
        center: PositionT,
        width: float,
        height: float,
        depth: float,
        rotation: Mat3[float] | None = None,
        additional_properties: AdditionalProperties = None,
    ) -> Primitives:
        # TODO doc & impl
        return self

    def cylinder(
        self,
        *,
        center: PositionT,
        radius_top: float,
        radius_bottom: float,
        height: float,
        theta_start: float = 0,
        theta_length: float = math.pi * 2,
        rotation: Mat3[float] | None = None,
        additional_properties: AdditionalProperties = None,
    ) -> Primitives:
        # TODO doc & impl
        return self

    def polyhedron(
        self,
        *,
        vertices: list[Vec3[float]],
        indices: list[Vec3[float]],
        additional_properties: AdditionalProperties = None,
    ) -> Primitives:
        # TODO doc & impl
        return self

    def tetrahedron(
        self,
        *,
        center: PositionT,
        radius: float,
        rotation: Mat3[float] | None = None,
        additional_properties: AdditionalProperties = None,
    ) -> Primitives:
        # TODO doc & impl
        return self

    def octahedron(
        self,
        *,
        center: PositionT,
        radius: float,
        rotation: Mat3[float] | None = None,
        additional_properties: AdditionalProperties = None,
    ) -> Primitives:
        # TODO doc & impl
        return self

    def dodecahedron(
        self,
        *,
        center: PositionT,
        radius: float,
        rotation: Mat3[float] | None = None,
        additional_properties: AdditionalProperties = None,
    ) -> Primitives:
        # TODO doc & impl
        return self

    def icosahedron(
        self,
        *,
        center: PositionT,
        radius: float,
        rotation: Mat3[float] | None = None,
        additional_properties: AdditionalProperties = None,
    ) -> Primitives:
        # TODO doc & impl
        return self

    def prism(
        self,
        *,
        position: PositionT,
        base_point_count: int = 3,
        height: float,
        rotation: Mat3[float] | None = None,
        additional_properties: AdditionalProperties = None,
    ) -> Primitives:
        # TODO doc & impl
        return self

    def pyramid(
        self,
        *,
        points: list[Vec3[float]],
        additional_properties: AdditionalProperties = None,
    ) -> Primitives:
        # TODO doc & impl
        return self

    def sphere(
        self,
        *,
        center: PositionT,
        radius: float,
        additional_properties: AdditionalProperties = None,
    ) -> Primitives:
        # TODO doc & impl
        return self

    def torus(
        self,
        *,
        center: PositionT,
        outer_radius: float,
        tube_radius: float,
        theta_start: float = 0,
        theta_length: float = math.pi * 2,
        rotation: Mat3[float] | None = None,
        additional_properties: AdditionalProperties = None,
    ) -> Primitives:
        # TODO doc & impl
        return self

    def wedge(
        self,
        *,
        center: PositionT,
        width: float,
        height: float,
        depth: float,
        rotation: Mat3[float] | None = None,
        additional_properties: AdditionalProperties = None,
    ) -> Primitives:
        # TODO doc & impl
        return self

    def options(self, *, additional_properties: AdditionalProperties = None) -> PrimitiveOptions:
        """
        Finish adding items to this primitive group and move on to setting its options.
        :param additional_properties: optional, custom data to attach to this node
        :return: the corresponding options builder, allowing further customization
        """
        node = Node(kind="options", additional_properties=additional_properties)
        self._add_child(node)
        return PrimitiveOptions(node=node, root=self._root)


class PrimitiveOptions(_Base):
    """
    Shared customizations that are applicable to all geometric primitives.
    """

    def color(
        self,
        *,
        color: ColorT,
        additional_properties: AdditionalProperties = None,
    ) -> PrimitiveOptions:
        """
        Customize the color of this representation.
        :param color: color using SVG color names or RGB hex code
        :param additional_properties: optional, custom data to attach to this node
        :return: this builder
        """
        params = make_params(ColorInlineParams, locals())
        node = Node(kind="color", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return self

    def transparency(
        self, *, transparency: float = 0.8, additional_properties: AdditionalProperties = None
    ) -> PrimitiveOptions:
        """
        Customize the transparency/opacity of this representation.
        :param transparency: float describing how transparent this representation should be, 0.0: fully opaque, 1.0: fully transparent
        :param additional_properties: optional, custom data to attach to this node
        :return: this builder
        """
        params = make_params(TransparencyInlineParams, locals())
        node = Node(kind="transparency", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return self

    def label(self, *, text: str, additional_properties: AdditionalProperties = None) -> PrimitiveOptions:
        """
        Add a text label to a geometric primitive.
        :param text: label to add in 3D
        :param additional_properties: optional, custom data to attach to this node
        :return: this builder
        """
        params = make_params(LabelInlineParams, locals())
        node = Node(kind="label", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return self

    def tooltip(self, *, text: str, additional_properties: AdditionalProperties = None) -> PrimitiveOptions:
        """
        Add a tooltip that shows additional information of a geometric primitive when hovering over it.
        :param text: text to show upon hover
        :param additional_properties: optional, custom data to attach to this node
        :return: this builder
        """
        params = make_params(TooltipInlineParams, locals())
        node = Node(kind="tooltip", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return self

    def focus(
        self,
        *,
        direction: Vec3[float] | None = None,
        up: Vec3[float] | None = None,
        additional_properties: AdditionalProperties = None,
    ) -> PrimitiveOptions:
        """
        Focus on this geometric primitive.
        :param direction: the direction from which to look at this primitive
        :param up: where is up relative to the view direction
        :param additional_properties: optional, custom data to attach to this node
        :return: this builder
        """
        params = make_params(FocusInlineParams, locals())
        node = Node(kind="focus", params=params, additional_properties=additional_properties)
        self._add_child(node)
        return self
