/**
 * Functions for converting between MVSJ (MolViewSpec JSON) and MVSX (MolViewSpec Archive) formats.
 *
 * This module provides functionality for converting MVSJ (MolViewSpec JSON) files to
 * MVSX (MolViewSpec Archive) format and extracting MVSX archives.
 */

import type { MVSData, Node, State, States } from "./nodes.ts";
import { basename, dirname, join } from "@std/path";
import { ensureDir } from "@std/fs";

/**
 * Base exception for MVSX-related errors.
 */
export class MVSXError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MVSXError";
  }
}

/**
 * Exception raised when downloading external resources fails.
 */
export class MVSXDownloadError extends MVSXError {
  constructor(message: string) {
    super(message);
    this.name = "MVSXDownloadError";
  }
}

/**
 * Exception raised when extracting an MVSX archive fails.
 */
export class MVSXExtractionError extends MVSXError {
  constructor(message: string) {
    super(message);
    this.name = "MVSXExtractionError";
  }
}

/**
 * Exception raised when an MVSX archive is invalid.
 */
export class MVSXValidationError extends MVSXError {
  constructor(message: string) {
    super(message);
    this.name = "MVSXValidationError";
  }
}

/**
 * Recursively finds URI references in an MVSJ node structure.
 */
export function findUriReferences(
  node: Node,
  uriReferences: Set<string>,
): void {
  if (!node || typeof node !== "object") {
    return;
  }

  // Check for URI parameters in this node
  if (node.params) {
    const params = node.params;

    // Check for URI field directly
    if ("uri" in params && typeof params.uri === "string") {
      uriReferences.add(params.uri);
    }

    // Check for URL field (for downloads)
    if ("url" in params && typeof params.url === "string") {
      uriReferences.add(params.url);
    }
  }

  // Recursively check children
  if (node.children) {
    for (const child of node.children) {
      findUriReferences(child, uriReferences);
    }
  }
}

/**
 * Recursively updates URI references in an MVSJ node structure.
 */
export function updateUriReferences(
  node: Node,
  uriMapping: Map<string, string>,
): void {
  if (!node || typeof node !== "object") {
    return;
  }

  // Update URI parameters in this node
  if (node.params) {
    const params = node.params;

    // Update 'uri' parameter if present
    if (
      "uri" in params &&
      typeof params.uri === "string" &&
      uriMapping.has(params.uri)
    ) {
      params.uri = uriMapping.get(params.uri);
    }

    // Update 'url' parameter if present
    if (
      "url" in params &&
      typeof params.url === "string" &&
      uriMapping.has(params.url)
    ) {
      params.url = uriMapping.get(params.url);
    }
  }

  // Recursively update children
  if (node.children) {
    for (const child of node.children) {
      updateUriReferences(child, uriMapping);
    }
  }
}

/**
 * Check if a URI is an external URL
 */
function isExternalUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    return (
      url.protocol === "http:" ||
      url.protocol === "https:" ||
      url.protocol === "ftp:"
    );
  } catch {
    return false;
  }
}

/**
 * Download a file from a URL
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }
  const data = await response.arrayBuffer();
  await Deno.writeFile(destPath, new Uint8Array(data));
}

export interface MvsjToMvsxOptions {
  /** Path to the input MVSJ file */
  inputMvsjPath: string;
  /** Path for the output MVSX file */
  outputMvsxPath: string;
  /** Whether to download external resources. Defaults to true. */
  downloadExternal?: boolean;
  /** Base URL for resolving relative URLs */
  baseUrl?: string;
  /** Compression level (0-9) */
  compressLevel?: number;
}

/**
 * Create an MVSX archive from an MVSJ file, automatically including all referenced files.
 *
 * The function will:
 * 1. Parse the MVSJ file to identify URI references
 * 2. Download external resources (enabled by default)
 * 3. Package all files into an MVSX archive (which is a ZIP file)
 * 4. Update the MVSJ structure to use local references
 *
 * @returns true if successful
 * @throws {MVSXError} If there's an error reading the MVSJ file
 * @throws {MVSXDownloadError} If downloading external resources fails
 * @throws {MVSXValidationError} If the MVSJ file is invalid or a referenced local file is missing
 */
export async function mvsjToMvsx(options: MvsjToMvsxOptions): Promise<boolean> {
  const {
    inputMvsjPath,
    outputMvsxPath,
    downloadExternal = true,
    baseUrl,
  } = options;

  console.log(`Creating MVSX from ${inputMvsjPath} to ${outputMvsxPath}`);

  // Read the input MVSJ file
  let mvsjData: MVSData;
  try {
    const content = await Deno.readTextFile(inputMvsjPath);
    mvsjData = JSON.parse(content) as MVSData;
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new MVSXValidationError(`Invalid MVSJ file format: ${e.message}`);
    }
    throw new MVSXError(`Failed to read MVSJ file: ${e}`);
  }

  // Create a temporary directory for downloaded files
  const tempDir = await Deno.makeTempDir();

  try {
    // Find all URI references
    const uriReferences: Set<string> = new Set();

    // Check if this is a multi-state MVSJ file
    const isMultistate = mvsjData.kind === "multiple";

    if (isMultistate) {
      // For multi-state MVSJ files, process each snapshot
      const states = mvsjData as States;
      if (!states.snapshots || !Array.isArray(states.snapshots)) {
        throw new MVSXValidationError(
          "Multi-state MVSJ file is missing 'snapshots' list",
        );
      }

      for (const snapshot of states.snapshots) {
        if (snapshot.root) {
          findUriReferences(snapshot.root, uriReferences);
        } else {
          throw new MVSXValidationError("Snapshot is missing 'root' node");
        }
      }
    } else {
      // For standard MVSJ files, start from root node
      const state = mvsjData as State;
      if (state.root) {
        findUriReferences(state.root, uriReferences);
      } else {
        throw new MVSXValidationError("MVSJ file is missing 'root' node");
      }
    }

    // Create a mapping from original URIs to archive paths
    const uriMapping: Map<string, string> = new Map();
    const downloadErrors: string[] = [];

    // Process each URI reference
    const inputDir = dirname(inputMvsjPath);

    for (const uri of uriReferences) {
      try {
        const isExternal = isExternalUri(uri);

        if (isExternal && downloadExternal) {
          // Form the full URL
          let fullUrl = uri;
          if (baseUrl && !uri.includes("://")) {
            fullUrl = new URL(uri, baseUrl).toString();
          }

          console.log(`Downloading external resource: ${fullUrl}`);

          // Extract filename from URL path
          let filename = basename(new URL(fullUrl).pathname);
          if (!filename) {
            filename = `resource_${uriMapping.size}`;
          }

          // Ensure we have a unique filename
          let localPath = join(tempDir, filename);
          let counter = 1;
          while (await Deno.stat(localPath).catch(() => null)) {
            const ext = filename.includes(".") ? filename.substring(filename.lastIndexOf(".")) : "";
            const name = filename.includes(".") ? filename.substring(0, filename.lastIndexOf(".")) : filename;
            filename = `${name}_${counter}${ext}`;
            localPath = join(tempDir, filename);
            counter++;
          }

          // Download the file
          try {
            await downloadFile(fullUrl, localPath);
            uriMapping.set(uri, filename);
          } catch (e) {
            const errorMsg = `Failed to download ${fullUrl}: ${e}`;
            console.error(errorMsg);
            downloadErrors.push(errorMsg);
          }
        } else if (!isExternal) {
          // Local file reference
          const localFilePath = join(inputDir, uri);
          try {
            await Deno.stat(localFilePath);
            console.log(`Found local file: ${localFilePath}`);
            // Keep the same relative path in the archive
            uriMapping.set(uri, uri);
          } catch {
            const errorMsg = `Local file not found: ${localFilePath}`;
            console.error(errorMsg);
            throw new MVSXValidationError(
              `Missing local file: ${localFilePath}`,
            );
          }
        }
      } catch (e) {
        if (e instanceof MVSXValidationError) {
          throw e;
        }
        console.error(`Error processing URI ${uri}: ${e}`);
      }
    }

    // If we have download errors and download_external is true, raise an exception
    if (downloadErrors.length > 0 && downloadExternal) {
      throw new MVSXDownloadError(
        `Failed to download ${downloadErrors.length} resources: ${downloadErrors.join("; ")}`,
      );
    }

    // Update the MVSJ structure to use local references
    if (isMultistate) {
      const states = mvsjData as States;
      for (const snapshot of states.snapshots) {
        if (snapshot.root) {
          updateUriReferences(snapshot.root, uriMapping);
        }
      }
    } else {
      const state = mvsjData as State;
      if (state.root) {
        updateUriReferences(state.root, uriMapping);
      }
    }

    // Create the MVSX archive using JSZip
    const JSZip = (await import("npm:jszip@3.10.1")).default;
    const zip = new JSZip();

    // Add the modified MVSJ as index.mvsj
    const indexMvsjContent = JSON.stringify(mvsjData, null, 0);
    zip.file("index.mvsj", indexMvsjContent);

    // Add all referenced local files
    for (const [uri, archivePath] of uriMapping.entries()) {
      if (!isExternalUri(uri) || !downloadExternal) {
        // This is a local file or we're not downloading
        const sourcePath = join(inputDir, uri);
        try {
          const fileContent = await Deno.readFile(sourcePath);
          zip.file(archivePath, fileContent);
        } catch {
          // File might not exist, skip it
        }
      } else if (downloadExternal) {
        // This is a downloaded external file
        const localPath = join(tempDir, archivePath);
        try {
          const fileContent = await Deno.readFile(localPath);
          zip.file(archivePath, fileContent);
        } catch {
          // File might not have been downloaded, skip it
        }
      }
    }

    // Generate the ZIP file
    const zipContent = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
    });
    await Deno.writeFile(outputMvsxPath, zipContent);

    console.log(`Successfully created MVSX archive: ${outputMvsxPath}`);
    return true;
  } finally {
    // Clean up temporary directory
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

export interface ExtractMvsxOptions {
  /** Path to the MVSX file to extract */
  mvsxPath: string;
  /** Directory to extract files to */
  outputDir: string;
}

/**
 * Extract an MVSX archive to a directory.
 *
 * @returns Path to the extracted index.mvsj file
 * @throws {MVSXExtractionError} If extraction fails
 * @throws {MVSXValidationError} If the MVSX file is invalid
 */
export async function extractMvsx(
  options: ExtractMvsxOptions,
): Promise<string> {
  const { mvsxPath, outputDir } = options;

  console.log(`Extracting MVSX from ${mvsxPath} to ${outputDir}`);

  // Ensure output directory exists
  await ensureDir(outputDir);

  try {
    // Read the MVSX file
    const mvsxContent = await Deno.readFile(mvsxPath);

    // Load with JSZip
    const JSZip = (await import("npm:jszip@3.10.1")).default;
    const zip = await JSZip.loadAsync(mvsxContent);

    // Check for index.mvsj
    if (!zip.files["index.mvsj"]) {
      throw new MVSXValidationError("MVSX archive is missing index.mvsj");
    }

    // Extract all files
    for (const [filename, file] of Object.entries(zip.files)) {
      if (file.dir) {
        continue;
      }

      const outputPath = join(outputDir, filename);
      await ensureDir(dirname(outputPath));

      const content = await file.async("uint8array");
      await Deno.writeFile(outputPath, content);
    }

    const indexPath = join(outputDir, "index.mvsj");
    console.log(`Successfully extracted MVSX archive to: ${outputDir}`);
    return indexPath;
  } catch (e) {
    if (e instanceof MVSXValidationError) {
      throw e;
    }
    throw new MVSXExtractionError(`Failed to extract MVSX: ${e}`);
  }
}
