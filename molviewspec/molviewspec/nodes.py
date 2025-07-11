"""
Definitions of all 'nodes' used by the MolViewSpec format specification and its builder implementation.
"""

from __future__ import annotations

import io
import json
import os
import urllib
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime, timezone
from typing import Any, Literal, Mapping, Optional, Type, TypeVar, cast
from uuid import uuid4

from pydantic import BaseModel, Field

from molviewspec.utils import get_major_version_tag, get_model_fields

KindT = Literal[
    "root",
    "camera",
    "canvas",
    "clip",
    "color",
    "color_from_source",
    "color_from_uri",
    "component",
    "component_from_source",
    "component_from_uri",
    "download",
    "focus",
    "label",
    "label_from_source",
    "label_from_uri",
    "mesh_from_source",
    "mesh_from_uri",
    "opacity",
    "parse",
    "primitives",
    "primitives_from_uri",
    "primitive",
    "representation",
    "structure",
    "tooltip",
    "tooltip_from_source",
    "tooltip_from_uri",
    "transform",
    "volume",
    "volume_representation",
]


CustomT = Optional[Mapping[str, Any]]
RefT = Optional[str]


class Node(BaseModel):
    """
    Base impl of all state tree nodes.
    """

    kind: KindT = Field(description="The type of this node.")
    params: Optional[Mapping[str, Any]] = Field(None, description="Optional params that are needed for this node.")
    children: Optional[list[Node]] = Field(None, description="Optional collection of nested child nodes.")
    custom: CustomT = Field(None, description="Custom data to store attached to this node.")
    ref: RefT = Field(None, description="Optional reference that can be used to access this node.")

    def find_ref(self, ref: str) -> Node | None:
        """
        Find a child node by reference.
        :param parent: parent node
        :param ref: reference to find
        :return: child node or None
        """
        if self.ref == ref:
            return self

        if self.children is None:
            return None

        for child in self.children:
            found = child.find_ref(ref)
            if found is not None:
                return found

        return None

    def __init__(self, **data):
        # extract `custom` value from `params`
        params = data.get("params", {})
        if "custom" in params:
            data["custom"] = params.pop("custom")
        if "ref" in params:
            data["ref"] = params.pop("ref")

        super().__init__(**data)


DescriptionFormatT = Literal["markdown", "plaintext"]


def generate_uuid():
    return str(uuid4())


def get_timestamp() -> str:
    """Return timestamp with current UTC time"""
    return datetime.now(timezone.utc).isoformat()


class GlobalMetadata(BaseModel):
    """
    Top-level metadata for a MVS file (single-state or multi-state).
    """

    title: Optional[str] = Field(None, description="Name of this view(s).")
    description: Optional[str] = Field(None, description="Detailed description of this view(s).")
    description_format: Optional[DescriptionFormatT] = Field(
        None, description="Format of `description`. Default is 'markdown'."
    )
    timestamp: str = Field(
        description="Timestamp when this file was exported.",
        default_factory=get_timestamp,
    )
    version: str = Field(
        description="Version of MolViewSpec used to write this file.",
        default_factory=get_major_version_tag,
    )


class SnapshotMetadata(BaseModel):
    """
    Metadata for an individual snapshot.
    """

    title: Optional[str] = Field(None, description="Name of this snapshot.")
    description: Optional[str] = Field(None, description="Detailed description of this snapshot.")
    description_format: Optional[DescriptionFormatT] = Field(
        None, description="Format of `description`. Default is 'markdown'."
    )
    key: Optional[str] = Field(
        default_factory=generate_uuid,  # TODO remove this, it's probably superfluous
        description="Unique identifier of this state, useful when working with collections of states.",
    )
    linger_duration_ms: int = Field(description="Timespan for snapshot.")
    transition_duration_ms: Optional[int] = Field(
        None, description="Timespan for the animation to the next snapshot. Leave empty to skip animations."
    )

    def __init__(self, **data):
        super().__init__(**data)
        if self.key is None:
            self.key = generate_uuid()


StateTreeT = Literal["single", "multiple"]
"""Type of a state description, either 'single' (individual state) or 'multiple' (ordered collection of multiple states aka snapshots)."""


class MolstarWidgetsMixin:
    def molstar_notebook(
        self,
        data: dict[str, bytes] | None = None,
        width: int | str = 950,
        height: int | str = 600,
        download_filename: str = "molstar_download",
        ui: Literal["viewer", "stories"] = "viewer",
        molstar_version: str = "latest",
    ):
        """
        Visualize the current state as a Molstar HTML component for Jupyter or Google Colab.

        :param data: optional, create MVSX archive with additional file contents to include (filename -> file contents)
        :param width: width of the Molstar viewer (default: 950)
        :param height: height of the Molstar viewer (default: 600)
        :param download_filename: filename for the Molstar HTML file (default: "molstar_download")
        :param ui: UI type to use, either "viewer" or "stories"
        :param molstar_version: version of Mol* to use
        """
        from molviewspec.molstar_widgets import molstar_notebook

        molstar_notebook(
            state=self,  # type: ignore
            data=data,
            width=width,
            height=height,
            download_filename=download_filename,
            ui=ui,
            molstar_version=molstar_version,
        )

    def molstar_streamlit(
        self,
        data: dict[str, bytes] | None = None,
        width: int | None = None,
        height: int | None = 500,
        ui: Literal["viewer", "stories"] = "viewer",
        molstar_version: str = "latest",
    ):
        """
        Show Mol* viewer in a Streamlit app.

        :param data: optional, create MVSX archive with additional file contents to include (filename -> file contents)
        :param width: width of the Molstar viewer (default: full width)
        :param height: height of the Molstar viewer (default: 500)
        :param ui: UI type to use, either "viewer" or "stories"
        :param molstar_version: version of Mol* to use
        """
        from molviewspec.molstar_widgets import molstar_streamlit

        return molstar_streamlit(
            self,  # type: ignore
            data=data,
            width=width,
            height=height,
            ui=ui,
            molstar_version=molstar_version,
        )

    def molstar_html(
        self,
        data: dict[str, bytes] | None = None,
        ui: Literal["viewer", "stories"] = "viewer",
        molstar_version: str = "latest",
    ):
        """
        Generate HTML with the state embedded and shown in the Mol* viewer

        :param data: optional, create MVSX archive with additional file contents to include (filename -> file contents)
        :param ui: UI type to use, either "viewer" or "stories"
        :param molstar_version: version of Mol* to use
        """
        from molviewspec.molstar_widgets import molstar_html

        return molstar_html(
            self,  # type: ignore
            data=data,
            ui=ui,
            molstar_version=molstar_version,
        )

    def _ipython_display_(self):
        """
        Display the current state as a Molstar HTML component for Jupyter or Google Colab.
        """
        self.molstar_notebook()


class State(BaseModel, MolstarWidgetsMixin):
    """
    Root node of a single state tree with metadata.
    """

    kind: StateTreeT = Field(
        default="single",
        description="Specifies whether this is an individual state or a collection of states.",
    )
    root: Node = Field(description="Root of the node tree.")
    metadata: GlobalMetadata = Field(description="Associated metadata.")

    def to_dict(self) -> dict:
        """
        Convert to a dictionary representation.
        """

        if hasattr(self, "model_dump"):
            return self.model_dump(exclude_none=True)
        else:
            return self.dict(exclude_none=True)

    def dumps(self, *, indent: int | None = 2) -> str:
        """
        Serialize the data to a JSON string.
        """

        if hasattr(self, "model_dump_json"):
            return self.model_dump_json(exclude_none=True, indent=indent)
        else:
            return self.json(exclude_none=True, indent=indent)

    def _ipython_display_(self):
        """
        Display the current state as a Molstar HTML component for Jupyter or Google Colab.
        """
        from molviewspec.molstar_widgets import molstar_notebook

        molstar_notebook(self)


class Snapshot(BaseModel):
    """
    Root node of an individual state tree (snapshot) within a collection of snapshots (`States`).
    """

    root: Node = Field(description="Root of the node tree.")
    metadata: SnapshotMetadata = Field(description="Associated metadata.")


class States(BaseModel, MolstarWidgetsMixin):
    """
    Root node of state descriptions that encompass multiple distinct state trees (snapshots).
    """

    kind: StateTreeT = Field(
        default="multiple",
        description="Specifies whether this is an individual state or a collection of states.",
    )
    metadata: GlobalMetadata = Field(description="Associated metadata.")
    snapshots: list[Snapshot] = Field(description="Ordered collection of individual states.")
    # TODO add ordered collection that describes transition/interpolation wrt previous state

    def to_dict(self) -> dict:
        """
        Convert to a dictionary representation.
        """

        if hasattr(self, "model_dump"):
            return self.model_dump(exclude_none=True)
        else:
            return self.dict(exclude_none=True)

    def dumps(self, *, indent: int | None = 2) -> str:
        """
        Serialize the data to a JSON string.
        """

        if hasattr(self, "model_dump_json"):
            return self.model_dump_json(exclude_none=True, indent=indent)
        else:
            return self.json(exclude_none=True, indent=indent)


MVSData = State | States
"""Flavors of MolViewSpec states."""


class MVSJ(BaseModel, MolstarWidgetsMixin):
    data: MVSData = Field(description="The data to be serialized.")

    def dump(self, filename: str | os.PathLike, *, indent: int | None = None) -> None:
        """
        Write the serialized data to a file.
        """

        if hasattr(self.data, "model_dump_json"):
            state = self.data.model_dump_json(exclude_none=True, indent=indent)
        else:
            state = self.data.json(exclude_none=True, indent=indent)

        with open(filename, "w") as out:
            out.write(state)

    def dumps(self, *, indent: int | None = 2) -> str:
        """
        Serialize the data to a JSON string.
        """

        if hasattr(self.data, "model_dump_json"):
            return self.data.model_dump_json(exclude_none=True, indent=indent)
        else:
            return self.data.json(exclude_none=True, indent=indent)

    def find_ref(self, ref: str) -> Node | None:
        """
        Find a child node by reference.
        :param ref: reference to find
        :return: child node or None
        """
        if isinstance(self.data, State):
            return self.data.root.find_ref(ref)

        raise RuntimeError("Cannot find ref in MVSJ with multiple states")

    @staticmethod
    def loads(data: str | dict) -> MVSJ:
        """
        Deserialize a JSON string or a dict to a MVSJ object.
        """

        if isinstance(data, str):
            data = json.loads(data)

        return MVSJ(data=data)

    @staticmethod
    def load(filename: str | os.PathLike, encoding: str = "utf-8") -> MVSJ:
        """
        Load MVSJ object from a file.
        """

        with open(filename, mode="r", encoding="utf-8") as f:
            data = f.read()

        return MVSJ.loads(data)


class MVSX(BaseModel, MolstarWidgetsMixin):
    data: MVSData = Field(description="The data to be serialized.")
    assets: dict[str, bytes | str | os.PathLike] = Field(
        {},
        description="Assets to be serialized with the data. Can be a file path, URL, or raw bytes. Files and URLs will be automatically synchronouly copied into the archive during serialization.",
    )

    def _serialize(self, z: zipfile.ZipFile) -> None:
        """
        Serialize the data a zip zip file.
        """

        # pydantic v1 compatibility
        if hasattr(self.data, "model_dump_json"):
            state = self.data.model_dump_json(exclude_none=True)
        else:
            state = self.data.json(exclude_none=True)

        z.writestr("index.mvsj", state.encode("utf-8"))

        for asset_name, data in self.assets.items():
            # check for bytes
            if isinstance(data, bytes):
                z.writestr(asset_name, data)
                continue

            # check for URL
            try:
                parsed_url = urllib.parse.urlparse(data)  # type: ignore
            except Exception:
                parsed_url = None

            if parsed_url and parsed_url.scheme in ("http", "https", "ftp"):
                with io.BytesIO() as urlbytes:
                    with urllib.request.urlopen(data) as req:  # type: ignore
                        urlbytes.write(req.read())
                    urlbytes.flush()
                    z.writestr(asset_name, urlbytes.getvalue())
                continue

            # assume file path
            z.write(data, arcname=asset_name)

    def dump(self, filename: str | os.PathLike) -> None:
        """
        Write the serialized data to a file.
        """

        with open(filename, "wb") as f:
            with zipfile.ZipFile(f, "w") as z:
                self._serialize(z)

    def dumps(self) -> bytes:
        """
        Serialize the data to a bytes object.
        """

        with io.BytesIO() as f:
            with zipfile.ZipFile(f, "w") as z:
                self._serialize(z)
            f.flush()
            ret = f.getvalue()

        return ret


class DownloadParams(BaseModel):
    """
    Download node, describing where structure data should be fetched from.
    """

    url: str = Field(description="URL from which to pull structure data.")


ParseFormatT = Literal["mmcif", "bcif", "pdb", "map"]


class ParseParams(BaseModel):
    """
    Parse node, describing how to parse downloaded data.
    """

    format: ParseFormatT = Field(description="The format of the structure data.")


StructureTypeT = Literal["model", "assembly", "symmetry", "symmetry_mates"]


ScalarT = TypeVar("ScalarT", int, float)
Vec3 = tuple[ScalarT, ScalarT, ScalarT]
Mat3 = tuple[ScalarT, ScalarT, ScalarT, ScalarT, ScalarT, ScalarT, ScalarT, ScalarT, ScalarT]
Mat4 = tuple[
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
    ScalarT,
]


class StructureParams(BaseModel):
    """
    Structure node, describing which type (assembly 1, deposited coordinates, etc.) of the parsed data to create.
    """

    type: StructureTypeT = Field(description="How to interpret the loaded data")
    assembly_id: Optional[str] = Field(None, description="Use the name to specify which assembly to load")
    assembly_index: Optional[int] = Field(None, description="0-based assembly index, use this to load the 1st assembly")
    model_index: Optional[int] = Field(None, description="0-based model index in case multiple NMR frames are present")
    block_index: Optional[int] = Field(
        None, description="0-based block index in case multiple mmCIF or SDF data blocks are " "present"
    )
    block_header: Optional[str] = Field(
        None, description="Reference a specific mmCIF or SDF data block by its block header"
    )
    radius: Optional[float] = Field(None, description="Radius around model coordinates when loading symmetry mates")
    ijk_min: Optional[Vec3[int]] = Field(None, description="Bottom-left Miller indices")
    ijk_max: Optional[Vec3[int]] = Field(None, description="Top-right Miller indices")


class VolumeParams(BaseModel):
    """
    Volume node, describing how to load and render volumetric data.
    """

    channel_id: Optional[str] = Field(None, description="ID of the channel to load from the source data.")


ComponentSelectorT = Literal["all", "polymer", "protein", "nucleic", "branched", "ligand", "ion", "water", "coarse"]


class ComponentExpression(BaseModel):
    """
    Component expressions are used to make selections.
    """

    label_entity_id: Optional[str] = Field(None, description="Select an entity by its identifier")
    label_asym_id: Optional[str] = Field(
        None, description="Select a chain using its standard, programmatically-assigned identifier"
    )
    auth_asym_id: Optional[str] = Field(None, description="Select a chain using its legacy, author-assigned identifier")
    label_seq_id: Optional[int] = Field(
        None, description="Select a residue by its standard, programmatically-assigned sequence position"
    )
    auth_seq_id: Optional[int] = Field(
        None, description="Select a residue by its legacy, author-assigned sequence position"
    )
    label_comp_id: Optional[str] = Field(None, description="Select a residue by its name")
    auth_comp_id: Optional[str] = Field(None, description="Select a residue by its legacy, author-assigned name")
    pdbx_PDB_ins_code: Optional[str] = Field(
        None, description="Optional legacy insertion code, only relevant for `auth_seq_id`"
    )
    beg_label_seq_id: Optional[int] = Field(
        None, description="Defines a consecutive range of residues when combined with `end_label_seq_id`."
    )
    end_label_seq_id: Optional[int] = Field(
        None,
        description="Defines a consecutive range of residues when combined with `beg_label_seq_id`. End indices are inclusive.",
    )
    beg_auth_seq_id: Optional[int] = Field(
        None, description="Defines a consecutive range of residues when combined with `end_auth_seq_id`."
    )
    end_auth_seq_id: Optional[int] = Field(
        None,
        description="Defines a consecutive range of residues when combined with `beg_auth_seq_id`. End indices are inclusive.",
    )
    residue_index: Optional[int] = Field(None, description="0-based residue index in the source file")
    label_atom_id: Optional[str] = Field(None, description="Atom name like 'CA', 'N', 'O' (`_atom_site.label_atom_id`)")
    auth_atom_id: Optional[str] = Field(None, description="Atom name like 'CA', 'N', 'O' (`_atom_site.auth_atom_id`)")
    type_symbol: Optional[str] = Field(
        None, description="Element symbol like 'H', 'HE', 'LI', 'BE' (`_atom_site.type_symbol`)"
    )
    atom_id: Optional[int] = Field(None, description="Unique atom identifier (`_atom_site.id`)")
    atom_index: Optional[int] = Field(None, description="0-based atom index in the source file")


RepresentationTypeT = Literal["ball_and_stick", "spacefill", "cartoon", "surface", "isosurface", "carbohydrate"]
VolumeRepresentationTypeT = Literal["isosurface", "grid-slice"]
ColorNamesT = Literal[
    "aliceblue",
    "antiquewhite",
    "aqua",
    "aquamarine",
    "azure",
    "beige",
    "bisque",
    "black",
    "blanchedalmond",
    "blue",
    "blueviolet",
    "brown",
    "burlywood",
    "cadetblue",
    "chartreuse",
    "chocolate",
    "coral",
    "cornflowerblue",
    "cornsilk",
    "crimson",
    "cyan",
    "darkblue",
    "darkcyan",
    "darkgoldenrod",
    "darkgray",
    "darkgreen",
    "darkgrey",
    "darkkhaki",
    "darkmagenta",
    "darkolivegreen",
    "darkorange",
    "darkorchid",
    "darkred",
    "darksalmon",
    "darkseagreen",
    "darkslateblue",
    "darkslategray",
    "darkslategrey",
    "darkturquoise",
    "darkviolet",
    "deeppink",
    "deepskyblue",
    "dimgray",
    "dimgrey",
    "dodgerblue",
    "firebrick",
    "floralwhite",
    "forestgreen",
    "fuchsia",
    "gainsboro",
    "ghostwhite",
    "gold",
    "goldenrod",
    "gray",
    "green",
    "greenyellow",
    "grey",
    "honeydew",
    "hotpink",
    "indianred",
    "indigo",
    "ivory",
    "khaki",
    "lavender",
    "lavenderblush",
    "lawngreen",
    "lemonchiffon",
    "lightblue",
    "lightcoral",
    "lightcyan",
    "lightgoldenrodyellow",
    "lightgray",
    "lightgreen",
    "lightgrey",
    "lightpink",
    "lightsalmon",
    "lightseagreen",
    "lightskyblue",
    "lightslategray",
    "lightslategrey",
    "lightsteelblue",
    "lightyellow",
    "lime",
    "limegreen",
    "linen",
    "magenta",
    "maroon",
    "mediumaquamarine",
    "mediumblue",
    "mediumorchid",
    "mediumpurple",
    "mediumseagreen",
    "mediumslateblue",
    "mediumspringgreen",
    "mediumturquoise",
    "mediumvioletred",
    "midnightblue",
    "mintcream",
    "mistyrose",
    "moccasin",
    "navajowhite",
    "navy",
    "oldlace",
    "olive",
    "olivedrab",
    "orange",
    "orangered",
    "orchid",
    "palegoldenrod",
    "palegreen",
    "paleturquoise",
    "palevioletred",
    "papayawhip",
    "peachpuff",
    "peru",
    "pink",
    "plum",
    "powderblue",
    "purple",
    "red",
    "rosybrown",
    "royalblue",
    "saddlebrown",
    "salmon",
    "sandybrown",
    "seagreen",
    "seashell",
    "sienna",
    "silver",
    "skyblue",
    "slateblue",
    "slategray",
    "slategrey",
    "snow",
    "springgreen",
    "steelblue",
    "tan",
    "teal",
    "thistle",
    "tomato",
    "turquoise",
    "violet",
    "wheat",
    "white",
    "whitesmoke",
    "yellow",
    "yellowgreen",
]
HexColorT = str  # hexadecimal color code, e.g. '#f0f0f0'; str represents hex colors for now
ColorT = ColorNamesT | HexColorT

ColorListNameT = Literal[
    # Color lists from https://observablehq.com/@d3/color-schemes (definitions: https://colorbrewer2.org/export/colorbrewer.js)
    # Sequential single-hue
    "Reds",
    "Oranges",
    "Greens",
    "Blues",
    "Purples",
    "Greys",
    # Sequential multi-hue
    "OrRd",
    "BuGn",
    "PuBuGn",
    "GnBu",
    "PuBu",
    "BuPu",
    "RdPu",
    "PuRd",
    "YlOrRd",
    "YlOrBr",
    "YlGn",
    "YlGnBu",
    "Magma",
    "Inferno",
    "Plasma",
    "Viridis",
    "Cividis",
    "Turbo",
    "Warm",
    "Cool",
    "CubehelixDefault",
    # Cyclical
    "Rainbow",
    "Sinebow",
    # Diverging
    "RdBu",
    "RdGy",
    "PiYG",
    "BrBG",
    "PRGn",
    "PuOr",
    "RdYlGn",
    "RdYlBu",
    "Spectral",
    # Categorical
    "Category10",
    "Observable10",
    "Tableau10",
    "Set1",
    "Set2",
    "Set3",
    "Pastel1",
    "Pastel2",
    "Dark2",
    "Paired",
    "Accent",
    # Additional lists, not standard for visualization in general, but commonly used for structures
    "Chainbow",
]

ColorDictNameT = Literal[
    "ElementSymbol",
    "ResidueName",
    "ResidueProperties",
    "SecondaryStructure",
]


class CategoricalPalette(BaseModel):
    kind: Literal["categorical"] = Field("categorical", description="Kind of palette")
    """Kind of palette"""

    colors: Optional[ColorListNameT | ColorDictNameT | list[ColorT] | dict[str, ColorT]] = Field(
        None,
        description="Define colors in the categorical palette or a name of color list/dictionary (default is color list is 'Category10'). ",
    )
    """Define colors in the categorical palette or a name of color list/dictionary (default is color list is 'Category10')."""

    repeat_color_list: Optional[bool] = Field(
        None,
        description="Repeat color list once all colors are depleted (only applies if `colors` is a list or a color list name).",
    )
    """Repeat color list once all colors are depleted (only applies if `colors` is a list or a color list name)."""

    sort: Optional[Literal["none", "lexical", "numeric"]] = Field(
        None,
        description="Sort actual annotation values before assigning colors from a list (none = take values in order of their first occurrence, default behavior is 'none').",
    )
    """Sort actual annotation values before assigning colors from a list (none = take values in order of their first occurrence, default behavior is 'none')."""

    sort_direction: Optional[Literal["ascending", "descending"]] = Field(
        None,
        description="Sort direction (default behavior is 'ascending').",
    )
    """Sort direction (default behavior is 'ascending')."""

    case_insensitive: Optional[bool] = Field(
        None,
        description="Treat annotation values as case-insensitive strings.",
    )
    """Treat annotation values as case-insensitive strings."""

    missing_color: Optional[ColorT] = Field(
        None,
        description="Color to use when a) `colors` is a dictionary (or a color dictionary name) and given key is not present, or b) `colors` is a list (or a color list name) and there are more actual annotation values than listed colors and `repeat_color_list` is not true (default behavior is not to apply any color in those cases).",
    )
    """Color to use when a) `colors` is a dictionary (or a color dictionary name) and given key is not present, or b) `colors` is a list (or a color list name) and there are more actual annotation values than listed colors and `repeat_color_list` is not true (default behavior is not to apply any color in those cases)."""


class DiscretePalette(BaseModel):
    kind: Literal["discrete"] = Field("discrete", description="Kind of palette")
    """Kind of palette"""

    colors: Optional[
        ColorListNameT
        | list[ColorT]
        | list[tuple[ColorT, float]]
        | list[tuple[ColorT | None, float | None, float | None]]
    ] = Field(
        None,
        description="Define colors for the discrete color palette and optionally corresponding checkpoints. "
        "Checkpoints refer to the values normalized to interval [0, 1] if `mode` is 'normalized' (default), or to the values directly if `mode` is 'absolute'. "
        "If checkpoints are not provided, they will created automatically (uniformly distributed over interval [0, 1]). "
        "If 1 checkpoint is provided for each color, then the color applies to values from this checkpoint (inclusive) until the next listed checkpoint (exclusive); the last color applies until Infinity. "
        "If 2 checkpoints are provided for each color, then the color applies to values from the first until the second checkpoint (inclusive); `None` means +/-Infinity; if ranges overlap, the later listed takes precedence. "
        "Default is color list 'YlGn'.",
    )
    """Define colors for the discrete color palette and optionally corresponding checkpoints.
    Checkpoints refer to the values normalized to interval [0, 1] if `mode` is 'normalized' (default), or to the values directly if `mode` is 'absolute'.
    If checkpoints are not provided, they will created automatically (uniformly distributed over interval [0, 1]).
    If 1 checkpoint is provided for each color, then the color applies to values from this checkpoint (inclusive) until the next listed checkpoint (exclusive); the last color applies until Infinity.
    If 2 checkpoints are provided for each color, then the color applies to values from the first until the second checkpoint (inclusive); `None` means +/-Infinity; if ranges overlap, the later listed takes precedence.
    Default is color list 'YlGn'."""

    reverse: Optional[bool] = Field(
        None,
        description="Reverse order of `colors` list. Only has effect when `colors` is a color list name or a color list without explicit checkpoints.",
    )
    """Reverse order of `colors` list. Only has effect when `colors` is a color list name or a color list without explicit checkpoints."""

    mode: Optional[Literal["normalized", "absolute"]] = Field(
        None,
        description="Defines whether the annotation values should be normalized before assigning color based on checkpoints in `colors` (`x_normalized = (x - x_min) / (x_max - x_min)`, where `[x_min, x_max]` are either `value_domain` if provided, or the lowest and the highest value encountered in the annotation). Default behavior is 'normalized'.",
    )
    """Defines whether the annotation values should be normalized before assigning color based on checkpoints in `colors` (`x_normalized = (x - x_min) / (x_max - x_min)`, where `[x_min, x_max]` are either `value_domain` if provided, or the lowest and the highest value encountered in the annotation). Default behavior is 'normalized'."""

    value_domain: Optional[tuple[float | None, float | None]] = Field(
        None,
        description="Defines `x_min` and `x_max` for normalization of annotation values. Either can be `None`, meaning that minimum/maximum of the actual values will be used. Only used when `mode` is 'normalized'.",
    )
    """Defines `x_min` and `x_max` for normalization of annotation values. Either can be `None`, meaning that minimum/maximum of the actual values will be used. Only used when `mode` is 'normalized'."""


class ContinuousPalette(BaseModel):
    kind: Literal["continuous"] = Field("continuous", description="Kind of palette")
    """Kind of palette"""

    colors: Optional[ColorListNameT | list[ColorT] | list[tuple[ColorT, float]]] = Field(
        None,
        description="Define colors for the continuous color palette and optionally corresponding checkpoints (i.e. annotation values that are mapped to each color). "
        "Checkpoints refer to the values normalized to interval [0, 1] if `mode` is 'normalized' (default), or to the values directly if `mode` is 'absolute'. "
        "If checkpoints are not provided, they will created automatically (uniformly distributed over interval [0, 1]).",
    )
    """Define colors for the continuous color palette and optionally corresponding checkpoints (i.e. annotation values that are mapped to each color).
    Checkpoints refer to the values normalized to interval [0, 1] if `mode` is 'normalized' (default), or to the values directly if `mode` is 'absolute'.
    If checkpoints are not provided, they will created automatically (uniformly distributed over interval [0, 1])."""

    reverse: Optional[bool] = Field(
        None,
        description="Reverse order of `colors` list. Only has effect when `colors` is a color list name or a color list without explicit checkpoints.",
    )
    """Reverse order of `colors` list. Only has effect when `colors` is a color list name or a color list without explicit checkpoints."""

    mode: Optional[Literal["normalized", "absolute"]] = Field(
        None,
        description="Defines whether the annotation values should be normalized before assigning color based on checkpoints in `colors` (`x_normalized = (x - x_min) / (x_max - x_min)`, where `[x_min, x_max]` are either `value_domain` if provided, or the lowest and the highest value encountered in the annotation). Default behavior is 'normalized'.",
    )
    """Defines whether the annotation values should be normalized before assigning color based on checkpoints in `colors` (`x_normalized = (x - x_min) / (x_max - x_min)`, where `[x_min, x_max]` are either `value_domain` if provided, or the lowest and the highest value encountered in the annotation). Default behavior is 'normalized'."""

    value_domain: Optional[tuple[float | None, float | None]] = Field(
        None,
        description="Defines `x_min` and `x_max` for normalization of annotation values. Either can be `None`, meaning that minimum/maximum of the actual values will be used. Only used when `mode` is 'normalized'.",
    )
    """Defines `x_min` and `x_max` for normalization of annotation values. Either can be `None`, meaning that minimum/maximum of the actual values will be used. Only used when `mode` is 'normalized'."""

    underflow_color: Optional[Literal["auto"] | ColorT] = Field(
        None,
        description="Color to use for values below the lowest checkpoint. 'auto' means color of the lowest checkpoint. (Default behavior is not to color values below the lowest checkpoint.)",
    )
    """Color to use for values below the lowest checkpoint. 'auto' means color of the lowest checkpoint. (Default behavior is not to color values below the lowest checkpoint.)"""

    overflow_color: Optional[Literal["auto"] | ColorT] = Field(
        None,
        description="Color to use for values above the highest checkpoint. 'auto' means color of the lowest checkpoint. (Default behavior is not to color values above the highest checkpoint.)",
    )
    """Color to use for values above the highest checkpoint. 'auto' means color of the lowest checkpoint. (Default behavior is not to color values above the highest checkpoint.)"""


PaletteT = CategoricalPalette | DiscretePalette | ContinuousPalette


class RepresentationParams(BaseModel):
    """
    Representation node, describing how to represent a component.
    """

    type: RepresentationTypeT = Field(description="Representation type, i.e. cartoon, ball_and_stick, etc.")


class CartoonParams(RepresentationParams):
    type: Literal["cartoon"] = "cartoon"
    size_factor: Optional[float] = Field(None, description="Scales the corresponding visuals.")
    tubular_helices: Optional[bool] = Field(None, description="Simplify corkscrew helices to tubes.")
    # TODO support for variable size, e.g. based on b-factors?


class BallAndStickParams(RepresentationParams):
    type: Literal["ball_and_stick"] = "ball_and_stick"
    ignore_hydrogens: Optional[bool] = Field(None, descripton="Controls whether hydrogen atoms are drawn.")
    size_factor: Optional[float] = Field(None, description="Scales the corresponding visuals.")


class SpacefillParams(RepresentationParams):
    type: Literal["spacefill"] = "spacefill"
    ignore_hydrogens: Optional[bool] = Field(None, descripton="Controls whether hydrogen atoms are drawn.")
    size_factor: Optional[float] = Field(None, description="Scales the corresponding visuals.")


class CarbohydrateParams(RepresentationParams):
    type: Literal["carbohydrate"] = "carbohydrate"
    size_factor: Optional[float] = Field(None, description="Scales the corresponding visuals.")


class SurfaceParams(RepresentationParams):
    type: Literal["surface"] = "surface"
    ignore_hydrogens: Optional[bool] = Field(None, descripton="Controls whether hydrogen atoms are drawn.")
    size_factor: Optional[float] = Field(None, description="Scales the corresponding visuals.")


RepresentationTypeParams = {
    get_model_fields(cast(Type[RepresentationParams], t))["type"].default: t
    for t in (CartoonParams, BallAndStickParams, SpacefillParams, CarbohydrateParams, SurfaceParams)
}


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


class VolumeRepresentationParams(BaseModel):
    """
    Representation node, describing how to represent a component.
    """

    type: VolumeRepresentationTypeT = Field(description="Representation type, i.e. isosurface")


class VolumeIsoSurfaceParams(RepresentationParams):
    """
    Volume isosurface representation.
    """

    type: Literal["isosurface"] = "isosurface"

    relative_isovalue: Optional[float] = Field(None, description="Relative isovalue")
    absolute_isovalue: Optional[float] = Field(None, description="Absolute isovalue. Overrides `relative_isovalue`.")
    show_wireframe: Optional[bool] = Field(None, description="Show mesh wireframe. Defaults to false.")
    show_faces: Optional[bool] = Field(None, description="Show mesh faces. Defaults to true.")


class VolumeGridSliceParams(RepresentationParams):
    """
    Volume grid-slice representation.
    """

    type: Literal["grid-slice"] = "grid-slice"

    dimension: Literal["x", "y", "z"] = Field(description="Dimension of the grid slice, i.e. 'x', 'y', or 'z'.")
    absolute_index: Optional[int] = Field(
        None,
        description="Index of the grid slice in the specified dimension. 0-based index, i.e. 0 is the first slice.",
    )
    relative_index: Optional[float] = Field(
        None,
        description="Relative index of the grid slice in the specified dimension. 0.0 is the first slice, 1.0 is the last slice. Overrides `absolute_index`.",
    )
    relative_isovalue: Optional[float] = Field(None, description="Relative isovalue")
    absolute_isovalue: Optional[float] = Field(None, description="Absolute isovalue. Overrides `relative_isovalue`.")


VolumeRepresentationTypeParams = {
    get_model_fields(t)["type"].default: t
    for t in (
        VolumeIsoSurfaceParams,
        VolumeGridSliceParams,
    )
}


ClipTypeT = Literal["plane", "sphere", "box"]


class ClipParamsBase(BaseModel):
    """
    Clip node, describing how to clip a representation.
    """

    type: ClipTypeT = Field(description="Kind of clipping region, i.e. sphere, plane, or box.")

    check_transform: Optional[Mat4] = Field(
        None,
        description="Transformation matrix applied to each point before clipping. For example, can be used to clip volumes in the grid/fractional space. Default is None.",
    )
    invert: Optional[bool] = Field(None, description="Inverts the clipping region. Default is false")
    variant: Literal["object", "pixel"] = Field(
        "pixel", description="Variant of the clip node, either 'object' or 'pixel'"
    )


class ClipPlaneParams(ClipParamsBase):
    """
    Plane clip node, describing how to clip a representation with a plane.
    """

    type: Literal["plane"] = "plane"

    normal: Vec3 = Field(description="Normal vector of the clipping plane. Points towards the clipped region.")
    point: Vec3 = Field(description="Point on the clipping plane.")


class ClipSphereParams(ClipParamsBase):
    """
    Sphere clip node, describing how to clip a representation with a sphere.
    """

    type: Literal["sphere"] = "sphere"

    center: Vec3 = Field(description="Center of the clipping sphere.")
    radius: Optional[float] = Field(description="Radius of the clipping sphere. Defaults to 1.0.")


class ClipBoxParams(BaseModel):
    """
    Box clip node, describing how to clip a representation with a box.
    """

    type: Literal["box"] = "box"

    center: Vec3 = Field(description="Position of the center of the unit box.")
    size: Optional[Vec3] = Field(None, description="Size of the box in each dimension. Defaults to (1, 1, 1).")
    rotation: Optional[Mat3[float]] = Field(
        None,
        description="9d vector describing the rotation, in a column major (j * 3 + i indexing) format, this is equivalent to Fortran-order in numpy, to be multiplied from the left",
    )


ClipTypeParams = {
    get_model_fields(t)["type"].default: t
    for t in (
        ClipPlaneParams,
        ClipSphereParams,
        ClipBoxParams,
    )
}


class _DataFromUriParams(BaseModel):
    """
    Abstract node that's shared by all resource-based selections.
    """

    uri: str = Field(description="Location of the resource")
    format: SchemaFormatT = Field(description="Format of the resource, i.e. 'cif', 'bcif', or 'json'")
    # must be aliased to not shadow BaseModel attribute
    schema_: SchemaT = Field(alias="schema", description="granularity/type of the selection")
    block_header: Optional[str] = Field(
        None, description="Block name wherein selection is located. Only applies when format is 'cif' or 'bcif'."
    )
    block_index: Optional[int] = Field(
        None, description="Block index wherein selection is located. Only applies when format is 'cif' or 'bcif'."
    )
    category_name: Optional[str] = Field(
        None, description="Category wherein selection is located. Only applies when format is 'cif' or 'bcif'."
    )
    field_name: Optional[str] = Field(
        None,
        description="Name of the column in CIF or field name (key) in JSON that "
        "contains the desired value (color/label/tooltip/component...); the "
        "default value is 'color'/'label'/'tooltip'/'component' depending "
        "on the node kind",
    )
    field_remapping: Optional[dict[str, str | None]] = Field(
        None,
        description="Optional remapping of annotation field names `{ standardName1: actualName1, ... }`. Use `{ 'label_asym_id': 'X' }` to load actual field 'X' as 'label_asym_id'. Use `{ 'label_asym_id': None }` to ignore actual field 'label_asym_id'. Fields not mentioned here are mapped implicitely (i.e. actual name = standard name).",
    )


class _DataFromSourceParams(BaseModel):
    """
    Abstract node that's shared by all selections based on the source file.
    """

    # must be aliased to not shadow BaseModel attribute
    schema_: SchemaT = Field(alias="schema", description="granularity/type of the selection")
    block_header: Optional[str] = Field(None, description="Block name wherein selection is located.")
    block_index: Optional[int] = Field(None, description="Block index wherein selection is located.")
    category_name: str = Field(description="Category wherein selection is located.")
    field_name: Optional[str] = Field(
        None,
        description="Name of the column in CIF that contains the desired value ("
        "color/label/tooltip/component...); the default value is "
        "'color'/'label'/'tooltip'/'component' depending on the node kind",
    )
    field_remapping: Optional[dict[str, str | None]] = Field(
        None,
        description="Optional remapping of annotation field names `{ standardName1: actualName1, ... }`. Use `{ 'label_asym_id': 'X' }` to load actual field 'X' as 'label_asym_id'. Use `{ 'label_asym_id': None }` to ignore actual field 'label_asym_id'. Fields not mentioned here are mapped implicitely (i.e. actual name = standard name).",
    )


class ComponentInlineParams(BaseModel):
    """
    Selection based on function arguments.
    """

    selector: Optional[ComponentSelectorT | ComponentExpression | list[ComponentExpression]] = Field(
        None, description="Describes one or more selections or one of the enumerated selectors."
    )


class ComponentFromUriParams(_DataFromUriParams):
    """
    Selection based on another resource.
    """

    field_values: Optional[list[str]] = Field(
        None,
        description="Create the component from rows that have any of these "
        "values in the field specified by `field_name`. If not "
        "provided, create the component from all rows.",
    )


class ComponentFromSourceParams(_DataFromSourceParams):
    """
    Selection based on a category in the source file.
    """

    field_values: Optional[list[str]] = Field(
        None,
        description="Create the component from rows that have any of these "
        "values in the field specified by `field_name`. If not "
        "provided, create the component from all rows.",
    )


class ColorInlineParams(ComponentInlineParams):
    """
    Color based on function arguments.
    """

    color: Optional[ColorT] = Field(None, description="Color using SVG color names or RGB hex code")


class ColorFromUriParams(_DataFromUriParams):
    """
    Color based on another resource.
    """

    palette: Optional[PaletteT] = Field(None, description="Customize mapping of annotation values to colors.")


class ColorFromSourceParams(_DataFromSourceParams):
    """
    Color based on a category in the source file.
    """

    palette: Optional[PaletteT] = Field(None, description="Customize mapping of annotation values to colors.")


class OpacityInlineParams(ComponentInlineParams):
    """
    Change the opacity/transparency of a representation based on parameters.
    """

    opacity: float = Field(description="Opacity of a representation. 0.0: fully transparent, 1.0: fully opaque")


class LabelInlineParams(BaseModel):
    """
    Label based on function arguments.
    """

    text: str = Field(description="Text to show as label")
    # schema and other stuff not needed here, the label will be applied on the whole parent Structure or Component


class LabelFromUriParams(_DataFromUriParams):
    """
    Label based on another resource.
    """


class LabelFromSourceParams(_DataFromSourceParams):
    """
    Label based on a category in the source file.
    """


class TooltipInlineParams(BaseModel):
    text: str = Field(description="Text to show as tooltip upon hover")
    # schema and other stuff not needed here, the tooltip will be applied on the whole parent Structure or Component


class TooltipFromUriParams(_DataFromUriParams):
    pass


class TooltipFromSourceParams(_DataFromSourceParams):
    pass


class FocusInlineParams(BaseModel):
    """
    Define the camera focus based on function arguments.
    """

    direction: Optional[Vec3[float]] = Field(None, description="Direction of the view (vector position -> target)")
    up: Optional[Vec3[float]] = Field(
        None, description="Controls the rotation around the vector between target and position"
    )
    radius: Optional[float] = Field(
        None, description="Radius of the focused sphere (overrides `radius_factor` and `radius_extra`)"
    )
    radius_factor: Optional[float] = Field(
        None,
        description="Radius of the focused sphere relative to the radius of parent component (default: 1). Focused radius = component_radius * radius_factor + radius_extent.",
    )
    radius_extent: Optional[float] = Field(
        None,
        description="Addition to the radius of the focused sphere, if computed from the radius of parent component (default: 0). Focused radius = component_radius * radius_factor + radius_extent.",
    )


class TransformParams(BaseModel):
    """
    Define a transformation.
    """

    rotation: Optional[Mat3[float]] = Field(
        None,
        description="9d vector describing the rotation, in a column major (j * 3 + i indexing) format, this is equivalent to Fortran-order in numpy, to be multiplied from the left",
    )
    translation: Optional[Vec3[float]] = Field(None, description="3d vector describing the translation")


class CameraParams(BaseModel):
    """
    Controls the global camera position.
    """

    target: Vec3[float] = Field(description="What to look at")
    position: Vec3[float] = Field(description="The position of the camera")
    up: Vec3[float] = Field(
        description="Controls the rotation around the vector between target and position", required=True
    )


class CanvasParams(BaseModel):
    """
    Controls global canvas properties.
    """

    background_color: ColorT = Field(description="Background color using SVG color names or RGB hex code")


class PrimitiveComponentExpressions(BaseModel):
    structure_ref: Optional[RefT] = Field(
        None,
        description="Reference to a structure node to apply this expresion to. If undefined, get the structure implicitly from the tree.",
    )
    expression_schema: Optional[SchemaT] = Field(
        None, description="Schema the expressions follow, used for optimization of structure query resolution."
    )
    expressions: list[ComponentExpression] = Field(description="Expression refencing elements froms the structure_ref.")


# TODO: Consider supporting a list of PrimitiveComponentExpressions too to enable things like
#       boundings boxes around docked ligands that contains surrounding residues
PrimitivePositionT = Vec3[float] | ComponentExpression | PrimitiveComponentExpressions
"""
Positions of primitives can be defined by 3D vector, by providing a selection expressions, or by providing
a list of expressions within a specific structure.
"""


class PrimitivesParams(BaseModel):
    color: Optional[ColorT] = Field(None, description="Default color for primitives in this group")
    label_color: Optional[ColorT] = Field(None, description="Default label color for primitives in this group")
    tooltip: Optional[str] = Field(None, description="Default tooltip for primitives in this group")
    opacity: Optional[float] = Field(None, description="Opacity of primitive geometry in this group")
    label_opacity: Optional[float] = Field(None, description="Opacity of primitive labels in this group")
    instances: Optional[list[Mat4[float]]] = Field(
        None,
        description="Instances of this primitive group defined as 4x4 column major (j * 4 + i indexing) transformation matrices",
    )


class MeshParams(BaseModel):
    """
    Low-level, fully customizable mesh representation of a shape.
    """

    kind: Literal["mesh"] = "mesh"
    vertices: list[float] = Field(description="3N length array of floats with vertex position (x1, y1, z1, ...)")
    indices: list[int] = Field(
        description="3N length array of indices into vertices that form triangles (t1_1, t1_2, t1_3, ...)"
    )
    triangle_groups: Optional[list[int]] = Field(
        None,
        description="Assign a number to each triangle to group them. If not set, each triangle is considered a separate group.",
    )
    group_colors: Optional[Mapping[int, ColorT]] = Field(
        None, description="Assign a color to each group. If not assigned, default primitives group color is used."
    )
    group_tooltips: Optional[Mapping[int, str]] = Field(None, description="Assign an optional tooltip to each group.")
    tooltip: Optional[str] = Field(
        None, description="Tooltip shown when hovering over the mesh. Assigned group_tooltips take precedence."
    )
    color: Optional[ColorT] = Field(None, description="Default color of the triangles.")
    show_triangles: Optional[bool] = Field(None, description="Determine whether to render triangles of the mesh")
    show_wireframe: Optional[bool] = Field(None, description="Determine whether to render wireframe of the mesh")
    wireframe_width: Optional[float] = Field(None, description="Wireframe line width")
    wireframe_color: Optional[ColorT] = Field(
        None, description="Wireframe color, uses triangle/group colors when not set"
    )


class LinesParams(BaseModel):
    """
    Low-level, fully customizable lines representation of a shape.
    """

    kind: Literal["lines"] = "lines"
    vertices: list[float] = Field(description="3N length array of floats with vertex position (x1, y1, z1, ...)")
    indices: list[int] = Field(
        description="2N length array of indices into vertices that form lines (l1_1, ll1_2, ...)"
    )
    line_groups: Optional[list[int]] = Field(None, description="Assign a number to each triangle to group them.")
    group_colors: Optional[Mapping[int, ColorT]] = Field(
        None,
        description="Assign a color to each group. If not assigned, default primitives group color is used. Takes precedence over line_colors.",
    )
    group_tooltips: Optional[Mapping[int, str]] = Field(None, description="Assign an optional tooltip to each group.")
    group_widths: Optional[Mapping[int, float]] = Field(
        None, description="Assign an optional line width to each group. Take precedence over `width`."
    )
    tooltip: Optional[str] = Field(
        None, description="Tooltip shown when hovering over the lines. Assigned group_tooltips take precedence."
    )
    width: Optional[float] = Field(None, description="Line width")
    color: Optional[ColorT] = Field(None, description="Default color of the lines.")


class _TubeParamsBase(BaseModel):
    start: PrimitivePositionT = Field(description="Start of this tube.")
    end: PrimitivePositionT = Field(description="End of this tube.")
    radius: Optional[float] = Field(None, description="Tube radius (in Angstroms).")
    dash_length: Optional[float] = Field(None, description="Length of each dash.")
    color: Optional[ColorT] = Field(
        None, description="Color of the tube. If not specified, the primitives group color is used."
    )
    # NOTE: this is currently not supported by Mol*, but can add it later if needed:
    # dash_start: Optional[float] = Field(description="Offset from start coords before the 1st dash is drawn.")
    # gap_length: Optional[float] = Field(description="Length of optional gaps between dashes. Set to 0 for solid line.")


class TubeParams(_TubeParamsBase):
    kind: Literal["tube"] = "tube"
    tooltip: Optional[str] = Field(None, description="Tooltip to show when hovering on the tube.")


class ArrowParams(BaseModel):
    kind: Literal["arrow"] = "arrow"

    start: PrimitivePositionT = Field(description="Start of this arrow.")
    end: Optional[PrimitivePositionT] = Field(None, description="End of this arrow.")

    direction: Optional[Vec3] = Field(None, description="If specified, the endpoint is computed as start + direction.")
    length: Optional[float] = Field(
        None, description="Length of the arrow. If unset, the distance between start and end is used."
    )

    show_start_cap: Optional[bool] = Field(None, description="Draw a cap at the start of the arrow.")
    start_cap_length: Optional[float] = Field(
        None, description="Length of the start cap. If not provided, will be 2 * start_cap_radius."
    )
    start_cap_radius: Optional[float] = Field(
        None, description="Radius of the start cap. If not provided, will be 2 * tube_radius."
    )

    show_end_cap: Optional[bool] = Field(None, description="Draw a cap at the end of the arrow.")
    end_cap_length: Optional[float] = Field(
        None, description="Length of the end cap. If not provided, will be 2 * end_cap_radius."
    )
    end_cap_radius: Optional[float] = Field(
        None, description="Radius of the end cap. If not provided, will be 2 * tube_radius."
    )

    show_tube: Optional[bool] = Field(None, description="Draw a tube between the start and end of the arrow.")
    tube_radius: Optional[float] = Field(None, description="Tube radius (in Angstroms).")
    tube_dash_length: Optional[float] = Field(None, description="Length of each dash.")

    color: Optional[ColorT] = Field(
        None, description="Color of the arrow. If not specified, the primitives group color is used."
    )

    tooltip: Optional[str] = Field(None, description="Tooltip to show when hovering on the arrow.")


class DistanceMeasurementParams(_TubeParamsBase):
    kind: Literal["distance_measurement"] = "distance_measurement"
    label_template: Optional[str] = Field(
        None, description="Template used to construct the label. Use {{distance}} as placeholder for the distance."
    )
    label_size: Optional[float | Literal["auto"]] = Field(
        None, description="Size of the label. Auto scales it by the distance."
    )
    label_auto_size_scale: Optional[float] = Field(None, description="Scaling factor for auto size.")
    label_auto_size_min: Optional[float] = Field(None, description="Minimum size for auto size.")
    label_color: Optional[ColorT] = Field(None, description="Color of the label.")


class AngleMeasurementParams(BaseModel):
    kind: Literal["angle_measurement"] = "angle_measurement"

    a: PrimitivePositionT = Field(description="Point A.")
    b: PrimitivePositionT = Field(description="Point B.")
    c: PrimitivePositionT = Field(description="Point C.")

    label_template: Optional[str] = Field(
        None, description="Template used to construct the label. Use {{angle}} as placeholder for the value."
    )
    label_size: Optional[float | Literal["auto"]] = Field(
        None, description="Size of the label. Auto scales it by the average magnitude of (b - a) and (c - b)."
    )
    label_auto_size_scale: Optional[float] = Field(None, description="Scaling factor for auto size.")
    label_auto_size_min: Optional[float] = Field(None, description="Minimum size for auto size.")
    label_color: Optional[ColorT] = Field(None, description="Color of the label.")

    show_vector: Optional[bool] = Field(None, description="Draw vectors between (a, b) and (b, c).")
    vector_color: Optional[ColorT] = Field(None, description="Color of the vectors.")
    vector_radius: Optional[float] = Field(0.05, description="Radius of the vectors.")

    show_section: Optional[bool] = Field(None, description="Draw a filled circle section representing the angle.")
    section_color: Optional[ColorT] = Field(
        None, description="Color of the angle section. If not specified, the primitives group color is used."
    )
    section_radius: Optional[float] = Field(None, description="Radius of the angle section. In angstroms.")
    section_radius_scale: Optional[float] = Field(
        None, description="Factor to scale the radius of the angle section. Ignored if section_radius is set."
    )


class PrimitiveLabelParams(BaseModel):
    kind: Literal["label"] = "label"
    position: PrimitivePositionT = Field(description="Position of this label.")
    text: str = Field(default="The label.")
    label_size: Optional[float] = Field(None, description="Size of the label.")
    label_color: Optional[ColorT] = Field(None, description="Color of the label.")
    label_offset: Optional[float] = Field(None, description="Camera-facing offset to prevent overlap with geometry.")


class EllipseParams(BaseModel):
    kind: Literal["ellipse"] = "ellipse"

    center: PrimitivePositionT = Field(description="The center of the ellipse.")
    as_circle: Optional[bool] = Field(None, description="If true, ignores radius_minor/magnitude of the minor axis.")

    major_axis: Optional[Vec3] = Field(None, description="Major axis of this ellipse.")
    minor_axis: Optional[Vec3] = Field(None, description="Minor axis of this ellipse.")

    major_axis_endpoint: Optional[PrimitivePositionT] = Field(
        None, description="Major axis endpoint. If specified, overrides major axis to be major_axis_endpoint - center."
    )
    minor_axis_endpoint: Optional[PrimitivePositionT] = Field(
        None, description="Minor axis endpoint. If specified, overrides minor axis to be minor_axis_endpoint - center."
    )

    radius_major: Optional[float] = Field(
        None, description="Radius of the major axis. If unset, the length of the major axis is used."
    )
    radius_minor: Optional[float] = Field(
        None, description="Radius of the minor axis. If unset, the length of the minor axis is used."
    )

    theta_start: Optional[float] = Field(None, description="Start of the arc. In radians.")
    theta_end: Optional[float] = Field(None, description="End of the arc. In radians.")

    color: Optional[ColorT] = Field(None, description="Default color for the ellipse.")

    tooltip: Optional[str] = Field(None, description="Tooltip to show when hovering on the ellipse.")


class EllipsoidParams(BaseModel):
    kind: Literal["ellipsoid"] = "ellipsoid"

    center: PrimitivePositionT = Field(description="The center of the ellipsoid.")

    major_axis: Optional[Vec3] = Field(None, description="Major axis of this ellipsoid. Defaults to (1, 0, 0).")
    minor_axis: Optional[Vec3] = Field(None, description="Minor axis of this ellipsoid. Defaults to (0, 1, 0).")

    major_axis_endpoint: Optional[PrimitivePositionT] = Field(
        None, description="Major axis endpoint. If specified, overrides major axis to be major_axis_endpoint - center."
    )
    minor_axis_endpoint: Optional[PrimitivePositionT] = Field(
        None, description="Minor axis endpoint. If specified, overrides minor axis to be minor_axis_endpoint - center."
    )

    radius: Optional[Vec3 | float] = Field(None, description="Radii of the ellipsoid along each axis.")
    radius_extent: Optional[Vec3 | float] = Field(
        None, description="Added to the radii of the ellipsoid along each axis."
    )

    color: Optional[ColorT] = Field(None, description="Default color for the ellipsoid.")

    tooltip: Optional[str] = Field(None, description="Tooltip to show when hovering on the ellipsoid.")


class BoxParams(BaseModel):
    kind: Literal["box"] = "box"

    center: PrimitivePositionT = Field(description="The center of the box.")
    extent: Optional[Vec3] = Field(
        None,
        description="The width, the height, and the depth of the box. Added to the bounding box determined by the center.",
    )

    show_faces: bool = Field(True, description="Determine whether to render the faces of the box.")
    face_color: Optional[ColorT] = Field(None, description="Color of the box faces.")

    show_edges: bool = Field(False, description="Determine whether to render the edges of the box.")
    edge_radius: Optional[float] = Field(None, description="Radius of the box edges. In angstroms.")
    edge_color: Optional[ColorT] = Field(None, description="Color of the edges.")

    tooltip: Optional[str] = Field(None, description="Tooltip to show when hovering on the box.")

    # NOTE: Possible future extensions:
    # - support box orientation
    # - support for witewrame box in addition to edges
    # show_wireframe: bool = Field(False, description="Determine whether to render the wireframe of the box.")
    # wireframe_color: Optional[ColorT] = Field(description="Wireframe color, uses triangle/group colors when not set")
    # wireframe_width: Optional[float] = Field(description="Wireframe line width")


PrimitiveParamsT = (
    MeshParams
    | LinesParams
    | TubeParams
    | DistanceMeasurementParams
    | AngleMeasurementParams
    | EllipseParams
    | EllipsoidParams
    | BoxParams
)


class PrimitivesFromUriParams(BaseModel):
    uri: str = Field(description="Location of the resource")
    format: Literal["mvs-node-json"] = Field(description="Format of the data")
    references: Optional[list[str]] = Field(None, description="List of nodes the data are referencing")


def validate_state_tree(json: str) -> None:
    """
    Validates a JSON string and checks whether it's a valid state representation.
    :param json: payload to validate
    :raises ValidationError if JSON is malformed or state tree type definitions are violated
    """
    if hasattr(State, "model_validate_json"):
        State.model_validate_json(json)
    else:
        # Pydantic v1 support
        State.parse_raw(json)
