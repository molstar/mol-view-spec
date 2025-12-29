/**
 * MVSX (MolViewSpec Archive) serialization for ZIP archives.
 */

import type { MVSData } from "./nodes.ts";
import { excludeNone } from "./utils.ts";

// Lazy load JSZip to avoid environment permission issues on import
let JSZip: any = null;
async function getJSZip() {
  if (JSZip === null) {
    const module = await import("npm:jszip@3.10.1");
    JSZip = module.default;
  }
  return JSZip;
}

/**
 * MVSX class for handling ZIP archive serialization.
 */
export class MVSX {
  data: MVSData;
  assets: Map<string, Uint8Array | string>;
  compresslevel: number | null;

  constructor(
    data: MVSData,
    assets: Record<string, Uint8Array | string> = {},
    compresslevel: number | null = null,
  ) {
    this.data = data;
    this.assets = new Map(Object.entries(assets));
    this.compresslevel = compresslevel;
  }

  /**
   * Add an asset to the archive.
   */
  addAsset(name: string, data: Uint8Array | string): void {
    this.assets.set(name, data);
  }

  /**
   * Add an asset from a file path.
   */
  async addAssetFromFile(name: string, filepath: string): Promise<void> {
    const data = await Deno.readFile(filepath);
    this.assets.set(name, data);
  }

  /**
   * Add an asset from a URL.
   */
  async addAssetFromUrl(name: string, url: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    this.assets.set(name, new Uint8Array(arrayBuffer));
  }

  /**
   * Serialize the data to a ZIP archive.
   */
  private async serialize(): Promise<Uint8Array> {
    const JSZipClass = await getJSZip();
    const zip = new JSZipClass();

    // Add the main index.mvsj file
    const cleaned = excludeNone(this.data);
    const jsonContent = JSON.stringify(cleaned, null, 2);
    zip.file("index.mvsj", new TextEncoder().encode(jsonContent));

    // Add all assets
    for (const [assetName, assetData] of this.assets) {
      if (typeof assetData === "string") {
        // Check if it's a URL
        try {
          const url = new URL(assetData);
          if (
            url.protocol === "http:" ||
            url.protocol === "https:" ||
            url.protocol === "ftp:"
          ) {
            await this.addAssetFromUrl(assetName, assetData);
            const data = this.assets.get(assetName);
            if (data && data instanceof Uint8Array) {
              zip.file(assetName, data);
            }
            continue;
          }
        } catch {
          // Not a URL, might be a file path
        }

        // Try as file path
        try {
          const fileData = await Deno.readFile(assetData);
          zip.file(assetName, fileData);
          continue;
        } catch {
          // If it fails, treat it as raw string content
          zip.file(assetName, new TextEncoder().encode(assetData));
        }
      } else {
        // Already Uint8Array
        zip.file(assetName, assetData);
      }
    }

    return await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: this.compresslevel !== null ? { level: this.compresslevel } : undefined,
    });
  }

  /**
   * Write the serialized data to a file.
   */
  async dump(filename: string): Promise<void> {
    const zipData = await this.serialize();
    await Deno.writeFile(filename, zipData);
  }

  /**
   * Serialize the data to a bytes object.
   */
  async dumps(): Promise<Uint8Array> {
    return await this.serialize();
  }

  /**
   * Load MVSX from a file.
   */
  static async load(filename: string): Promise<MVSX> {
    const zipData = await Deno.readFile(filename);
    return await MVSX.loads(zipData);
  }

  /**
   * Load MVSX from bytes.
   */
  static async loads(data: Uint8Array): Promise<MVSX> {
    const JSZipClass = await getJSZip();
    const zip = new JSZipClass();
    await zip.loadAsync(data);

    // Read index.mvsj
    const indexFile = zip.file("index.mvsj");
    if (!indexFile) {
      throw new Error("No index.mvsj found in archive");
    }

    const indexContent = await indexFile.async("string");
    const mvsData = JSON.parse(indexContent) as MVSData;

    // Read all other files as assets
    const assets: Record<string, Uint8Array> = {};
    for (const [filename, file] of Object.entries(zip.files)) {
      if (filename !== "index.mvsj" && !file.dir) {
        const content = await file.async("uint8array");
        assets[filename] = content;
      }
    }

    return new MVSX(mvsData, assets);
  }
}

/**
 * Convert MVSJ to MVSX with optional assets.
 */
export function mvsjToMvsx(
  data: MVSData,
  assets: Record<string, Uint8Array | string> = {},
  compresslevel: number | null = null,
): MVSX {
  return new MVSX(data, assets, compresslevel);
}
