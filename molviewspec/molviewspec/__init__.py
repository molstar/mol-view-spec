"""MolViewSpec"""

__version__ = "1.6.0"

from molviewspec.builder import create_builder
from molviewspec.molstar_widgets import molstar_html, molstar_notebook, molstar_streamlit
from molviewspec.mvsx_converter import mvsj_to_mvsx
from molviewspec.nodes import (
    MVSJ,
    MVSX,
    CategoricalPalette,
    ComponentExpression,
    ContinuousPalette,
    DiscretePalette,
    GlobalMetadata,
    MVSData,
    PrimitiveComponentExpressions,
    Snapshot,
    SnapshotMetadata,
    State,
    States,
    validate_state_tree,
)
