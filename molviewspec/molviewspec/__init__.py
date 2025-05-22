"""MolViewSpec"""

__version__ = "1.5.0"

from molviewspec.builder import create_builder
from molviewspec.molstar_widgets import molstar_html, molstar_notebook, molstar_streamlit
from molviewspec.mvsx_converter import mvsj_to_mvsx
from molviewspec.nodes import (
    MVSJ,
    MVSX,
    ComponentExpression,
    GlobalMetadata,
    MVSData,
    PrimitiveComponentExpressions,
    Snapshot,
    SnapshotMetadata,
    State,
    States,
    validate_state_tree,
)
