/**
 * Test module for MVSJ data validation and manipulation.
 * These tests cover the core functionality that would be needed for MVSJ to MVSX conversion.
 */

import { assert, assertEquals, assertExists } from "@std/assert";
import { createBuilder } from "../molviewspec/builder.ts";
import type { Node, State } from "../molviewspec/nodes.ts";
import { validateStateTree } from "../molviewspec/nodes.ts";

/**
 * Helper to recursively find all URI references in a tree
 */
function findUriReferences(node: Node, uris: Set<string>): void {
  // Check download nodes
  if (node.kind === "download" && node.params?.url) {
    uris.add(node.params.url as string);
  }

  // Check URI-based nodes
  if (
    (node.kind === "component_from_uri" ||
      node.kind === "color_from_uri" ||
      node.kind === "label_from_uri" ||
      node.kind === "tooltip_from_uri" ||
      node.kind === "primitives_from_uri") &&
    node.params?.uri
  ) {
    uris.add(node.params.uri as string);
  }

  // Recurse into children
  if (node.children) {
    for (const child of node.children) {
      findUriReferences(child, uris);
    }
  }
}

/**
 * Helper to recursively update URI references in a tree
 */
function updateUriReferences(
  node: Node,
  uriMapping: Map<string, string>,
): void {
  // Update download nodes
  if (node.kind === "download" && node.params?.url) {
    const oldUrl = node.params.url as string;
    if (uriMapping.has(oldUrl)) {
      node.params.url = uriMapping.get(oldUrl);
    }
  }

  // Update URI-based nodes
  if (
    (node.kind === "component_from_uri" ||
      node.kind === "color_from_uri" ||
      node.kind === "label_from_uri" ||
      node.kind === "tooltip_from_uri" ||
      node.kind === "primitives_from_uri") &&
    node.params?.uri
  ) {
    const oldUri = node.params.uri as string;
    if (uriMapping.has(oldUri)) {
      node.params.uri = uriMapping.get(oldUri);
    }
  }

  // Recurse into children
  if (node.children) {
    for (const child of node.children) {
      updateUriReferences(child, uriMapping);
    }
  }
}

/**
 * Helper to check if a URI is a remote URL
 */
function isRemoteUrl(uri: string): boolean {
  return uri.startsWith("http://") || uri.startsWith("https://");
}

Deno.test("mvsj_validation - find URI references in simple tree", () => {
  const builder = createBuilder();
  builder.download("local_file.cif").parse("mmcif");

  const state = builder.getState();
  const uris = new Set<string>();
  findUriReferences(state.root, uris);

  assertEquals(uris.size, 1);
  assert(uris.has("local_file.cif"));
});

Deno.test("mvsj_validation - find URI references in complex tree", () => {
  const builder = createBuilder();

  // Add local file download
  builder.download("local_file.cif").parse("mmcif").modelStructure();

  // Add remote file download
  builder
    .download("https://files.wwpdb.org/download/1cbs.cif")
    .parse("mmcif")
    .modelStructure();

  const state = builder.getState();
  const uris = new Set<string>();
  findUriReferences(state.root, uris);

  assertEquals(uris.size, 2);
  assert(uris.has("local_file.cif"));
  assert(uris.has("https://files.wwpdb.org/download/1cbs.cif"));
});

Deno.test("mvsj_validation - find URI references with color_from_uri", () => {
  const builder = createBuilder();
  builder
    .download("structure.cif")
    .parse("mmcif")
    .modelStructure()
    .component("all")
    .representation("cartoon")
    .colorFromUri({
      uri: "colors.cif",
      schema: "residue_range",
    });

  const state = builder.getState();
  const uris = new Set<string>();
  findUriReferences(state.root, uris);

  assertEquals(uris.size, 2);
  assert(uris.has("structure.cif"));
  assert(uris.has("colors.cif"));
});

Deno.test("mvsj_validation - find URI references in multi-state", () => {
  const builder = createBuilder();

  // First snapshot
  builder.download("file1.cif").parse("mmcif");
  builder.saveState({
    title: "State 1",
    linger_duration_ms: 1000,
  });

  // Second snapshot
  builder.download("https://example.com/file2.cif").parse("mmcif");
  builder.saveState({
    title: "State 2",
    linger_duration_ms: 1000,
  });

  const states = builder.getStates();
  const uris = new Set<string>();

  // Find URIs in all snapshots
  for (const snapshot of states.snapshots) {
    findUriReferences(snapshot.root, uris);
  }

  assertEquals(uris.size, 2);
  assert(uris.has("file1.cif"));
  assert(uris.has("https://example.com/file2.cif"));
});

Deno.test("mvsj_validation - update URI references", () => {
  const builder = createBuilder();
  builder.download("local_file.cif").parse("mmcif");

  const state = builder.getState();

  // Create URI mapping
  const uriMapping = new Map<string, string>();
  uriMapping.set("local_file.cif", "updated_file.cif");

  // Update URIs
  updateUriReferences(state.root, uriMapping);

  // Verify update
  const downloadNode = state.root.children![0];
  assertEquals(downloadNode.params?.url, "updated_file.cif");
});

Deno.test("mvsj_validation - update multiple URI references", () => {
  const builder = createBuilder();
  builder.download("local.cif").parse("mmcif").modelStructure();
  builder
    .download("https://files.wwpdb.org/download/1cbs.cif")
    .parse("mmcif")
    .modelStructure();

  const state = builder.getState();

  // Create URI mapping
  const uriMapping = new Map<string, string>();
  uriMapping.set("local.cif", "new_local.cif");
  uriMapping.set("https://files.wwpdb.org/download/1cbs.cif", "1cbs.cif");

  // Update URIs
  updateUriReferences(state.root, uriMapping);

  // Verify updates
  assertEquals(state.root.children![0].params?.url, "new_local.cif");
  assertEquals(state.root.children![1].params?.url, "1cbs.cif");
});

Deno.test("mvsj_validation - distinguish remote vs local URIs", () => {
  const remoteUrls = [
    "https://files.wwpdb.org/download/1cbs.cif",
    "http://example.com/file.cif",
  ];

  const localFiles = [
    "local_file.cif",
    "annotations.cif",
    "../data/structure.cif",
    "./colors.json",
  ];

  for (const url of remoteUrls) {
    assertEquals(isRemoteUrl(url), true, `${url} should be remote`);
  }

  for (const file of localFiles) {
    assertEquals(isRemoteUrl(file), false, `${file} should be local`);
  }
});

Deno.test("mvsj_validation - validate state tree structure", () => {
  const builder = createBuilder();
  builder.download("test.cif").parse("mmcif");

  const state = builder.getState();

  // Should be valid
  assertEquals(validateStateTree(state), true);
});

Deno.test("mvsj_validation - validate multi-state structure", () => {
  const builder = createBuilder();

  builder.download("file1.cif").parse("mmcif");
  builder.saveState({
    title: "State 1",
    linger_duration_ms: 1000,
  });

  builder.download("file2.cif").parse("mmcif");
  builder.saveState({
    title: "State 2",
    linger_duration_ms: 1000,
  });

  const states = builder.getStates();

  // Should be valid
  assertEquals(validateStateTree(states), true);
  assertEquals(states.kind, "multiple");
  assertEquals(states.snapshots.length, 2);
});

Deno.test("mvsj_validation - invalid state tree (missing root)", () => {
  const invalidState = {
    metadata: {
      version: "1.8.1",
      timestamp: "2024-01-01T00:00:00Z",
    },
  } as State;

  // Should be invalid
  assertEquals(validateStateTree(invalidState), false);
});

Deno.test("mvsj_validation - serialize and deserialize state", () => {
  const builder = createBuilder();
  builder
    .download("https://files.wwpdb.org/download/1cbs.cif")
    .parse("mmcif")
    .modelStructure()
    .component("all")
    .representation("cartoon")
    .color("blue");

  const state = builder.getState({ title: "Test State" });

  // Serialize to JSON
  const json = JSON.stringify(state, null, 2);

  // Deserialize
  const deserialized = JSON.parse(json) as State;

  // Verify structure is preserved
  assertEquals(deserialized.kind, state.kind);
  assertEquals(deserialized.metadata.title, state.metadata.title);
  assertEquals(deserialized.metadata.version, state.metadata.version);
  assertEquals(deserialized.root.kind, "root");

  // Verify tree structure is preserved
  const urisOriginal = new Set<string>();
  const urisDeserialized = new Set<string>();
  findUriReferences(state.root, urisOriginal);
  findUriReferences(deserialized.root, urisDeserialized);

  assertEquals(urisDeserialized.size, urisOriginal.size);
  for (const uri of urisOriginal) {
    assert(urisDeserialized.has(uri));
  }
});

Deno.test("mvsj_validation - handle URI references in all node types", () => {
  const builder = createBuilder();

  // Test various URI-containing nodes
  builder.download("structure.cif").parse("mmcif").modelStructure();
  builder.primitivesFromUri("primitives.json");

  const state = builder.getState();
  const uris = new Set<string>();
  findUriReferences(state.root, uris);

  assertEquals(uris.size, 2);
  assert(uris.has("structure.cif"));
  assert(uris.has("primitives.json"));
});

Deno.test("mvsj_validation - update preserves tree structure", () => {
  const builder = createBuilder();
  builder
    .download("old.cif")
    .parse("mmcif")
    .modelStructure()
    .component("all")
    .representation("cartoon");

  const state = builder.getState();

  // Count nodes before update
  const countNodes = (node: Node): number => {
    let count = 1;
    if (node.children) {
      for (const child of node.children) {
        count += countNodes(child);
      }
    }
    return count;
  };

  const nodesBefore = countNodes(state.root);

  // Update URI
  const uriMapping = new Map<string, string>();
  uriMapping.set("old.cif", "new.cif");
  updateUriReferences(state.root, uriMapping);

  // Count nodes after update
  const nodesAfter = countNodes(state.root);

  // Node count should be unchanged
  assertEquals(nodesAfter, nodesBefore);

  // But URL should be updated
  assertEquals(state.root.children![0].params?.url, "new.cif");
});

Deno.test("mvsj_validation - metadata fields are present", () => {
  const builder = createBuilder();
  builder.camera({ target: [0, 0, 0] });

  const state = builder.getState({
    title: "Test",
    description: "Description",
  });

  assertExists(state.metadata);
  assertEquals(state.metadata.title, "Test");
  assertEquals(state.metadata.description, "Description");
  assertExists(state.metadata.version);
  assertExists(state.metadata.timestamp);

  // Timestamp should be ISO format
  const timestamp = new Date(state.metadata.timestamp);
  assertEquals(isNaN(timestamp.getTime()), false);
});

Deno.test("mvsj_validation - snapshot metadata fields", () => {
  const builder = createBuilder();
  builder.camera({ target: [0, 0, 0] });
  builder.saveState({
    title: "Snapshot",
    description: "Snapshot description",
    linger_duration_ms: 1000,
    transition_duration_ms: 500,
  });

  const states = builder.getStates();

  assertExists(states.snapshots[0].metadata);
  assertEquals(states.snapshots[0].metadata.title, "Snapshot");
  assertEquals(
    states.snapshots[0].metadata.description,
    "Snapshot description",
  );
  assertEquals(states.snapshots[0].metadata.linger_duration_ms, 1000);
  assertEquals(states.snapshots[0].metadata.transition_duration_ms, 500);
  assertExists(states.snapshots[0].metadata.key);
});
