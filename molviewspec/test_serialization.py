"""Test module for converting builder to msvj state."""

import json
import logging
import os
import shutil
import tempfile
import unittest
import urllib.request
import zipfile
from urllib.parse import urlparse

from molviewspec.builder import create_builder

# Set up logging for tests
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)



class TestSerialization(unittest.TestCase):

    def test_box(self):
        """Test box serialization."""
        builder = create_builder()
        builder.primitives().box(
            center=(0.5, 0.5, 1.0),
            extent=(0.5, 0.5, 2.),  
            show_faces=True,
            face_color="blue",
            show_edges=False,
        )
        state = builder.get_state()
        
        self.assertIn("primitives", state)
        self.assertIn("box", state)



if __name__ == "__main__":
    unittest.main()
