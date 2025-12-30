# MolViewSpec TypeScript Jupyter Notebooks

This directory contains TypeScript/Deno Jupyter notebooks demonstrating the MolViewSpec API.
These notebooks are TypeScript equivalents of the Python notebooks in `test-data/notebooks/`.

## Prerequisites

- [Deno](https://deno.land/) installed
- [Jupyter](https://jupyter.org/) with Deno kernel installed

### Installing Deno Jupyter Kernel

```bash
deno jupyter --install
```

## Notebooks

### 01_kras_structure_visualization.ipynb
Demonstrates basic structure visualization using PDB structure 6vjj (KRAS-RAF1 complex):
- Basic structure loading and coloring
- Component selection by chain and residue
- Multiple representation types (cartoon, ball_and_stick)
- Custom color schemes

### 02_mvsx_mvsj_stories_ui.ipynb
Shows how to work with MVSX and MVSJ formats:
- **MVSX**: Single state with embedded assets
- **MVSJ**: Multiple snapshots for stories/slideshows
- Asset management and references
- Creating multi-state visualizations

### 03_mvsj_templates.ipynb
Demonstrates template-based workflow:
- Creating reusable templates with placeholders
- Finding and modifying nodes by reference
- Filling templates with different data
- Batch generation of visualizations

### 04_color_themes.ipynb
Covers different color palette types:
- **Categorical palettes**: For discrete categories (chains, residues)
- **Discrete palettes**: Stepped gradients with thresholds (pLDDT)
- **Continuous palettes**: Smooth gradients (B-factor)
- Named color palettes (Set1, viridis, etc.)

### 05_markdown_commands.ipynb
Shows markdown command extensions:
- Interactive highlight and focus commands
- Color swatches and palette visualizations
- Camera controls
- Image embedding from assets
- Creating interactive documentation

### 06_animations.ipynb
Introduction to animation capabilities:
- Color interpolation
- Opacity animation
- Camera movements
- Multiple simultaneous animations
- **Note**: Animation API is currently being implemented in TypeScript

## Running the Notebooks

1. Start Jupyter with Deno kernel:
   ```bash
   jupyter notebook
   ```

2. Open any notebook and select the "Deno" kernel

3. Run cells sequentially to see the examples

## Key Differences from Python Version

### Import Statement
TypeScript notebooks use ES6 imports:
```typescript
import { createBuilder } from "../../molviewspec-ts/molviewspec/builder.ts";
```

Instead of Python's:
```python
import molviewspec as mvs
```

### Type Annotations
TypeScript provides strong typing:
```typescript
const builder: Root = createBuilder();
const state: State = builder.getState();
```

### Method Chaining
The builder API works the same way:
```typescript
builder
  .download('https://files.wwpdb.org/download/1cbs.cif')
  .parse('mmcif')
  .modelStructure()
  .component('polymer')
  .representation()
  .color('blue');
```

### Output Format
TypeScript notebooks output JSON directly:
```typescript
console.log(JSON.stringify(state, null, 2));
```

## API Reference

The TypeScript API mirrors the Python API:

- `createBuilder()` - Create a new builder instance
- `.download(url)` - Download structure from URL
- `.parse(format)` - Parse structure (mmcif, bcif, etc.)
- `.modelStructure()` - Create model structure
- `.component(selector)` - Select component
- `.representation(type)` - Add representation
- `.color(color)` - Set color
- `.getState()` - Get current state
- `.getSnapshot(options)` - Get snapshot with metadata

## Examples

### Basic Structure Visualization
```typescript
const builder = createBuilder();

builder
  .download('https://files.wwpdb.org/download/1cbs.cif')
  .parse('mmcif')
  .modelStructure()
  .component('polymer')
  .representation()
  .color('blue');

const state = builder.getState();
```

### Using References
```typescript
// Add reference to a component
structure
  .component({ label_asym_id: 'A' })
  .representation('cartoon', undefined, undefined, 'chain_a')
  .color('red');

// Later, find and modify
const node = findRef(state.root, 'chain_a');
if (node && node.params) {
  // Modify node properties
}
```

### Creating Snapshots
```typescript
const snapshot = builder.getSnapshot({
  title: "My Structure",
  description: "A detailed view",
  linger_duration_ms: 3000,
  transition_duration_ms: 1000,
});
```

## Saving Output

### Save State to File
```typescript
const state = builder.getState();
await Deno.writeTextFile("./output.mvsj", JSON.stringify(state, null, 2));
```

### Read from File
```typescript
const data = await Deno.readTextFile("./output.mvsj");
const state: State = JSON.parse(data);
```

## Troubleshooting

### Deno Permissions
If you encounter permission errors, run Jupyter with appropriate flags:
```bash
deno jupyter --allow-read --allow-write --allow-net
```

### Module Resolution
Ensure the import paths are correct relative to the notebook location:
```typescript
import { createBuilder } from "../../molviewspec-ts/molviewspec/builder.ts";
```

## Contributing

When adding new notebooks:
1. Follow the naming convention: `##_descriptive_name.ipynb`
2. Use the Deno kernel
3. Include markdown cells explaining concepts
4. Add working code examples
5. Test all cells before committing

## Resources

- [MolViewSpec Documentation](https://molstar.org/mol-view-spec/)
- [Deno Documentation](https://deno.land/manual)
- [Jupyter Documentation](https://jupyter.org/documentation)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
