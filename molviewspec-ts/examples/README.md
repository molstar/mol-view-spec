# MolViewSpec TypeScript Examples

This directory contains interactive examples demonstrating the MolViewSpec TypeScript/Deno library.

## 📓 Interactive Notebooks

### Full Examples: `notebook_with_display.ipynb`
A comprehensive Jupyter notebook showcasing all features of the library with interactive 3D molecular viewers embedded directly in the notebook.

### Example 2: `example2_protein_ligand.ipynb`
A focused notebook demonstrating protein-ligand complex visualization (HIV-1 protease with inhibitor). Perfect for learning the basics!

### Examples Included

1. **Basic Protein Structure** - Simple cartoon representation of 1CBS
2. **Protein-Ligand Complex** - HIV-1 protease (1TQN) with different representations for protein, ligand, and water
3. **Multi-Chain Structure** - Hemoglobin (4HHB) with individual chain coloring
4. **Active Site Highlighting** - Transparent structure with highlighted residue range
5. **Surface Representation** - Cartoon combined with molecular surface
6. **Geometric Annotations** - Using primitives (spheres, tubes, labels, distances)
7. **Multi-Snapshot Story** - Narrative visualization with multiple views

### Running the Notebook

1. Install the Deno Jupyter kernel:
```bash
deno jupyter --install
```

2. Start Jupyter:
```bash
jupyter notebook
# or
jupyter lab
```

3. Open `notebook_with_display.ipynb`

4. Run all cells to see interactive 3D molecular visualizations!

### Updating the Notebook

All cells in the notebook have been executed with outputs. If you need to re-execute the notebook:

```bash
# Execute all cells and update outputs
python3 execute_notebook.py

# Or clear all outputs first
python3 execute_notebook.py --clear
```

## 🧪 Test Script

**`test_all_examples.ts`** - Standalone test script that executes all examples from the notebook and generates output files.

Run it with:
```bash
deno run --allow-read --allow-write --allow-net ../test_all_examples.ts
```

This will:
- Execute all 7 examples
- Generate HTML files for each example
- Generate MVSJ files for sharing
- Verify all examples work correctly

## 📁 Generated Files

The notebook and test script generate these files:

### HTML Files (Standalone Viewers)
- `example1_basic.html` - 1CBS basic structure
- `example2_complex.html` - 1TQN protein-ligand complex
- `example3_hemoglobin.html` - 4HHB multi-chain structure
- `example4_active_site.html` - Active site highlighting
- `example5_surface.html` - Surface representation
- `example6_annotated.html` - Annotated structure with primitives
- `example7_story.html` - Multi-snapshot story (Stories UI)
- `1tqn_protein_ligand_complex.html` - From Example 2 notebook

Open any HTML file in a web browser to view the interactive 3D structure!

### MVSJ Files (MolViewSpec JSON)
- `example_basic.mvsj`
- `example_complex.mvsj`
- `example1_basic.mvsj`
- `example2_complex.mvsj`
- `example3_hemoglobin.mvsj`
- `1tqn_protein_ligand_complex.mvsj` - From Example 2 notebook

Upload these to [Mol* Viewer](https://molstar.org/viewer/) to visualize.

## 🎯 What's New

**December 21, 2024**: All notebook examples have been fully executed with outputs!

- ✅ All 11 code cells in main notebook executed successfully
- ✅ All 8 examples display interactive 3D viewers
- ✅ **NEW:** Created `example2_protein_ligand.ipynb` - focused notebook for beginners
- ✅ **FIXED:** Double JSON stringification bug - structures now load correctly!
- ✅ Template bug fixed ({{version}} replacement now works globally)
- ✅ All standalone HTML files regenerated with correct CDN links

### Bug Fix: Mol* Viewer Loading Issue
Previously, the Mol* viewer displayed but didn't load molecular data due to double JSON stringification in `display.ts`. This has been fixed - all viewers now properly load and display structures!

Previously, only the first few examples had outputs (cells 2, 4, 6, 8, 10). Now **all examples** in the notebook display properly when opened in Jupyter, including:
- Example 5: Surface Representation (cell 12)
- Example 6: Geometric Annotations (cell 14)  
- File saving operations (cells 16, 18)
- Customization options demo (cell 20)
- Example 7: Multi-Snapshot Story (cell 22)

## 🔧 Troubleshooting

### Notebook displays are not showing

If you open the notebook and the molecular viewers don't appear:

1. Make sure you're running in Jupyter (not VS Code or other editors)
2. Try re-executing the cells
3. Check that JavaScript is enabled in your browser
4. Look for errors in the browser console

### Re-executing cells

To re-execute all cells programmatically:

```bash
cd examples
python3 execute_notebook.py
```

This ensures all outputs are regenerated with the latest code.

## 📚 Additional Resources

- [Main Documentation](../README.md)
- [Display Guide](../DISPLAY_GUIDE.md)
- [Jupyter Guide](../JUPYTER_GUIDE.md)
- [Quick Start](../QUICKSTART.md)
- [Example 2 Details](../EXAMPLE2_NOTEBOOK.md)
- [Notebook Update Notes](../NOTEBOOK_UPDATE.md)
- [MolViewSpec Docs](https://molstar.org/mol-view-spec-docs/)

## 🎉 Happy Molecular Visualization!

All examples are ready to explore. Open the notebook and start visualizing molecular structures in 3D!