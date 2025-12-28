/**
 * Tests for the MolViewSpec builder API
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createBuilder, MVSJ, validateStateTree } from "../mod.ts";

Deno.test("createBuilder creates a root node", () => {
  const builder = createBuilder();
  assertExists(builder);

  const node = builder.getNode();
  assertEquals(node.kind, "root");
});

Deno.test("builder creates a valid state", () => {
  const builder = createBuilder();
  const state = builder.getState({
    title: "Test State",
    description: "A test state",
  });

  assertExists(state);
  assertEquals(state.kind, "single");
  assertEquals(state.metadata.title, "Test State");
  assertEquals(state.metadata.description, "A test state");
  assertExists(state.metadata.timestamp);
  assertExists(state.metadata.version);
  assertEquals(validateStateTree(state), true);
});

Deno.test("builder creates download node", () => {
  const builder = createBuilder();
  builder.download("https://example.com/data.cif");

  const state = builder.getState();
  const rootChildren = state.root.children;

  assertExists(rootChildren);
  assertEquals(rootChildren.length, 1);
  assertEquals(rootChildren[0].kind, "download");
  assertEquals(rootChildren[0].params?.url, "https://example.com/data.cif");
});

Deno.test("builder chains download -> parse -> structure", () => {
  const builder = createBuilder();

  builder
    .download("https://example.com/data.cif")
    .parse("mmcif")
    .modelStructure();

  const state = builder.getState();
  const download = state.root.children?.[0];

  assertExists(download);
  assertEquals(download.kind, "download");

  const parse = download.children?.[0];
  assertExists(parse);
  assertEquals(parse.kind, "parse");
  assertEquals(parse.params?.format, "mmcif");

  const structure = parse.children?.[0];
  assertExists(structure);
  assertEquals(structure.kind, "structure");
  assertEquals(structure.params?.type, "model");
});

Deno.test("builder creates component and representation", () => {
  const builder = createBuilder();

  builder
    .download("https://example.com/data.cif")
    .parse("mmcif")
    .modelStructure()
    .component("all")
    .representation("cartoon");

  const state = builder.getState();
  const structure = state.root.children?.[0]?.children?.[0]?.children?.[0];

  assertExists(structure);
  const component = structure.children?.[0];
  assertExists(component);
  assertEquals(component.kind, "component");
  assertEquals(component.params?.selector, "all");

  const representation = component.children?.[0];
  assertExists(representation);
  assertEquals(representation.kind, "representation");
  assertEquals(representation.params?.type, "cartoon");
});

Deno.test("builder creates multiple components", () => {
  const builder = createBuilder();

  const structure = builder
    .download("https://example.com/data.cif")
    .parse("mmcif")
    .modelStructure();

  structure.component("protein").representation("cartoon");
  structure.component("ligand").representation("ball_and_stick");

  const state = builder.getState();
  const structureNode = state.root.children?.[0]?.children?.[0]?.children?.[0];

  assertExists(structureNode);
  assertExists(structureNode.children);
  assertEquals(structureNode.children.length, 2);

  assertEquals(structureNode.children[0].kind, "component");
  assertEquals(structureNode.children[0].params?.selector, "protein");

  assertEquals(structureNode.children[1].kind, "component");
  assertEquals(structureNode.children[1].params?.selector, "ligand");
});

Deno.test("builder adds color and opacity to representation", () => {
  const builder = createBuilder();

  builder
    .download("https://example.com/data.cif")
    .parse("mmcif")
    .modelStructure()
    .component("all")
    .representation("cartoon")
    .color(0xFF0000)
    .opacity(0.5);

  const state = builder.getState();
  const representation = state.root.children?.[0]?.children?.[0]?.children?.[0]?.children?.[0]?.children?.[0];

  assertExists(representation);
  assertExists(representation.children);
  assertEquals(representation.children.length, 2);

  const color = representation.children[0];
  assertEquals(color.kind, "color");
  assertEquals(color.params?.color, 0xFF0000);

  const opacity = representation.children[1];
  assertEquals(opacity.kind, "opacity");
  assertEquals(opacity.params?.opacity, 0.5);
});

Deno.test("builder creates primitives", () => {
  const builder = createBuilder();

  builder.primitives({ color: 0xFFD700 });

  const state = builder.getState();
  assertExists(state.root.children);
  assertEquals(state.root.children.length, 1);

  const primitives = state.root.children[0];
  assertEquals(primitives.kind, "primitives");
  assertEquals(primitives.params?.color, 0xFFD700);
});

Deno.test("builder creates camera and canvas nodes", () => {
  const builder = createBuilder();

  builder.camera({
    target: [0, 0, 0],
    position: [10, 10, 10],
    up: [0, 1, 0],
  });

  builder.canvas({
    background_color: 0xFFFFFF,
  });

  const state = builder.getState();
  assertExists(state.root.children);
  assertEquals(state.root.children.length, 2);

  const camera = state.root.children[0];
  assertEquals(camera.kind, "camera");
  assertEquals(camera.params?.target, [0, 0, 0]);

  const canvas = state.root.children[1];
  assertEquals(canvas.kind, "canvas");
  assertEquals(canvas.params?.background_color, 0xFFFFFF);
});

Deno.test("builder creates component with custom expression", () => {
  const builder = createBuilder();

  builder
    .download("https://example.com/data.cif")
    .parse("mmcif")
    .modelStructure()
    .component({
      label_asym_id: "A",
      beg_label_seq_id: 10,
      end_label_seq_id: 20,
    })
    .representation("cartoon");

  const state = builder.getState();
  const component = state.root.children?.[0]?.children?.[0]?.children?.[0]?.children?.[0];

  assertExists(component);
  assertEquals(component.kind, "component");
  assertExists(component.params?.selector);

  const selector = component.params.selector as Record<string, unknown>;
  assertEquals(selector.label_asym_id, "A");
  assertEquals(selector.beg_label_seq_id, 10);
  assertEquals(selector.end_label_seq_id, 20);
});

Deno.test("builder supports custom and ref properties", () => {
  const builder = createBuilder();

  builder
    .download("https://example.com/data.cif", { myData: "test" }, "download-1")
    .parse("mmcif", undefined, "parse-1");

  const state = builder.getState();
  const download = state.root.children?.[0];

  assertExists(download);
  assertEquals(download.ref, "download-1");
  assertEquals(download.custom?.myData, "test");

  const parse = download.children?.[0];
  assertExists(parse);
  assertEquals(parse.ref, "parse-1");
});

Deno.test("MVSJ serialization and deserialization", () => {
  const builder = createBuilder();

  builder
    .download("https://example.com/data.cif")
    .parse("mmcif")
    .modelStructure()
    .component("all")
    .representation("cartoon");

  const state = builder.getState({ title: "Test" });
  const mvsj = new MVSJ(state);

  // Test dumps
  const jsonString = mvsj.dumps(2);
  assertExists(jsonString);

  // Test loads
  const loaded = MVSJ.loads(jsonString);
  assertExists(loaded);
  assertExists(loaded.data);

  if ("root" in loaded.data) {
    assertEquals(loaded.data.metadata.title, "Test");
  }
});

Deno.test("MVSJ excludes null and undefined values", () => {
  const builder = createBuilder();

  builder
    .download("https://example.com/data.cif")
    .parse("mmcif")
    .modelStructure();

  const state = builder.getState();
  const mvsj = new MVSJ(state);
  const dict = mvsj.toDict();

  // Check that null/undefined values are excluded
  const jsonString = JSON.stringify(dict);
  assertEquals(jsonString.includes("null"), false);
  assertEquals(jsonString.includes("undefined"), false);
});

Deno.test("builder creates assembly structure with parameters", () => {
  const builder = createBuilder();

  builder
    .download("https://example.com/data.cif")
    .parse("mmcif")
    .assemblyStructure({ assembly_id: "1", assembly_index: 0 });

  const state = builder.getState();
  const structure = state.root.children?.[0]?.children?.[0]?.children?.[0];

  assertExists(structure);
  assertEquals(structure.kind, "structure");
  assertEquals(structure.params?.type, "assembly");
  assertEquals(structure.params?.assembly_id, "1");
  assertEquals(structure.params?.assembly_index, 0);
});

Deno.test("builder creates volume representation", () => {
  const builder = createBuilder();

  builder
    .download("https://example.com/volume.ccp4")
    .parse("map")
    .volume({ channel_id: "em" })
    .representation("isosurface", { iso_value: 1.5 })
    .color(0x0000FF)
    .opacity(0.7);

  const state = builder.getState();
  const volume = state.root.children?.[0]?.children?.[0]?.children?.[0];

  assertExists(volume);
  assertEquals(volume.kind, "volume");
  assertEquals(volume.params?.channel_id, "em");

  const representation = volume.children?.[0];
  assertExists(representation);
  assertEquals(representation.kind, "volume_representation");
  assertEquals(representation.params?.type, "isosurface");
  assertEquals(representation.params?.iso_value, 1.5);
});
