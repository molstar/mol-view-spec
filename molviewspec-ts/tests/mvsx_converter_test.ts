/**
 * Test module for MVSX converter functionality.
 * Tests the conversion between MVSJ and MVSX formats using same test data as Python.
 */

import { assertEquals, assertExists, assert } from "@std/assert";
import { join } from "@std/path";
import {
  mvsjToMvsx,
  extractMvsx,
  findUriReferences,
  updateUriReferences,
  MVSXValidationError,
  MVSXDownloadError,
} from "../molviewspec/mvsx_converter.ts";
import { createBuilder } from "../molviewspec/builder.ts";
import type { State, States } from "../molviewspec/nodes.ts";

// Helper to create temporary test files
async function createTempDir(): Promise<string> {
  return await Deno.makeTempDir({ prefix: "mvsx_test_" });
}

async function createTestMvsj(dir: string, filename: string, content: unknown): Promise<string> {
  const path = join(dir, filename);
  await Deno.writeTextFile(path, JSON.stringify(content, null, 2));
  return path;
}

Deno.test("mvsx_converter - find URI references in simple MVSJ", () => {
  const builder = createBuilder();
  builder.download("local_file.cif").parse("mmcif");

  const state = builder.getState();
  const uris = new Set<string>();
  findUriReferences(state.root, uris);

  assertEquals(uris.size, 1);
  assert(uris.has("local_file.cif"));
});

Deno.test("mvsx_converter - find URI references in complex MVSJ", () => {
  const builder = createBuilder();
  builder.download("local.cif").parse("mmcif").modelStructure();
  builder
    .download("https://files.wwpdb.org/download/1cbs.cif")
    .parse("mmcif")
    .modelStructure();

  const state = builder.getState();
  const uris = new Set<string>();
  findUriReferences(state.root, uris);

  assertEquals(uris.size, 2);
  assert(uris.has("local.cif"));
  assert(uris.has("https://files.wwpdb.org/download/1cbs.cif"));
});

Deno.test("mvsx_converter - update URI references", () => {
  const builder = createBuilder();
  builder.download("old.cif").parse("mmcif");

  const state = builder.getState();
  const uriMapping = new Map<string, string>();
  uriMapping.set("old.cif", "new.cif");

  updateUriReferences(state.root, uriMapping);

  assertEquals(state.root.children![0].params?.url, "new.cif");
});

Deno.test("mvsx_converter - create simple MVSX from colab example", async () => {
  const tempDir = await createTempDir();

  try {
    // Use the minimal.mvsj from colab_examples
    const inputPath = "../test-data/colab_examples/minimal.mvsj";
    const outputPath = join(tempDir, "minimal.mvsx");

    // Create MVSX (without downloading external files for this test)
    const result = await mvsjToMvsx({
      inputMvsjPath: inputPath,
      outputMvsxPath: outputPath,
      downloadExternal: false, // Don't download to avoid network dependency
    });

    assertEquals(result, true);

    // Verify the file was created
    const fileInfo = await Deno.stat(outputPath);
    assert(fileInfo.isFile);
    assert(fileInfo.size > 0);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("mvsx_converter - create and extract MVSX", async () => {
  const tempDir = await createTempDir();

  try {
    // Create a simple MVSJ file with local reference
    const testData = {
      kind: "single",
      root: {
        kind: "root",
        children: [
          {
            kind: "camera",
            params: {
              target: [0, 0, 0],
            },
          },
        ],
      },
      metadata: {
        version: "1.8.1",
        timestamp: new Date().toISOString(),
      },
    };

    const mvsjPath = await createTestMvsj(tempDir, "test.mvsj", testData);
    const mvsxPath = join(tempDir, "test.mvsx");

    // Create MVSX
    const created = await mvsjToMvsx({
      inputMvsjPath: mvsjPath,
      outputMvsxPath: mvsxPath,
      downloadExternal: false,
    });

    assertEquals(created, true);

    // Extract MVSX
    const extractDir = join(tempDir, "extracted");
    const indexPath = await extractMvsx({
      mvsxPath: mvsxPath,
      outputDir: extractDir,
    });

    assertExists(indexPath);
    assert(indexPath.endsWith("index.mvsj"));

    // Read and verify the extracted content
    const extractedContent = await Deno.readTextFile(indexPath);
    const extractedData = JSON.parse(extractedContent);

    assertEquals(extractedData.kind, testData.kind);
    assertEquals(extractedData.metadata.version, testData.metadata.version);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("mvsx_converter - handle multi-state MVSJ", async () => {
  const tempDir = await createTempDir();

  try {
    const builder = createBuilder();

    // First snapshot
    builder.camera({ target: [0, 0, 0] });
    builder.saveState({
      title: "State 1",
      linger_duration_ms: 1000,
    });

    // Second snapshot
    builder.camera({ target: [1, 1, 1] });
    builder.saveState({
      title: "State 2",
      linger_duration_ms: 1000,
    });

    const states = builder.getStates({ title: "Multi-state Test" });

    // Find URIs in multi-state
    const uris = new Set<string>();
    for (const snapshot of states.snapshots) {
      findUriReferences(snapshot.root, uris);
    }

    // Should have no URIs in this simple example
    assertEquals(uris.size, 0);

    // Create MVSX from multi-state
    const mvsjPath = await createTestMvsj(tempDir, "multistate.mvsj", states);
    const mvsxPath = join(tempDir, "multistate.mvsx");

    const result = await mvsjToMvsx({
      inputMvsjPath: mvsjPath,
      outputMvsxPath: mvsxPath,
      downloadExternal: false,
    });

    assertEquals(result, true);

    // Extract and verify
    const extractDir = join(tempDir, "extracted_multi");
    const indexPath = await extractMvsx({
      mvsxPath: mvsxPath,
      outputDir: extractDir,
    });

    const extractedContent = await Deno.readTextFile(indexPath);
    const extractedData = JSON.parse(extractedContent) as States;

    assertEquals(extractedData.kind, "multiple");
    assertEquals(extractedData.snapshots.length, 2);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("mvsx_converter - validate missing root node", async () => {
  const tempDir = await createTempDir();

  try {
    const invalidData = {
      metadata: {
        version: "1.8.1",
        timestamp: new Date().toISOString(),
      },
      // Missing root node
    };

    const mvsjPath = await createTestMvsj(tempDir, "invalid.mvsj", invalidData);
    const mvsxPath = join(tempDir, "invalid.mvsx");

    let errorThrown = false;
    try {
      await mvsjToMvsx({
        inputMvsjPath: mvsjPath,
        outputMvsxPath: mvsxPath,
        downloadExternal: false,
      });
    } catch (e) {
      errorThrown = true;
      assert(e instanceof MVSXValidationError);
      assert(e.message.includes("missing 'root' node"));
    }

    assert(errorThrown, "Expected MVSXValidationError to be thrown");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("mvsx_converter - test with all colab examples (no download)", async () => {
  const exampleFiles = [
    "minimal.mvsj",
    "components.mvsj",
    "geometrical.mvsj",
    "labels.mvsj",
    "volumetric.mvsj",
    "superimpose.mvsj",
  ];

  const tempDir = await createTempDir();

  try {
    for (const filename of exampleFiles) {
      console.log(`Testing MVSX conversion for ${filename}`);

      const inputPath = `../test-data/colab_examples/${filename}`;
      const outputPath = join(tempDir, filename.replace(".mvsj", ".mvsx"));

      // Create MVSX (without downloading external files)
      const result = await mvsjToMvsx({
        inputMvsjPath: inputPath,
        outputMvsxPath: outputPath,
        downloadExternal: false,
      });

      assertEquals(result, true, `Failed to create MVSX for ${filename}`);

      // Verify the MVSX file was created
      const fileInfo = await Deno.stat(outputPath);
      assert(fileInfo.isFile, `MVSX file not created for ${filename}`);
      assert(fileInfo.size > 0, `MVSX file is empty for ${filename}`);

      // Extract and verify
      const extractDir = join(tempDir, filename.replace(".mvsj", "_extracted"));
      const indexPath = await extractMvsx({
        mvsxPath: outputPath,
        outputDir: extractDir,
      });

      assertExists(indexPath, `index.mvsj not found for ${filename}`);

      // Verify extracted content is valid JSON
      const extractedContent = await Deno.readTextFile(indexPath);
      const extractedData = JSON.parse(extractedContent);
      assertExists(extractedData.metadata, `Metadata missing in extracted ${filename}`);

      console.log(`✓ Successfully processed ${filename}`);
    }
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("mvsx_converter - URI mapping preserves structure", async () => {
  const tempDir = await createTempDir();

  try {
    const builder = createBuilder();
    builder.download("file1.cif").parse("mmcif").modelStructure();
    builder.download("file2.cif").parse("mmcif").modelStructure();

    const state = builder.getState();

    // Count nodes before
    const countNodes = (node: any): number => {
      let count = 1;
      if (node.children) {
        for (const child of node.children) {
          count += countNodes(child);
        }
      }
      return count;
    };

    const nodesBefore = countNodes(state.root);

    // Update URIs
    const uriMapping = new Map<string, string>();
    uriMapping.set("file1.cif", "new1.cif");
    uriMapping.set("file2.cif", "new2.cif");
    updateUriReferences(state.root, uriMapping);

    // Count nodes after
    const nodesAfter = countNodes(state.root);

    // Structure should be preserved
    assertEquals(nodesAfter, nodesBefore);

    // But URLs should be updated
    assertEquals(state.root.children![0].params?.url, "new1.cif");
    assertEquals(state.root.children![1].params?.url, "new2.cif");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("mvsx_converter - roundtrip preserves data", async () => {
  const tempDir = await createTempDir();

  try {
    const builder = createBuilder();
    builder
      .download("https://example.com/test.cif")
      .parse("mmcif")
      .modelStructure()
      .component("all")
      .representation("cartoon")
      .color("blue");

    builder.camera({
      target: [0, 0, 0],
      position: [10, 10, 10],
    });

    const originalState = builder.getState({ title: "Roundtrip Test" });

    // Save to MVSJ
    const mvsjPath = await createTestMvsj(tempDir, "roundtrip.mvsj", originalState);
    const mvsxPath = join(tempDir, "roundtrip.mvsx");

    // Convert to MVSX
    await mvsjToMvsx({
      inputMvsjPath: mvsjPath,
      outputMvsxPath: mvsxPath,
      downloadExternal: false,
    });

    // Extract
    const extractDir = join(tempDir, "roundtrip_extracted");
    const indexPath = await extractMvsx({
      mvsxPath: mvsxPath,
      outputDir: extractDir,
    });

    // Load extracted data
    const extractedContent = await Deno.readTextFile(indexPath);
    const extractedState = JSON.parse(extractedContent) as State;

    // Verify key properties are preserved
    assertEquals(extractedState.kind, originalState.kind);
    assertEquals(extractedState.metadata.title, originalState.metadata.title);
    assertEquals(extractedState.metadata.version, originalState.metadata.version);
    assertEquals(extractedState.root.kind, originalState.root.kind);

    // Verify we have the same number of top-level children
    assertEquals(
      extractedState.root.children?.length,
      originalState.root.children?.length,
    );
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
