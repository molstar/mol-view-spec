from __future__ import annotations

from typing import Any, Literal, Mapping, Optional, Union

from pydantic import BaseModel, Field

from .params_utils import Params

KindT = Literal[
    "root",
    "camera",
    "canvas",
    "color",
    "color_from_source",
    "color_from_uri",
    "component",
    "component_from_source",
    "component_from_uri",
    "download",
    "focus",
    "generic_visuals",
    "label",
    "label_from_source",
    "label_from_uri",
    "line",
    "parse",
    "representation",
    "sphere",
    "structure",
    "tooltip",
    "tooltip_from_source",
    "tooltip_from_uri",
    "transform",
]


class Node(BaseModel):
    kind: KindT = Field(description="The type of this node.")
    params: Optional[Mapping[str, Any]] = Field(description="Optional params that are needed for this node.")
    children: Optional[list[Node]] = Field(description="Optional collection of nested child nodes.")


class Metadata(BaseModel):
    version: str = Field(description="Version of the spec used to write this tree.")
    title: Optional[str] = Field(description="Name of this view.")
    description: Optional[str] = Field(description="Detailed description of this view.")
    timestamp: str = Field(description="Timestamp when this view was exported.")


class State(BaseModel):
    root: Node = Field(description="Root of the node tree.")
    metadata: Metadata = Field(description="Associated metadata.")


class DownloadParams(Params):
    url: str = Field(description="URL from which to pull structure data.")


ParseFormatT = Literal["mmcif", "bcif", "pdb"]


class ParseParams(Params):
    format: ParseFormatT = Field(description="The format of the structure data.")


StructureKindT = Literal["model", "assembly", "symmetry", "symmetry_mates"]


class StructureParams(Params):
    kind: StructureKindT
    assembly_id: Optional[str] = Field(description="Use the name to specify which assembly to load")
    assembly_index: Optional[int] = Field(description="0-based assembly index, use this to load the 1st assembly")
    model_index: Optional[int] = Field(description="0-based model index in case multiple NMR frames are present")
    block_index: Optional[int] = Field(
        description="0-based block index in case multiple mmCIF or SDF data blocks are " "present"
    )
    block_header: Optional[str] = Field(description="Reference a specific mmCIF or SDF data block by its block header")
    radius: Optional[float] = Field(description="Radius around model coordinates when loading symmetry mates")
    ijk_min: Optional[tuple[int, int, int]] = Field(description="Bottom-left Miller indices")
    ijk_max: Optional[tuple[int, int, int]] = Field(description="Top-right Miller indices")


ComponentSelectorT = Literal["all", "polymer", "protein", "nucleic", "branched", "ligand", "ion", "water"]


class ComponentExpression(BaseModel):  # Feel free to rename (this used to be InlineSchemaParams)
    label_entity_id: Optional[str]
    label_asym_id: Optional[str]
    auth_asym_id: Optional[str]
    label_seq_id: Optional[int]
    auth_seq_id: Optional[int]
    pdbx_PDB_ins_code: Optional[str]
    beg_label_seq_id: Optional[int] = Field(
        "Defines a consecutive range of residues when combined with " "`end_label_seq_id`."
    )
    end_label_seq_id: Optional[int] = Field(
        "Defines a consecutive range of residues when combined with " "`beg_label_seq_id`. End indices are inclusive."
    )
    beg_auth_seq_id: Optional[int] = Field(
        "Defines a consecutive range of residues when combined with " "`end_auth_seq_id`."
    )
    end_auth_seq_id: Optional[int] = Field(
        "Defines a consecutive range of residues when combined with " "`beg_auth_seq_id`. End indices are inclusive."
    )
    residue_index: Optional[int] = Field("0-based residue index in the source file")
    label_atom_id: Optional[int] = Field("Atom name like 'CA', 'N', 'O' (`_atom_site.label_atom_id`)")
    auth_atom_id: Optional[int] = Field("Atom name like 'CA', 'N', 'O' (`_atom_site.auth_atom_id`)")
    type_symbol: Optional[str] = Field("Element symbol like 'H', 'HE', 'LI', 'BE' (`_atom_site.type_symbol`)")
    atom_id: Optional[int] = Field("Unique atom identifier (`_atom_site.id`)")
    atom_index: Optional[int] = Field("0-based atom index in the source file")


RepresentationTypeT = Literal["ball_and_stick", "cartoon", "surface"]
ColorNamesT = Literal["white", "gray", "black", "red", "orange", "yellow", "green", "cyan", "blue", "magenta"]
ColorT = Union[ColorNamesT, str]  # str represents hex colors for now


class RepresentationParams(Params):
    type: RepresentationTypeT


SchemaT = Literal[
    "whole_structure",
    "entity",
    "chain",
    "auth_chain",
    "residue",
    "auth_residue",
    "residue_range",
    "auth_residue_range",
    "atom",
    "auth_atom",
    "all_atomic",
]
SchemaFormatT = Literal["cif", "bcif", "json"]


class _DataFromUriParams(Params):
    uri: str
    format: SchemaFormatT
    category_name: Optional[str] = Field(description="Only applies when format is 'cif' or 'bcif'")
    field_name: Optional[str] = Field(
        description="Name of the column in CIF or field name (key) in JSON that "
        "contains the desired value (color/label/tooltip/component...); the "
        "default value is 'color'/'label'/'tooltip'/'component' depending "
        "on the node type"
    )
    block_header: Optional[str] = Field(description="Only applies when format is 'cif' or 'bcif'")
    block_index: Optional[int] = Field(description="Only applies when format is 'cif' or 'bcif'")
    schema_: SchemaT


class _DataFromSourceParams(Params):
    category_name: str
    field_name: Optional[str] = Field(
        description="Name of the column in CIF that contains the desired value ("
        "color/label/tooltip/component...); the default value is "
        "'color'/'label'/'tooltip'/'component' depending on the node type"
    )
    block_header: Optional[str]
    block_index: Optional[int]
    schema_: SchemaT


class ComponentInlineParams(Params):
    selector: ComponentSelectorT | ComponentExpression | list[ComponentExpression]


class ComponentFromUriParams(_DataFromUriParams):
    field_values: Optional[list[str]] = Field(
        description="Create the component from rows that have any of these "
        "values in the field specified by `field_name`. If not "
        "provided, create the component from all rows."
    )


class ComponentFromSourceParams(_DataFromSourceParams):
    field_values: Optional[list[str]] = Field(
        description="Create the component from rows that have any of these "
        "values in the field specified by `field_name`. If not "
        "provided, create the component from all rows."
    )


class ColorInlineParams(ComponentInlineParams):
    color: ColorT


class ColorFromUriParams(_DataFromUriParams):
    pass


class ColorFromSourceParams(_DataFromSourceParams):
    pass


class LabelInlineParams(Params):
    text: str
    # schema and other stuff not needed here, the label will be applied on the whole parent Structure or Component


class LabelFromUriParams(_DataFromUriParams):
    pass


class LabelFromSourceParams(_DataFromSourceParams):
    pass


class TooltipInlineParams(Params):
    text: str
    # schema and other stuff not needed here, the tooltip will be applied on the whole parent Structure or Component


class TooltipFromUriParams(_DataFromUriParams):
    pass


class TooltipFromSourceParams(_DataFromSourceParams):
    pass


class FocusInlineParams(Params):
    direction: Optional[tuple[float, float, float]] = Field(
        description="Direction of the view (vector position -> " "target)"
    )
    up: Optional[tuple[float, float, float]] = Field(
        description="Controls the rotation around the vector between " "target and position"
    )


class TransformParams(Params):
    rotation: Optional[tuple[float, ...]] = Field(
        description="In a column major (j * 3 + i indexing) format, this is "
        "equivalent to Fortran-order in numpy, to be multiplied"
        " from the left"
    )
    translation: Optional[tuple[float, float, float]]


class CameraParams(Params):
    target: tuple[float, float, float] = Field(description="What to look at")
    position: tuple[float, float, float] = Field(description="The position of the camera")
    up: Optional[tuple[float, float, float]] = Field(
        description="Controls the rotation around the vector between " "target and position"
    )


class CanvasParams(Params):
    background_color: ColorT


class SphereParams(Params):
    position: tuple[float, float, float]
    radius: float
    color: ColorT
    label: Optional[str]
    tooltip: Optional[str]


class LineParams(Params):
    position1: tuple[float, float, float]
    position2: tuple[float, float, float]
    radius: float
    color: ColorT
    label: Optional[str]
    tooltip: Optional[str]
