/**
 * Test module using example MVSJ files from test-data/colab_examples.
 */

import { assertEquals, assertExists } from "@std/assert";
import { createBuilder } from "../molviewspec/builder.ts";
import type { MVSData, State } from "../molviewspec/nodes.ts";

/**
 * Helper to load and parse MVSJ files from test-data/colab_examples
 */
async function loadExampleMVSJ(filename: string): Promise<MVSData> {
  const path = `../test-data/colab_examples/${filename}`;
  const content = await Deno.readTextFile(path);
  return JSON.parse(content) as MVSData;
}

/**
 * Helper to recursively find all nodes of a specific kind
 */
function findNodesByKind(node: any, kind: string): any[] {
  const results: any[] = [];
  if (node.kind === kind) {
    results.push(node);
  }
  if (node.children) {
    for (const child of node.children) {
      results.push(...findNodesByKind(child, kind));
    }
  }
  return results;
}

Deno.test("examples - minimal.mvsj structure", async () => {
  const data = (await loadExampleMVSJ("minimal.mvsj")) as State;

  // Check top-level structure
  assertEquals(data.kind, "single");
  assertExists(data.root);
  assertExists(data.metadata);
  assertEquals(data.root.kind, "root");

  // Check that it has the expected nodes
  const downloadNodes = findNodesByKind(data.root, "download");
  assertEquals(downloadNodes.length, 1);
  assertEquals(
    downloadNodes[0].params.url,
    "https://files.wwpdb.org/download/1cbs.cif",
  );

  const parseNodes = findNodesByKind(data.root, "parse");
  assertEquals(parseNodes.length, 1);
  assertEquals(parseNodes[0].params.format, "mmcif");

  const structureNodes = findNodesByKind(data.root, "structure");
  assertEquals(structureNodes.length, 1);
  assertEquals(structureNodes[0].params.type, "model");

  const componentNodes = findNodesByKind(data.root, "component");
  assertEquals(componentNodes.length, 1);
  assertEquals(componentNodes[0].params.selector, "all");

  const representationNodes = findNodesByKind(data.root, "representation");
  assertEquals(representationNodes.length, 1);
  assertEquals(representationNodes[0].params.type, "cartoon");

  const colorNodes = findNodesByKind(data.root, "color");
  assertEquals(colorNodes.length, 1);
  assertEquals(colorNodes[0].params.color, "blue");
});

Deno.test("examples - minimal.mvsj builder recreation", async () => {
  const data = (await loadExampleMVSJ("minimal.mvsj")) as State;

  // Recreate using builder
  const builder = createBuilder();
  builder
    .download("https://files.wwpdb.org/download/1cbs.cif")
    .parse("mmcif")
    .modelStructure()
    .component("all")
    .representation("cartoon")
    .color("blue");

  const recreated = builder.getState();

  // Compare structure (not exact match due to metadata timestamps)
  assertEquals(recreated.kind, data.kind);
  assertEquals(recreated.root.kind, data.root.kind);

  const originalDownload = findNodesByKind(data.root, "download")[0];
  const recreatedDownload = findNodesByKind(recreated.root, "download")[0];
  assertEquals(recreatedDownload.params.url, originalDownload.params.url);
});

Deno.test("examples - components.mvsj structure", async () => {
  const data = (await loadExampleMVSJ("components.mvsj")) as State;

  assertEquals(data.kind, "single");
  assertExists(data.root);

  // Check multiple components
  const componentNodes = findNodesByKind(data.root, "component");
  assertEquals(componentNodes.length > 1, true);

  // Check for protein selector
  const proteinComponent = componentNodes.find(
    (node) => node.params.selector === "protein",
  );
  assertExists(proteinComponent);

  // Check for nucleic selector
  const nucleicComponent = componentNodes.find(
    (node) => node.params.selector === "nucleic",
  );
  assertExists(nucleicComponent);

  // Check for label nodes
  const labelNodes = findNodesByKind(data.root, "label");
  assertEquals(labelNodes.length > 0, true);
});

Deno.test("examples - components.mvsj selectors", async () => {
  const data = (await loadExampleMVSJ("components.mvsj")) as State;

  const componentNodes = findNodesByKind(data.root, "component");

  // Check for component with object selector
  const objectSelectorComponent = componentNodes.find(
    (node) =>
      typeof node.params.selector === "object" &&
      node.params.selector.label_asym_id === "E",
  );
  assertExists(objectSelectorComponent);

  // Check for component with complex selector
  const complexSelectorComponent = componentNodes.find(
    (node) =>
      typeof node.params.selector === "object" &&
      node.params.selector.label_asym_id === "B" &&
      node.params.selector.label_seq_id === 217,
  );
  assertExists(complexSelectorComponent);
});

Deno.test("examples - components.mvsj focus node", async () => {
  const data = (await loadExampleMVSJ("components.mvsj")) as State;

  const focusNodes = findNodesByKind(data.root, "focus");
  assertEquals(focusNodes.length > 0, true);

  // Check that focus has a selector array
  const focusWithArray = focusNodes.find((node) =>
    Array.isArray(node.params.target),
  );
  if (focusWithArray) {
    assertEquals(Array.isArray(focusWithArray.params.target), true);
  }
});

Deno.test("examples - geometrical.mvsj primitives", async () => {
  const data = (await loadExampleMVSJ("geometrical.mvsj")) as State;

  // Check for primitives node
  const primitivesNodes = findNodesByKind(data.root, "primitives");
  assertEquals(primitivesNodes.length > 0, true);

  // Check for primitive nodes
  const primitiveNodes = findNodesByKind(data.root, "primitive");
  assertEquals(primitiveNodes.length > 0, true);

  // Check for different primitive types
  const primitiveTypes = primitiveNodes.map(
    (node) => node.params.primitive_type,
  );
  assertEquals(primitiveTypes.length > 0, true);
});

Deno.test("examples - labels.mvsj label nodes", async () => {
  const data = (await loadExampleMVSJ("labels.mvsj")) as State;

  // Check for label nodes
  const labelNodes = findNodesByKind(data.root, "label");
  assertEquals(labelNodes.length > 0, true);

  // Check that labels have text
  for (const labelNode of labelNodes) {
    assertExists(labelNode.params.text);
    assertEquals(typeof labelNode.params.text, "string");
  }
});

Deno.test("examples - volumetric.mvsj volume nodes", async () => {
  const data = await loadExampleMVSJ("volumetric.mvsj");

  // volumetric.mvsj is a multi-state file
  if (data.kind === "multiple") {
    const states = data as any;
    // Check for volume nodes in first snapshot
    const volumeNodes = findNodesByKind(states.snapshots[0].root, "volume");
    assertEquals(volumeNodes.length > 0, true);

    // Check for volume_representation nodes
    const volumeRepNodes = findNodesByKind(
      states.snapshots[0].root,
      "volume_representation",
    );
    assertEquals(volumeRepNodes.length > 0, true);
  } else {
    const state = data as State;
    // Check for volume nodes
    const volumeNodes = findNodesByKind(state.root, "volume");
    assertEquals(volumeNodes.length > 0, true);

    // Check for volume_representation nodes
    const volumeRepNodes = findNodesByKind(state.root, "volume_representation");
    assertEquals(volumeRepNodes.length > 0, true);
  }
});

Deno.test("examples - superimpose.mvsj multiple structures", async () => {
  const data = (await loadExampleMVSJ("superimpose.mvsj")) as State;

  // Check for multiple download nodes
  const downloadNodes = findNodesByKind(data.root, "download");
  assertEquals(downloadNodes.length > 1, true);

  // Check for transform nodes (used in superposition)
  const transformNodes = findNodesByKind(data.root, "transform");
  assertEquals(transformNodes.length > 0, true);
});

Deno.test("examples - all examples have valid metadata", async () => {
  const exampleFiles = [
    "minimal.mvsj",
    "components.mvsj",
    "geometrical.mvsj",
    "labels.mvsj",
    "volumetric.mvsj",
    "superimpose.mvsj",
  ];

  for (const filename of exampleFiles) {
    const data = (await loadExampleMVSJ(filename)) as State;

    assertExists(data.metadata, `${filename} missing metadata`);
    assertExists(data.metadata.version, `${filename} missing version`);
    assertExists(data.metadata.timestamp, `${filename} missing timestamp`);

    // Check version format
    assertEquals(
      typeof data.metadata.version,
      "string",
      `${filename} version is not a string`,
    );
  }
});

Deno.test("examples - all examples are valid JSON", async () => {
  const exampleFiles = [
    "minimal.mvsj",
    "components.mvsj",
    "geometrical.mvsj",
    "labels.mvsj",
    "volumetric.mvsj",
    "superimpose.mvsj",
  ];

  for (const filename of exampleFiles) {
    const data = await loadExampleMVSJ(filename);

    // Should be able to serialize and deserialize
    const serialized = JSON.stringify(data);
    const deserialized = JSON.parse(serialized);

    assertEquals(deserialized.kind, data.kind, `${filename} kind mismatch`);

    // Check for appropriate structure based on kind
    if (deserialized.kind === "multiple") {
      assertExists(
        deserialized.snapshots,
        `${filename} snapshots missing after roundtrip`,
      );
    } else {
      assertExists(
        deserialized.root,
        `${filename} root missing after roundtrip`,
      );
    }

    assertExists(
      deserialized.metadata,
      `${filename} metadata missing after roundtrip`,
    );
  }
});

Deno.test("examples - builder can recreate minimal example", async () => {
  // This tests the full roundtrip: example -> builder pattern
  const builder = createBuilder();

  builder
    .download("https://files.wwpdb.org/download/1cbs.cif")
    .parse("mmcif")
    .modelStructure()
    .component("all")
    .representation("cartoon")
    .color("blue");

  const state = builder.getState();

  // Verify all key elements are present
  const stateJson = JSON.stringify(state);
  assertEquals(stateJson.includes("download"), true);
  assertEquals(stateJson.includes("1cbs.cif"), true);
  assertEquals(stateJson.includes("parse"), true);
  assertEquals(stateJson.includes("mmcif"), true);
  assertEquals(stateJson.includes("structure"), true);
  assertEquals(stateJson.includes("model"), true);
  assertEquals(stateJson.includes("component"), true);
  assertEquals(stateJson.includes("all"), true);
  assertEquals(stateJson.includes("representation"), true);
  assertEquals(stateJson.includes("cartoon"), true);
  assertEquals(stateJson.includes("color"), true);
  assertEquals(stateJson.includes("blue"), true);
});

Deno.test("examples - builder can create complex selectors", () => {
  const builder = createBuilder();

  builder
    .download("https://files.wwpdb.org/download/1c0a.cif")
    .parse("mmcif")
    .assemblyStructure()
    .component({ label_asym_id: "B", label_seq_id: 217 })
    .representation("ball_and_stick")
    .color("#ff0000");

  const state = builder.getState();
  const componentNodes = findNodesByKind(state.root, "component");

  assertExists(componentNodes[0]);
  assertEquals(typeof componentNodes[0].params.selector, "object");
  assertEquals((componentNodes[0].params.selector as any).label_asym_id, "B");
  assertEquals((componentNodes[0].params.selector as any).label_seq_id, 217);
});

Deno.test("examples - builder can create array selectors", () => {
  const builder = createBuilder();

  builder
    .download("https://files.wwpdb.org/download/1c0a.cif")
    .parse("mmcif")
    .assemblyStructure()
    .component([
      { label_asym_id: "E" },
      { label_asym_id: "B", label_seq_id: 217 },
      { label_asym_id: "B", label_seq_id: 537 },
    ])
    .focus({});

  const state = builder.getState();
  const componentNodes = findNodesByKind(state.root, "component");

  assertExists(componentNodes[0]);
  assertEquals(Array.isArray(componentNodes[0].params.selector), true);
  assertEquals((componentNodes[0].params.selector as any[]).length, 3);
});
