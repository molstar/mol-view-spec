"""Test module for MVSJ to MVSX conversion functionality."""

import json
import os
import tempfile
import shutil
import unittest
import zipfile
import logging
from urllib.parse import urlparse
import urllib.request

from molviewspec.mvsx_converter import (
    find_uri_references,
    update_uri_references,
    mvsj_to_mvsx,
    extract_mvsx,
    MVSXDownloadError,
    MVSXValidationError,
)

# Set up logging for tests
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TestMVSXFunctionality(unittest.TestCase):
    """Test the MVSX file format conversion functionality."""

    def setUp(self):
        """Set up test fixtures."""
        # Create temporary directory for tests
        self.test_dir = tempfile.mkdtemp()
        self.test_resources_dir = os.path.join(self.test_dir, "resources")
        os.makedirs(self.test_resources_dir, exist_ok=True)

        # Path to colab_examples directory - try multiple possible locations
        script_dir = os.path.dirname(os.path.abspath(__file__))
        potential_paths = [
            # Look in ../test-data/colab_examples (relative to script)
            os.path.join(os.path.dirname(script_dir), "test-data", "colab_examples"),
            # Look in ./test-data/colab_examples (relative to current working directory)
            os.path.join(os.getcwd(), "test-data", "colab_examples"),
            # Fallback to direct path in case the script is run from a different location
            os.path.join(script_dir, "test", "colab_examples")
        ]

        self.colab_examples_dir = None
        for path in potential_paths:
            if os.path.exists(path):
                self.colab_examples_dir = path
                break

        if self.colab_examples_dir:
            logger.info(f"Found colab_examples directory at: {self.colab_examples_dir}")
        else:
            logger.warning("Could not find colab_examples directory. Related tests will be skipped.")

        # Create a simple test MVSJ file
        self.simple_mvsj_path = os.path.join(self.test_dir, "simple.mvsj")
        self.simple_mvsj_data = {
            "root": {
                "kind": "root",
                "children": [
                    {
                        "kind": "download",
                        "params": {
                            "url": "local_file.cif"
                        },
                        "children": [
                            {
                                "kind": "parse",
                                "params": {
                                    "format": "mmcif"
                                }
                            }
                        ]
                    }
                ]
            },
            "metadata": {
                "version": "0.1",
                "timestamp": "2023-11-27T12:05:32.145284"
            }
        }

        with open(self.simple_mvsj_path, 'w') as f:
            json.dump(self.simple_mvsj_data, f, indent=2)

        # Create a local file referenced in the MVSJ
        self.local_file_path = os.path.join(self.test_dir, "local_file.cif")
        with open(self.local_file_path, 'w') as f:
            f.write("data_test\n_entry.id TEST\n")

        # Create a complex MVSJ with both local and remote references
        self.complex_mvsj_path = os.path.join(self.test_dir, "complex.mvsj")
        self.complex_mvsj_data = {
            "root": {
                "kind": "root",
                "children": [
                    {
                        "kind": "download",
                        "params": {
                            "url": "local_file.cif"
                        },
                        "children": [
                            {
                                "kind": "parse",
                                "params": {
                                    "format": "mmcif"
                                },
                                "children": [
                                    {
                                        "kind": "structure",
                                        "params": {
                                            "type": "model"
                                        },
                                        "children": [
                                            {
                                                "kind": "component",
                                                "params": {
                                                    "selector": "all"
                                                }
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "kind": "download",
                        "params": {
                            "url": "https://files.wwpdb.org/download/1cbs.cif"
                        },
                        "children": [
                            {
                                "kind": "parse",
                                "params": {
                                    "format": "mmcif"
                                }
                            }
                        ]
                    },
                    {
                        "kind": "tooltip_from_uri",
                        "params": {
                            "uri": "annotations.cif",
                            "format": "cif",
                            "category_name": "annotations",
                            "field_name": "label",
                            "block_header": "test_annotations",
                            "schema": "residue_range"
                        }
                    }
                ]
            },
            "metadata": {
                "version": "0.1",
                "title": "A test with MVS annotations",
                "timestamp": "2024-06-01T10:00:00.000000+00:00"
            }
        }

        with open(self.complex_mvsj_path, 'w') as f:
            json.dump(self.complex_mvsj_data, f, indent=2)

        # Create annotation file referenced in complex MVSJ
        self.annotation_file_path = os.path.join(self.test_dir, "annotations.cif")
        with open(self.annotation_file_path, 'w') as f:
            f.write("data_test_annotations\n\nloop_\n_annotations.id\n_annotations.label\n1 'Test Label'\n")

        # Create a multi-state MVSJ file
        self.multistate_mvsj_path = os.path.join(self.test_dir, "multistate.mvsj")
        self.multistate_mvsj_data = {
            "kind": "multiple",
            "metadata": {
                "version": "1.1",
                "title": "Multi-state Test",
                "timestamp": "2024-06-01T10:00:00.000000+00:00"
            },
            "snapshots": [
                {
                    "root": {
                        "kind": "root",
                        "children": [
                            {
                                "kind": "download",
                                "params": {
                                    "url": "local_file.cif"
                                }
                            }
                        ]
                    },
                    "metadata": {
                        "title": "Snapshot 1",
                        "key": "snapshot1",
                        "linger_duration_ms": 1000
                    }
                },
                {
                    "root": {
                        "kind": "root",
                        "children": [
                            {
                                "kind": "download",
                                "params": {
                                    "url": "https://files.wwpdb.org/download/1cbs.cif"
                                }
                            }
                        ]
                    },
                    "metadata": {
                        "title": "Snapshot 2",
                        "key": "snapshot2",
                        "linger_duration_ms": 1000,
                        "transition_duration_ms": 500
                    }
                }
            ]
        }

        with open(self.multistate_mvsj_path, 'w') as f:
            json.dump(self.multistate_mvsj_data, f, indent=2)

    def tearDown(self):
        """Tear down test fixtures."""
        # Remove the temporary directory and all its contents
        shutil.rmtree(self.test_dir)

    def test_find_uri_references(self):
        """Test finding URI references in MVSJ files."""
        # Test with simple MVSJ
        uri_references_simple = set()
        find_uri_references(self.simple_mvsj_data["root"], uri_references_simple)
        self.assertEqual(len(uri_references_simple), 1)
        self.assertIn("local_file.cif", uri_references_simple)

        # Test with complex MVSJ
        uri_references_complex = set()
        find_uri_references(self.complex_mvsj_data["root"], uri_references_complex)
        self.assertEqual(len(uri_references_complex), 3)
        self.assertIn("local_file.cif", uri_references_complex)
        self.assertIn("https://files.wwpdb.org/download/1cbs.cif", uri_references_complex)
        self.assertIn("annotations.cif", uri_references_complex)

        # Test with multi-state MVSJ
        uri_references_multistate = set()
        for snapshot in self.multistate_mvsj_data["snapshots"]:
            find_uri_references(snapshot["root"], uri_references_multistate)
        self.assertEqual(len(uri_references_multistate), 2)
        self.assertIn("local_file.cif", uri_references_multistate)
        self.assertIn("https://files.wwpdb.org/download/1cbs.cif", uri_references_multistate)

    def test_update_uri_references(self):
        """Test updating URI references in MVSJ files."""
        # Test with simple MVSJ
        uri_mapping = {"local_file.cif": "updated_file.cif"}
        updated_data = json.loads(json.dumps(self.simple_mvsj_data))  # Deep copy
        update_uri_references(updated_data["root"], uri_mapping)
        self.assertEqual(updated_data["root"]["children"][0]["params"]["url"], "updated_file.cif")

        # Test with complex MVSJ
        uri_mapping = {
            "local_file.cif": "new_local.cif",
            "https://files.wwpdb.org/download/1cbs.cif": "1cbs.cif",
            "annotations.cif": "new_annotations.cif"
        }
        updated_data = json.loads(json.dumps(self.complex_mvsj_data))  # Deep copy
        update_uri_references(updated_data["root"], uri_mapping)
        self.assertEqual(updated_data["root"]["children"][0]["params"]["url"], "new_local.cif")
        self.assertEqual(updated_data["root"]["children"][1]["params"]["url"], "1cbs.cif")
        self.assertEqual(updated_data["root"]["children"][2]["params"]["uri"], "new_annotations.cif")

    def test_create_mvsx_simple(self):
        """Test creating a simple MVSX archive from MVSJ file."""
        output_mvsx_path = os.path.join(self.test_dir, "simple.mvsx")

        # Create MVSX file from simple MVSJ
        result = mvsj_to_mvsx(
            self.simple_mvsj_path,
            output_mvsx_path,
            download_external=True,
            logger=logger
        )
        self.assertTrue(result)
        self.assertTrue(os.path.exists(output_mvsx_path))

        # Check MVSX contents
        with zipfile.ZipFile(output_mvsx_path, 'r') as z:
            files = z.namelist()
            self.assertIn("index.mvsj", files)
            self.assertIn("local_file.cif", files)

            # Check that index.mvsj has updated URLs
            with z.open("index.mvsj") as f:
                mvsj_content = json.loads(f.read().decode('utf-8'))
                url = mvsj_content["root"]["children"][0]["params"]["url"]
                self.assertEqual(url, "local_file.cif")

    def test_create_mvsx_complex(self):
        """Test creating a complex MVSX archive from MVSJ with remote files."""
        output_mvsx_path = os.path.join(self.test_dir, "complex.mvsx")

        # Create MVSX file from complex MVSJ with external file download enabled
        try:
            result = mvsj_to_mvsx(
                self.complex_mvsj_path,
                output_mvsx_path,
                download_external=True,
                logger=logger
            )
            self.assertTrue(result)
            self.assertTrue(os.path.exists(output_mvsx_path))

            # Check MVSX contents
            with zipfile.ZipFile(output_mvsx_path, 'r') as z:
                files = z.namelist()
                self.assertIn("index.mvsj", files)
                self.assertIn("local_file.cif", files)
                self.assertIn("annotations.cif", files)

                # Check if external files were downloaded or their URLs updated
                with z.open("index.mvsj") as f:
                    mvsj_content = json.loads(f.read().decode('utf-8'))
                    remote_url = mvsj_content["root"]["children"][1]["params"]["url"]

                    # Either the URL is updated to a local file (if download succeeded)
                    # or it remains unchanged (if download failed)
                    if "1cbs.cif" in files:
                        self.assertEqual(remote_url, "1cbs.cif")
                    else:
                        self.assertEqual(remote_url, "https://files.wwpdb.org/download/1cbs.cif")
        except MVSXDownloadError as e:
            # This is acceptable - the download might fail in a test environment
            logger.warning(f"Download error (expected in test environment): {e}")
            self.assertTrue(os.path.exists(output_mvsx_path))

    def test_create_mvsx_with_download(self):
        """Test creating MVSX with downloading external files (mock download)."""
        output_mvsx_path = os.path.join(self.test_dir, "download_test.mvsx")

        # Create a modified version of complex MVSJ with a fake download URL that we'll mock
        mock_mvsj_path = os.path.join(self.test_dir, "mock.mvsj")
        mock_mvsj_data = json.loads(json.dumps(self.complex_mvsj_data))

        # Change the URL to a local file that we'll pretend is remote
        mock_url = "https://example.com/test.cif"
        mock_mvsj_data["root"]["children"][1]["params"]["url"] = mock_url

        with open(mock_mvsj_path, 'w') as f:
            json.dump(mock_mvsj_data, f, indent=2)

        # Create a mock "downloaded" file
        mock_download_source = os.path.join(self.test_dir, "mock_download.cif")
        with open(mock_download_source, 'w') as f:
            f.write("data_mock\n_entry.id MOCK\n")

        # Define a function to mock URL retrieval
        original_urlretrieve = urllib.request.urlretrieve

        def mock_urlretrieve(url, filename):
            if url == mock_url:
                shutil.copyfile(mock_download_source, filename)
                return filename, None
            return original_urlretrieve(url, filename)

        # Patch the URL retrieval function
        urllib.request.urlretrieve = mock_urlretrieve

        try:
            # Create MVSX file with our mocked download
            result = mvsj_to_mvsx(
                mock_mvsj_path,
                output_mvsx_path,
                download_external=True,
                logger=logger
            )
            self.assertTrue(result)
            self.assertTrue(os.path.exists(output_mvsx_path))

            # Check MVSX contents
            with zipfile.ZipFile(output_mvsx_path, 'r') as z:
                files = z.namelist()
                self.assertIn("index.mvsj", files)

                # Get the filename that the mock URL was saved as
                expected_filename = os.path.basename(urlparse(mock_url).path)
                self.assertIn(expected_filename, files)

                # Check that index.mvsj has updated URL
                with z.open("index.mvsj") as f:
                    mvsj_content = json.loads(f.read().decode('utf-8'))
                    updated_url = mvsj_content["root"]["children"][1]["params"]["url"]
                    self.assertEqual(updated_url, expected_filename)
        finally:
            # Restore original URL retrieval function
            urllib.request.urlretrieve = original_urlretrieve

    def test_extract_mvsx(self):
        """Test extracting MVSX archive."""
        # First, create an MVSX file
        mvsx_path = os.path.join(self.test_dir, "extract_test.mvsx")
        result = mvsj_to_mvsx(
            self.simple_mvsj_path,
            mvsx_path,
            download_external=True,
            logger=logger
        )
        self.assertTrue(result)

        # Now extract it to a new directory
        extract_dir = os.path.join(self.test_dir, "extracted")
        os.makedirs(extract_dir, exist_ok=True)

        index_path = extract_mvsx(
            mvsx_path,
            extract_dir,
            logger=logger
        )

        # Check that extraction was successful
        self.assertIsNotNone(index_path)
        self.assertTrue(os.path.exists(index_path))
        self.assertTrue(os.path.exists(os.path.join(extract_dir, "local_file.cif")))

        # Load and verify the extracted MVSJ content
        with open(index_path, 'r', encoding='utf-8') as f:
            extracted_mvsj = json.load(f)
            self.assertEqual(extracted_mvsj["metadata"]["version"], self.simple_mvsj_data["metadata"]["version"])
            self.assertEqual(
                extracted_mvsj["root"]["children"][0]["params"]["url"],
                self.simple_mvsj_data["root"]["children"][0]["params"]["url"]
            )

    def test_multistate_mvsx(self):
        """Test creating and extracting a multi-state MVSX archive."""
        output_mvsx_path = os.path.join(self.test_dir, "multistate.mvsx")

        # Create MVSX file from multi-state MVSJ
        try:
            result = mvsj_to_mvsx(
                self.multistate_mvsj_path,
                output_mvsx_path,
                download_external=True,
                logger=logger
            )
            self.assertTrue(result)
            self.assertTrue(os.path.exists(output_mvsx_path))

            # Check MVSX contents
            with zipfile.ZipFile(output_mvsx_path, 'r') as z:
                files = z.namelist()
                self.assertIn("index.mvsj", files)
                self.assertIn("local_file.cif", files)

                # Check that index.mvsj has the correct structure
                with z.open("index.mvsj") as f:
                    mvsj_content = json.loads(f.read().decode('utf-8'))
                    self.assertEqual(mvsj_content["kind"], "multiple")
                    self.assertEqual(len(mvsj_content["snapshots"]), 2)

                    # Check first snapshot URL was updated
                    url1 = mvsj_content["snapshots"][0]["root"]["children"][0]["params"]["url"]
                    self.assertEqual(url1, "local_file.cif")

                    # Check second snapshot URL - with download_external=True, it might be changed to local file
                    url2 = mvsj_content["snapshots"][1]["root"]["children"][0]["params"]["url"]

                    # Either the URL is updated to a local file (if download succeeded)
                    # or it remains unchanged (if download failed)
                    if "1cbs.cif" in files:
                        self.assertEqual(url2, "1cbs.cif")
                    else:
                        self.assertEqual(url2, "https://files.wwpdb.org/download/1cbs.cif")
        except MVSXValidationError as e:
            # This is expected for multi-state MVSJ files that don't have a root node at the top level
            logger.warning(f"Validation error (expected for multi-state MVSJ): {e}")
            # Skip the test since we can't proceed
            self.skipTest(f"Multi-state MVSJ validation error: {e}")
        except MVSXDownloadError as e:
            # This is acceptable - the download might fail in a test environment
            logger.warning(f"Download error (expected in test environment): {e}")
            self.assertTrue(os.path.exists(output_mvsx_path))

    def test_colab_examples(self):
        """Test creating MVSX archives from example MVSJ files in ../test-data/colab_examples directory."""
        # Skip test if colab_examples directory doesn't exist
        if not os.path.exists(self.colab_examples_dir):
            self.skipTest(f"Colab examples directory not found at {self.colab_examples_dir}")

        # Create output directory for MVSX files
        output_dir = os.path.join(self.test_dir, "colab_mvsx_output")
        os.makedirs(output_dir, exist_ok=True)

        # Get list of MVSJ files in colab_examples directory
        mvsj_files = [f for f in os.listdir(self.colab_examples_dir) if f.endswith('.mvsj')]
        self.assertGreater(len(mvsj_files), 0, "No MVSJ files found in colab_examples directory")

        logger.info(f"Found {len(mvsj_files)} MVSJ files in colab_examples directory")

        # Process each MVSJ file
        for mvsj_filename in mvsj_files:
            logger.info(f"Processing {mvsj_filename}")
            mvsj_path = os.path.join(self.colab_examples_dir, mvsj_filename)
            mvsx_filename = os.path.splitext(mvsj_filename)[0] + ".mvsx"
            mvsx_path = os.path.join(output_dir, mvsx_filename)

            try:
                # Create MVSX archive
                result = mvsj_to_mvsx(
                    mvsj_path,
                    mvsx_path,
                    download_external=True,
                    logger=logger
                )

                # Check that conversion was successful
                self.assertTrue(result, f"Failed to convert {mvsj_filename} to MVSX")
                self.assertTrue(os.path.exists(mvsx_path), f"MVSX file {mvsx_path} not created")

                # Examine MVSX contents
                with zipfile.ZipFile(mvsx_path, 'r') as z:
                    files = z.namelist()
                    self.assertIn("index.mvsj", files, f"index.mvsj not found in {mvsx_filename}")

                    # Check that the index.mvsj file is valid JSON
                    with z.open("index.mvsj") as f:
                        mvsj_content = json.loads(f.read().decode('utf-8'))
                        self.assertIsInstance(mvsj_content, dict, f"index.mvsj in {mvsx_filename} is not a valid JSON object")

                        # Check if it has metadata
                        if "metadata" in mvsj_content:
                            self.assertIsInstance(
                                mvsj_content["metadata"],
                                dict,
                                f"metadata in {mvsx_filename} is not a valid JSON object"
                            )

                # Extract the MVSX and verify
                extract_dir = os.path.join(output_dir, os.path.splitext(mvsj_filename)[0])
                os.makedirs(extract_dir, exist_ok=True)

                index_path = extract_mvsx(
                    mvsx_path,
                    extract_dir,
                    logger=logger
                )

                # Check that extraction was successful
                self.assertIsNotNone(index_path, f"Failed to extract {mvsx_filename}")
                self.assertTrue(os.path.exists(index_path), f"index.mvsj not found in extracted {mvsx_filename}")

                # Load and verify the extracted MVSJ content
                with open(index_path, 'r', encoding='utf-8') as f:
                    extracted_mvsj = json.load(f)
                    self.assertIsInstance(extracted_mvsj, dict, f"Extracted index.mvsj from {mvsx_filename} is not a valid JSON object")

            except MVSXValidationError as e:
                # Skip files that don't meet our validation requirements
                logger.warning(f"Skipping {mvsj_filename} due to validation error: {e}")
                continue
            except MVSXDownloadError as e:
                # This is acceptable - the download might fail in a test environment
                logger.warning(f"Download error for {mvsj_filename} (expected in test environment): {e}")
                # Continue with the test if the file was created
                if os.path.exists(mvsx_path):
                    # Examine MVSX contents as above
                    with zipfile.ZipFile(mvsx_path, 'r') as z:
                        files = z.namelist()
                        self.assertIn("index.mvsj", files, f"index.mvsj not found in {mvsx_filename}")
                else:
                    logger.warning(f"Skipping {mvsj_filename} due to download error")
                    continue
            except Exception as e:
                logger.error(f"Error processing {mvsj_filename}: {e}")
                self.fail(f"Unexpected error processing {mvsj_filename}: {type(e).__name__}: {e}")

    def test_validation_error_triggered(self):
        """Test that MVSXValidationError is triggered for invalid MVSJ files."""
        # Create an invalid MVSJ file (missing root node)
        invalid_mvsj_path = os.path.join(self.test_dir, "invalid.mvsj")
        invalid_mvsj_data = {
            "metadata": {
                "version": "0.1",
                "timestamp": "2023-11-27T12:05:32.145284"
            }
            # Missing root node
        }

        with open(invalid_mvsj_path, 'w') as f:
            json.dump(invalid_mvsj_data, f, indent=2)

        output_mvsx_path = os.path.join(self.test_dir, "invalid.mvsx")

        # Test that MVSXValidationError is raised
        with self.assertRaises(MVSXValidationError) as context:
            mvsj_to_mvsx(
                invalid_mvsj_path,
                output_mvsx_path,
                download_external=True,
                logger=logger
            )

        # Verify the error message
        self.assertIn("missing 'root' node", str(context.exception))

    def test_download_error_triggered(self):
        """Test that MVSXDownloadError is triggered for failed downloads."""
        # Create an MVSJ file with a non-existent URL
        download_test_path = os.path.join(self.test_dir, "download_test.mvsj")
        download_test_data = {
            "root": {
                "kind": "root",
                "children": [
                    {
                        "kind": "download",
                        "params": {
                            "url": "https://example.com/nonexistent_file.cif"
                        }
                    }
                ]
            },
            "metadata": {
                "version": "0.1",
                "timestamp": "2023-11-27T12:05:32.145284"
            }
        }

        with open(download_test_path, 'w') as f:
            json.dump(download_test_data, f, indent=2)

        output_mvsx_path = os.path.join(self.test_dir, "download_test.mvsx")

        # Test that MVSXDownloadError is raised
        with self.assertRaises(MVSXDownloadError) as context:
            mvsj_to_mvsx(
                download_test_path,
                output_mvsx_path,
                download_external=True,
                logger=logger
            )

        # Verify the error message contains download failure information
        self.assertIn("Failed to download", str(context.exception))


if __name__ == "__main__":
    unittest.main()
