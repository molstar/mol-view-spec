"""Test module builder serialization."""

import logging
import unittest

from molviewspec.builder import create_builder
from molviewspec.nodes import MVSJ

# Set up logging for tests
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class TestSerialization(unittest.TestCase):
    def test_box(self):
        """Test box serialization."""
        builder = create_builder()
        builder.primitives().box(
            center=(0.5, 0.5, 1.0),
            extent=(0.5, 0.5, 2.0),
            show_faces=True,
            face_color="blue",
            show_edges=False,
        )
        state = MVSJ(data=builder.get_state()).dumps()

        self.assertIn("primitives", state)
        self.assertIn("box", state)

    def test_putty_representation_default(self):
        """Test that putty representation with no size_theme serializes correctly."""
        builder = create_builder()
        (
            builder.download(url="https://files.wwpdb.org/download/1cbs.cif")
            .parse(format="mmcif")
            .model_structure()
            .component(selector="polymer")
            .representation(type="putty")
        )
        state = MVSJ(data=builder.get_state()).dumps()

        self.assertIn("putty", state)
        self.assertIn("representation", state)

    def test_putty_representation_uniform(self):
        """Test that putty with size_theme='uniform' serializes size_theme and size_factor correctly."""
        builder = create_builder()
        (
            builder.download(url="https://files.wwpdb.org/download/1cbs.cif")
            .parse(format="mmcif")
            .model_structure()
            .component(selector="polymer")
            .representation(type="putty", size_theme="uniform", size_factor=0.5)
        )
        state = MVSJ(data=builder.get_state()).dumps()

        self.assertIn("putty", state)
        self.assertIn("uniform", state)
        self.assertIn("0.5", state)

    def test_putty_representation_uncertainty(self):
        """Test that putty with size_theme='uncertainty' serializes size_theme correctly."""
        builder = create_builder()
        (
            builder.download(url="https://files.wwpdb.org/download/1cbs.cif")
            .parse(format="mmcif")
            .model_structure()
            .component(selector="polymer")
            .representation(type="putty", size_theme="uncertainty")
        )
        state = MVSJ(data=builder.get_state()).dumps()

        self.assertIn("putty", state)
        self.assertIn("uncertainty", state)

    def test_putty_representation_uncertainty_with_size_factor(self):
        """Test that putty with size_theme='uncertainty' and a size_factor serializes both correctly."""
        builder = create_builder()
        (
            builder.download(url="https://files.wwpdb.org/download/1cbs.cif")
            .parse(format="mmcif")
            .model_structure()
            .component(selector="polymer")
            .representation(type="putty", size_theme="uncertainty", size_factor=2.0)
        )
        state = MVSJ(data=builder.get_state()).dumps()

        self.assertIn("putty", state)
        self.assertIn("uncertainty", state)
        self.assertIn("2.0", state)

    def test_putty_representation_node_structure(self):
        """Test that the putty representation node has the expected structure in the state tree."""
        builder = create_builder()
        (
            builder.download(url="https://files.wwpdb.org/download/1cbs.cif")
            .parse(format="mmcif")
            .model_structure()
            .component(selector="polymer")
            .representation(type="putty", size_theme="uniform", size_factor=1.5)
        )
        state = builder.get_state()

        # Walk to the representation node
        download = state.root.children[0]
        parse = download.children[0]
        structure = parse.children[0]
        component = structure.children[0]
        representation = component.children[0]

        self.assertEqual(representation.kind, "representation")
        self.assertEqual(representation.params["type"], "putty")
        self.assertEqual(representation.params["size_theme"], "uniform")
        self.assertEqual(representation.params["size_factor"], 1.5)


if __name__ == "__main__":
    unittest.main()
