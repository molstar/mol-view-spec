# MolViewSpec TypeScript/Deno

A TypeScript implementation of [MolViewSpec](https://molstar.org/mol-view-spec/) for the Deno runtime.

MolViewSpec (*.mvsj) is a JSON-based file format used to describe visual scenes or views in molecular visualization. This library provides a fluent builder API for creating MolViewSpec files programmatically.

## Features

- 🦕 **Pure TypeScript** for Deno runtime
- 🔧 **Fluent Builder API** for easy scene construction
- 📦 **MVSJ Support** (JSON format)
- 🗜️ **MVSX Support** (ZIP archive format)
- 🎯 **Type-safe** with full TypeScript support
- 🪶 **Minimal dependencies**

## Installation

```typescript
import { createBuilder } from "https://deno.land/x/molviewspec/mod.ts";
```

Or use a specific version:

```typescript
import { createBuilder } from "https://deno.land/x/molviewspec@1.8.0/mod.ts";
```

## Quick Start

### Creating a Simple Molecular View

```typescript
import { createBuilder } from "./mod.ts";

// Create a builder
const builder = createBuilder();

// Build a molecular scene
builder
  .download("https://files.wwpdb.org/download/1cbs.cif")
  .parse("mmcif")
  .modelStructure()
  .component("all")
  .representation("cartoon");

// Get the state as JSON
const state = builder.getState({
  title: "My Molecular View",
  description: "A simple protein cartoon representation",
});

// Save as MVSJ file
import { MVSJ } from "./mod.ts";
const mvsj = new MVSJ(state);
await mvsj.dump("output.mvsj");

console.log("State saved to output.mvsj");
```

### Creating Multiple Representations

```typescript
import { createBuilder } from "./mod.ts";

const builder = createBuilder();

builder
  .download("https://files.wwpdb.org/download/1tqn.cif")
  .parse("mmcif")
  .assemblyStructure({ assembly_id: "1" })
  .component("protein")
  .representation("cartoon")
  .color("lightblue")
  .getRoot()
  .component("ligand")
  .representation("ball_and_stick")
  .color("red");

const state = builder.getState({
  title: "Protein with Ligand",
  description: "Cartoon representation of protein with ball-and-stick ligand",
});

console.log(JSON.stringify(state, null, 2));
```

### Creating an MVSX Archive

```typescript
import { createBuilder, MVSX } from "./mod.ts";

const builder = createBuilder();

builder
  .download("data.cif")
  .parse("mmcif")
  .modelStructure()
  .component("all")
  .representation("cartoon");

const state = builder.getState({ title: "Local Data Example" });

// Create MVSX with embedded files
const mvsx = new MVSX(state);
await mvsx.addAssetFromFile("data.cif", "./local-data.cif");
await mvsx.dump("output.mvsx");

console.log("Archive saved to output.mvsx");
```

### Working with Primitives

```typescript
import { createBuilder } from "./mod.ts";

const builder = createBuilder();

const primitives = builder.primitives({
  color: 0xff0000,
  label_color: 0x000000,
});

// Add a sphere
primitives.sphere([10, 20, 30], 5);

// Add a tube connecting two points
primitives.tube({
  start: [0, 0, 0],
  end: [10, 10, 10],
  radius: 0.5,
});

// Add a label
primitives.label({
  text: "Active Site",
  position: [15, 15, 15],
});

const state = builder.getState({ title: "Primitives Example" });
```

## API Overview

### Builder Pattern

The library uses a fluent builder pattern where methods can be chained:

```typescript
builder
  .download(url)      // Download structure data
  .parse(format)      // Parse the data
  .modelStructure()   // Create structure
  .component(selector) // Select components
  .representation(type) // Add representation
  .color(color);      // Apply coloring
```

### Main Classes

- **`Root`** - Entry point for building state trees
- **`Download`** - Handles data downloading
- **`Parse`** - Handles data parsing
- **`Structure`** - Represents molecular structures
- **`Component`** - Represents selected components
- **`Representation`** - Represents visual representations
- **`Volume`** - Handles volumetric data
- **`Primitives`** - Handles geometric primitives
- **`MVSJ`** - JSON serialization/deserialization
- **`MVSX`** - ZIP archive serialization/deserialization

### Key Functions

- **`createBuilder()`** - Creates a new builder instance
- **`createGlobalMetadata()`** - Creates metadata for states
- **`createSnapshotMetadata()`** - Creates metadata for snapshots
- **`validateStateTree()`** - Validates a state tree structure
- **`findRef()`** - Finds nodes by reference

## Structure Types

- `modelStructure()` - Deposited/asymmetric unit coordinates
- `assemblyStructure()` - Biological assembly
- `symmetryStructure()` - Crystal symmetry
- `symmetryMatesStructure()` - Symmetry mates

## Representation Types

- `cartoon` - Cartoon representation
- `ball_and_stick` - Ball and stick
- `spacefill` - Space-filling/CPK
- `surface` - Molecular surface
- `backbone` - Backbone trace
- `line` - Line representation
- `carbohydrate` - Carbohydrate representation

## Component Selectors

Built-in selectors:
- `all` - All atoms
- `polymer` - Polymer chains
- `protein` - Protein chains
- `nucleic` - Nucleic acid chains
- `ligand` - Ligands
- `ion` - Ions
- `water` - Water molecules

Custom selections using `ComponentExpression`:
```typescript
{
  label_asym_id: "A",
  beg_label_seq_id: 10,
  end_label_seq_id: 20
}
```

## File Formats

### MVSJ (JSON)
Human-readable JSON format:
```typescript
const mvsj = new MVSJ(state);
await mvsj.dump("file.mvsj");
const loaded = await MVSJ.load("file.mvsj");
```

### MVSX (ZIP Archive)
Compressed archive containing MVSJ + assets:
```typescript
const mvsx = new MVSX(state, assets);
await mvsx.dump("file.mvsx");
const loaded = await MVSX.load("file.mvsx");
```

## Examples

Check the `examples/` directory for more examples:
- Basic structure visualization
- Multiple representations
- Custom coloring
- Geometric primitives
- Animation and transitions

## Development

### Running Tests
```bash
deno task test
```

### Formatting Code
```bash
deno task fmt
```

### Linting
```bash
deno task lint
```

### Type Checking
```bash
deno task check
```

## Citation

When using MolViewSpec, please cite:

- Adam Midlik, Sebastian Bittrich, Jennifer R Fleming, Sreenath Nair, Sameer Velankar, Stephen K Burley, Jasmine Y Young, Brinda Vallat, David Sehnal: MolViewSpec: a Mol* extension for describing and sharing molecular visualizations, Nucleic Acids Research, 2025; https://doi.org/10.1093/nar/gkaf370.

## Related Projects

- [MolViewSpec Python Library](https://github.com/molstar/mol-view-spec/tree/master/molviewspec)
- [Mol* Viewer](https://github.com/molstar/molstar) - Reference implementation
- [MolViewSpec Documentation](https://molstar.org/mol-view-spec-docs/)

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Version

This implementation follows MolViewSpec version 1.8.
