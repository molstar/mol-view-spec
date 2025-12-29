# TypeScript Test Suite

This directory contains the TypeScript test suite for molviewspec-ts, mirroring the functionality of the Python test suite.

## Test Files

### 1. `serialization_test.ts`
Equivalent to Python's `test_serialization.py`

**Tests:**
- Box primitive serialization
- Mesh primitive serialization
- Sphere primitive serialization
- Tube primitive serialization
- Label primitive serialization
- Distance measurement primitive serialization
- Complete structure with component serialization
- Metadata fields
- Multi-state snapshots
- Canvas and camera nodes

**Total: 10 tests**

### 2. `examples_test.ts`
Tests using real MVSJ files from `test-data/colab_examples/`

**Files tested (same as Python `test_colab_examples`):**
- `minimal.mvsj` - Basic structure with single component
- `components.mvsj` - Multiple components with different selectors
- `geometrical.mvsj` - Geometric primitives
- `labels.mvsj` - Label nodes
- `volumetric.mvsj` - Volume and volume_representation nodes (multi-state)
- `superimpose.mvsj` - Multiple structures with transforms

**Tests:**
- Structure validation for each example file
- Builder recreation tests
- Selector tests (string, object, and array selectors)
- Focus node tests
- Primitives validation
- Volume nodes validation
- Metadata validation across all examples
- JSON serialization/deserialization roundtrip

**Total: 14 tests**

### 3. `mvsj_validation_test.ts`
Equivalent to core functionality from Python's `test_mvsj_to_mvsx.py`

**Tests:**
- Finding URI references in simple trees
- Finding URI references in complex trees
- Finding URI references with color_from_uri nodes
- Finding URI references in multi-state files
- Updating URI references
- Updating multiple URI references
- Distinguishing remote vs local URIs
- Validating state tree structure
- Validating multi-state structure
- Detecting invalid state trees
- Serialization and deserialization
- URI references in all node types
- Tree structure preservation during updates
- Metadata field presence and format
- Snapshot metadata fields

**Total: 15 tests**

## Running Tests

Run all tests:
```bash
deno test --allow-read
```

Run specific test file:
```bash
deno test --allow-read tests/serialization_test.ts
deno test --allow-read tests/examples_test.ts
deno test --allow-read tests/mvsj_validation_test.ts
```

Run with type checking disabled (for development):
```bash
deno test --no-check --allow-read
```

## Test Coverage Summary

**Total Tests: 39**
- ✅ All tests passing
- ✅ Testing same example files as Python tests
- ✅ Core serialization functionality covered
- ✅ URI manipulation and validation covered
- ✅ Multi-state file support verified
- ✅ Metadata handling validated

## Comparison with Python Tests

| Python Test | TypeScript Equivalent | Status |
|------------|----------------------|--------|
| `test_serialization.py` | `serialization_test.ts` | ✅ Equivalent coverage |
| `test_mvsj_to_mvsx.py::test_colab_examples` | `examples_test.ts` | ✅ Tests all 6 files |
| `test_mvsj_to_mvsx.py::test_find_uri_references` | `mvsj_validation_test.ts` | ✅ Core logic tested |
| `test_mvsj_to_mvsx.py::test_update_uri_references` | `mvsj_validation_test.ts` | ✅ Core logic tested |

**Note:** The TypeScript tests focus on MVSJ data validation and manipulation logic. File I/O operations for MVSX creation (zip files, URL downloads) are intentionally not included as they would require additional Deno dependencies or Node.js APIs.

## Data Sources

All example MVSJ files are located in:
```
../test-data/colab_examples/
```

These are the same files used by the Python test suite, ensuring consistency across implementations.
