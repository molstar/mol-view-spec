"""
Functions for converting between MVSJ (MolViewSpec JSON) and MVSX (MolViewSpec Archive) formats.

This module provides functionality for converting MVSJ (MolViewSpec JSON) files to
MVSX (MolViewSpec Archive) format and extracting MVSX archives.
"""

import json
import logging
import os
import tempfile
import urllib.request
import zipfile
from pathlib import Path
from urllib.parse import urljoin, urlparse


class MVSXError(Exception):
    """Base exception for MVSX-related errors."""


class MVSXDownloadError(MVSXError):
    """Exception raised when downloading external resources fails."""


class MVSXExtractionError(MVSXError):
    """Exception raised when extracting an MVSX archive fails."""


class MVSXValidationError(MVSXError):
    """Exception raised when an MVSX archive is invalid."""


def find_uri_references(node: dict, uri_references: set) -> None:
    """
    Recursively finds URI references in an MVSJ node structure.

    Args:
        node (dict): An MVSJ node to search
        uri_references (set): Set to collect found URI references
    """
    if not isinstance(node, dict):
        return

    # Check for URI parameters in this node
    if "params" in node and isinstance(node["params"], dict):
        params = node["params"]

        # Check for URI field directly
        if "uri" in params and isinstance(params["uri"], str):
            uri = params["uri"]
            uri_references.add(uri)

        # Check for URL field (for downloads)
        if "url" in params and isinstance(params["url"], str):
            url = params["url"]
            uri_references.add(url)

    # Recursively check children
    if "children" in node and isinstance(node["children"], list):
        for child in node["children"]:
            find_uri_references(child, uri_references)


def update_uri_references(node: dict, uri_mapping: dict) -> None:
    """
    Recursively updates URI references in an MVSJ node structure.

    Args:
        node (dict): An MVSJ node to update
        uri_mapping (dict): Mapping from original URIs to local filenames
    """
    if not isinstance(node, dict):
        return

    # Update URI parameters in this node
    if "params" in node and isinstance(node["params"], dict):
        params = node["params"]

        # Update 'uri' parameter if present
        if "uri" in params and params["uri"] in uri_mapping:
            params["uri"] = uri_mapping[params["uri"]]

        # Update 'url' parameter if present
        if "url" in params and params["url"] in uri_mapping:
            params["url"] = uri_mapping[params["url"]]

    # Recursively update children
    if "children" in node and isinstance(node["children"], list):
        for child in node["children"]:
            update_uri_references(child, uri_mapping)


def mvsj_to_mvsx(
    input_mvsj_path: str | os.PathLike,
    output_mvsx_path: str | os.PathLike,
    download_external: bool = True,  # Default is True to always download external files
    base_url: str | None = None,
    logger: logging.Logger | None = None,
    compresslevel: int | None = None,
) -> bool:
    """
    Create an MVSX archive from an MVSJ file, automatically including all referenced files.

    The function will:
    1. Parse the MVSJ file to identify URI references
    2. Download external resources (enabled by default)
    3. Package all files into an MVSX archive (which is a ZIP file)
    4. Update the MVSJ structure to use local references

    Args:
        input_mvsj_path (str | os.PathLike): Path to the input MVSJ file
        output_mvsx_path (str | os.PathLike): Path for the output MVSX file
        download_external (bool): Whether to download external resources. Defaults to True.
        base_url (str, optional): Base URL for resolving relative URLs. Defaults to None.
        logger (logging.Logger, optional): Logger to use. If None, logs are not produced.
        compresslevel (int, optional): Integers 0 through 9 specifying the compression level. Defaults to None.

    Returns:
        bool: True if successful, False otherwise

    Raises:
        MVSXError: If there's an error reading the MVSJ file
        MVSXDownloadError: If downloading external resources fails and download_external is True
        MVSXValidationError: If the MVSJ file is invalid or a referenced local file is missing
    """
    # Set up logging
    if logger is None:
        logger = logging.getLogger("mvsx_creator")
        logger.addHandler(logging.NullHandler())

    logger.info(f"Creating MVSX from {input_mvsj_path} to {output_mvsx_path}")

    # Convert to Path objects for easier path manipulation
    input_path = Path(input_mvsj_path)
    output_path = Path(output_mvsx_path)

    # Read the input MVSJ file
    try:
        with open(input_path, "r", encoding="utf-8") as f:
            mvsj_data = json.load(f)
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing MVSJ file: {e}")
        raise MVSXValidationError(f"Invalid MVSJ file format: {e}")
    except Exception as e:
        logger.error(f"Error reading MVSJ file: {e}")
        raise MVSXError(f"Failed to read MVSJ file: {e}")

    # Create a temporary directory for downloaded files
    with tempfile.TemporaryDirectory() as temp_dir:
        # Find all URI references
        uri_references: set[str] = set()

        # Check if this is a multi-state MVSJ file
        is_multistate = mvsj_data.get("kind") == "multiple"

        if is_multistate:
            # For multi-state MVSJ files, process each snapshot
            if "snapshots" not in mvsj_data or not isinstance(mvsj_data["snapshots"], list):
                raise MVSXValidationError("Multi-state MVSJ file is missing 'snapshots' list")

            for snapshot in mvsj_data["snapshots"]:
                if "root" in snapshot:
                    find_uri_references(snapshot["root"], uri_references)
                else:
                    raise MVSXValidationError("Snapshot is missing 'root' node")
        else:
            # For standard MVSJ files, start from root node
            if "root" in mvsj_data:
                find_uri_references(mvsj_data["root"], uri_references)
            else:
                raise MVSXValidationError("MVSJ file is missing 'root' node")

        # Create a mapping from original URIs to archive paths
        uri_mapping: dict[str, str] = {}
        download_errors = []

        # Process each URI reference
        for uri in uri_references:
            try:
                parsed_uri = urlparse(uri)

                # Check if it's an external URI that needs to be downloaded
                is_external = parsed_uri.scheme in ("http", "https", "ftp")

                if is_external and download_external:
                    # Form the full URL
                    if base_url and not parsed_uri.netloc:
                        # Relative URL with base_url provided
                        full_url = urljoin(base_url, uri)
                    else:
                        full_url = uri

                    logger.info(f"Downloading external resource: {full_url}")

                    # Extract filename from URL path
                    filename = os.path.basename(parsed_uri.path)
                    if not filename:
                        # Generate a name if none is available
                        filename = f"resource_{len(uri_mapping)}"

                    # Ensure we have a unique filename
                    local_path = os.path.join(temp_dir, filename)
                    counter = 1
                    while os.path.exists(local_path):
                        name, ext = os.path.splitext(filename)
                        filename = f"{name}_{counter}{ext}"
                        local_path = os.path.join(temp_dir, filename)
                        counter += 1

                    # Download the file
                    try:
                        urllib.request.urlretrieve(full_url, local_path)
                        # Add to the mapping
                        uri_mapping[uri] = filename
                    except Exception as e:
                        error_msg = f"Failed to download {full_url}: {e}"
                        logger.error(error_msg)
                        download_errors.append(error_msg)

                elif not is_external:
                    # Local file reference
                    local_file_path = input_path.parent / uri
                    if local_file_path.exists():
                        logger.info(f"Found local file: {local_file_path}")
                        # Keep the same relative path in the archive
                        uri_mapping[uri] = uri
                    else:
                        error_msg = f"Local file not found: {local_file_path}"
                        logger.error(error_msg)
                        raise MVSXValidationError(f"Missing local file: {local_file_path}")

            except MVSXValidationError:
                # Re-raise validation errors
                raise
            except Exception as e:
                logger.error(f"Error processing URI {uri}: {e}")

        # If we have download errors and download_external is True, raise an exception
        if download_errors and download_external:
            raise MVSXDownloadError(
                f"Failed to download {len(download_errors)} resources: {'; '.join(download_errors)}"
            )

        # Update the MVSJ structure to use local references
        if is_multistate:
            # For multi-state MVSJ files, update each snapshot
            for snapshot in mvsj_data["snapshots"]:
                if "root" in snapshot:
                    update_uri_references(snapshot["root"], uri_mapping)
        else:
            # For standard MVSJ files, update the root node
            if "root" in mvsj_data:
                update_uri_references(mvsj_data["root"], uri_mapping)

        # Create the MVSX archive
        try:
            with zipfile.ZipFile(
                file=output_path,
                mode="w",
                compression=zipfile.ZIP_DEFLATED,
                compresslevel=compresslevel,
            ) as z:
                # Add the modified MVSJ as index.mvsj
                index_mvsj_path = os.path.join(temp_dir, "index.mvsj")
                with open(index_mvsj_path, "w", encoding="utf-8") as f:
                    json.dump(mvsj_data, f, ensure_ascii=False, separators=(",", ":"))

                z.write(index_mvsj_path, arcname="index.mvsj")

                # Add all referenced local files
                for uri, archive_path in uri_mapping.items():
                    if not urlparse(uri).scheme or not download_external:
                        # This is a local file or we're not downloading
                        source_path = input_path.parent / uri
                        if source_path.exists():
                            z.write(source_path, arcname=archive_path)
                    elif download_external:
                        # This is a downloaded external file
                        source_path = Path(temp_dir) / archive_path
                        if os.path.exists(source_path):
                            z.write(source_path, arcname=archive_path)

            logger.info(f"MVSX archive created successfully: {output_path}")
            return True

        except Exception as e:
            logger.error(f"Error creating MVSX archive: {e}")
            raise MVSXError(f"Failed to create MVSX archive: {e}")


def extract_mvsx(
    mvsx_path: str | os.PathLike,
    output_dir: str | os.PathLike | None = None,
    logger: logging.Logger | None = None,
) -> str | None:
    """
    Extract an MVSX archive to a directory and return the path to the index.mvsj file.

    Args:
        mvsx_path (str | os.PathLike): Path to the MVSX file to extract
        output_dir (str | os.PathLike, optional): Directory to extract files to. If None, creates a temporary directory.
        logger (logging.Logger, optional): Logger to use. If None, logs are not produced.

    Returns:
        str | None: Path to the extracted index.mvsj file, or None if extraction failed

    Raises:
        MVSXExtractionError: If there's an error extracting the MVSX archive
        MVSXValidationError: If the MVSX archive is invalid (missing index.mvsj)
    """
    # Set up logging
    if logger is None:
        logger = logging.getLogger("mvsx_extractor")
        logger.addHandler(logging.NullHandler())

    try:
        # Create output directory if needed
        if output_dir is None:
            output_dir = tempfile.mkdtemp()
        else:
            output_dir = Path(output_dir)
            os.makedirs(output_dir, exist_ok=True)

        logger.info(f"Extracting MVSX from {mvsx_path} to {output_dir}")

        # Extract the archive
        try:
            with zipfile.ZipFile(mvsx_path, "r") as z:
                z.extractall(output_dir)
        except zipfile.BadZipFile:
            raise MVSXValidationError(f"Invalid MVSX archive: {mvsx_path} is not a valid ZIP file")
        except Exception as e:
            raise MVSXExtractionError(f"Failed to extract MVSX archive: {e}")

        # Find the index.mvsj file
        index_path = os.path.join(output_dir, "index.mvsj")
        if os.path.exists(index_path):
            logger.info(f"Successfully extracted index.mvsj to {index_path}")
            return index_path
        else:
            raise MVSXValidationError(f"Invalid MVSX archive: {mvsx_path} is missing index.mvsj")

    except MVSXError:
        # Re-raise our custom exceptions
        raise
    except Exception as e:
        # Convert other exceptions to MVSXExtractionError
        raise MVSXExtractionError(f"Error extracting MVSX archive: {e}")
