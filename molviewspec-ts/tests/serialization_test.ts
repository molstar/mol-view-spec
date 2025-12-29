/**
 * Test module for builder serialization.
 */

import { assertEquals, assertExists } from "@std/assert";
import { createBuilder } from "../molviewspec/builder.ts";

Deno.test("serialization - box primitive", () => {
  const builder = createBuilder();
  builder.primitives().box({
    corner_a: [0.5, 0.5, 1.0],
    corner_b: [0.5, 0.5, 2.0],
  } as any);

  const state = builder.getState();
  const stateJson = JSON.stringify(state);

  // Check that the JSON contains the expected structure
  assertExists(state.root.children);
  assertEquals(state.root.children!.length, 1);
  assertEquals(state.root.children![0].kind, "primitives");
  assertExists(state.root.children![0].children);
  assertEquals(state.root.children![0].children![0].kind, "primitive");
  assertEquals(
    (state.root.children![0].children![0].params as any).primitive_type,
    "box",
  );

  // Check JSON string representation
  assertEquals(stateJson.includes("primitives"), true);
  assertEquals(stateJson.includes("box"), true);
});

Deno.test("serialization - mesh primitive", () => {
  const builder = createBuilder();
  builder.primitives().mesh({
    positions: [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
    ],
    indices: [[0, 1, 2]],
    colors: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
  });

  const state = builder.getState();
  const stateJson = JSON.stringify(state);

  assertExists(state.root.children);
  assertEquals(state.root.children![0].kind, "primitives");
  assertEquals(stateJson.includes("mesh"), true);
  assertEquals(stateJson.includes("positions"), true);
  assertEquals(stateJson.includes("indices"), true);
});

Deno.test("serialization - sphere primitive", () => {
  const builder = createBuilder();
  builder.primitives().sphere([1.0, 2.0, 3.0], 5.0);

  const state = builder.getState();

  assertExists(state.root.children);
  assertEquals(state.root.children![0].kind, "primitives");
  assertExists(state.root.children![0].children);
  assertEquals(state.root.children![0].children![0].kind, "primitive");
  assertEquals(
    (state.root.children![0].children![0].params as any).primitive_type,
    "sphere",
  );
  assertEquals(
    (state.root.children![0].children![0].params as any).center,
    [1.0, 2.0, 3.0],
  );
  assertEquals(
    (state.root.children![0].children![0].params as any).radius,
    5.0,
  );
});

Deno.test("serialization - tube primitive", () => {
  const builder = createBuilder();
  builder.primitives().tube({
    start: [0, 0, 0],
    end: [1, 1, 1],
    radius: 0.5,
  });

  const state = builder.getState();

  assertExists(state.root.children);
  assertEquals(state.root.children![0].kind, "primitives");
  assertExists(state.root.children![0].children);
  assertEquals(state.root.children![0].children![0].kind, "primitive");
  assertEquals(
    (state.root.children![0].children![0].params as any).primitive_type,
    "tube",
  );
});

Deno.test("serialization - label primitive", () => {
  const builder = createBuilder();
  builder.primitives().label({
    text: "Test Label",
    position: [0, 0, 0],
  });

  const state = builder.getState();
  const stateJson = JSON.stringify(state);

  assertExists(state.root.children);
  assertEquals(state.root.children![0].kind, "primitives");
  assertEquals(stateJson.includes("label"), true);
  assertEquals(stateJson.includes("Test Label"), true);
});

Deno.test("serialization - distance measurement primitive", () => {
  const builder = createBuilder();
  builder.primitives().distance({
    start: [0, 0, 0],
    end: [1, 1, 1],
  });

  const state = builder.getState();

  assertExists(state.root.children);
  assertEquals(state.root.children![0].kind, "primitives");
  assertExists(state.root.children![0].children);
  assertEquals(state.root.children![0].children![0].kind, "primitive");
  assertEquals(
    (state.root.children![0].children![0].params as any).primitive_type,
    "distance",
  );
});

Deno.test("serialization - complete structure with component", () => {
  const builder = createBuilder();
  builder
    .download("https://files.wwpdb.org/download/1cbs.cif")
    .parse("mmcif")
    .modelStructure()
    .component("all")
    .representation("cartoon")
    .color("blue");

  const state = builder.getState();
  const stateJson = JSON.stringify(state);

  // Verify structure
  assertExists(state.root.children);
  assertEquals(state.root.children![0].kind, "download");
  assertEquals(stateJson.includes("1cbs.cif"), true);
  assertEquals(stateJson.includes("mmcif"), true);
  assertEquals(stateJson.includes("model"), true);
  assertEquals(stateJson.includes("cartoon"), true);
  assertEquals(stateJson.includes("blue"), true);
});

Deno.test("serialization - metadata fields", () => {
  const builder = createBuilder();
  builder.camera({
    target: [0, 0, 0],
    position: [10, 10, 10],
    up: [0, 1, 0],
  });

  const state = builder.getState({
    title: "Test Title",
    description: "Test Description",
  });

  assertEquals(state.metadata.title, "Test Title");
  assertEquals(state.metadata.description, "Test Description");
  assertEquals(state.metadata.version, "1.8.1");
  assertExists(state.metadata.timestamp);
});

Deno.test("serialization - multi-state snapshots", () => {
  const builder = createBuilder();

  // First snapshot
  builder.camera({ target: [0, 0, 0] });
  builder.saveState({
    title: "Snapshot 1",
    linger_duration_ms: 1000,
  });

  // Second snapshot
  builder.camera({ target: [1, 1, 1] });
  builder.saveState({
    title: "Snapshot 2",
    linger_duration_ms: 1000,
    transition_duration_ms: 500,
  });

  const states = builder.getStates({
    title: "Multi-state Test",
  });

  assertEquals(states.kind, "multiple");
  assertEquals(states.snapshots.length, 2);
  assertEquals(states.snapshots[0].metadata.title, "Snapshot 1");
  assertEquals(states.snapshots[1].metadata.title, "Snapshot 2");
  assertEquals(states.snapshots[0].metadata.linger_duration_ms, 1000);
  assertEquals(states.snapshots[1].metadata.transition_duration_ms, 500);
});

Deno.test("serialization - canvas and camera", () => {
  const builder = createBuilder();
  builder.canvas({ background_color: "#ffffff" as any });
  builder.camera({
    target: [0, 0, 0],
    position: [10, 10, 10],
    up: [0, 1, 0],
  });

  const state = builder.getState();
  const stateJson = JSON.stringify(state);

  assertExists(state.root.children);
  assertEquals(state.root.children!.length, 2);
  assertEquals(state.root.children![0].kind, "canvas");
  assertEquals(state.root.children![1].kind, "camera");
  assertEquals(stateJson.includes("#ffffff"), true);
});
