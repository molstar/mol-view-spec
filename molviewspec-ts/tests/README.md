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

### 4. `mvsx_converter_test.ts`

Tests for MVSJ to MVSX conversion with full I/O capabilities

**Files tested (same as Python `test_colab_examples`):**

- All 6 files from `test-data/colab_examples/` are converted to MVSX format

**Tests:**

- Finding URI references in MVSJ structures
- Updating URI references
- Creating MVSX archives from MVSJ files
- Extracting MVSX archives
- Multi-state MVSJ support
- Validation error handling
- Roundtrip data preservation
- MVSX creation for all colab example files
- URI mapping structure preservation

**Total: 10 tests**

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

**Total Tests: 49**

- ✅ All tests passing
- ✅ Testing same example files as Python tests
- ✅ Core serialization functionality covered
- ✅ URI manipulation and validation covered
- ✅ Multi-state file support verified
- ✅ Metadata handling validated
- ✅ MVSX archive creation and extraction working
- ✅ Full I/O capabilities implemented

## Comparison with Python Tests

| Python Test                                        | TypeScript Equivalent                                | Status                     |
| -------------------------------------------------- | ---------------------------------------------------- | -------------------------- |
| `test_serialization.py`                            | `serialization_test.ts`                              | ✅ Equivalent coverage     |
| `test_mvsj_to_mvsx.py::test_colab_examples`        | `examples_test.ts` + `mvsx_converter_test.ts`        | ✅ Tests all 6 files       |
| `test_mvsj_to_mvsx.py::test_find_uri_references`   | `mvsj_validation_test.ts` + `mvsx_converter_test.ts` | ✅ Full implementation     |
| `test_mvsj_to_mvsx.py::test_update_uri_references` | `mvsj_validation_test.ts` + `mvsx_converter_test.ts` | ✅ Full implementation     |
| `test_mvsj_to_mvsx.py::mvsj_to_mvsx`               | `mvsx_converter_test.ts`                             | ✅ Full I/O implementation |
| `test_mvsj_to_mvsx.py::extract_mvsx`               | `mvsx_converter_test.ts`                             | ✅ Full I/O implementation |

## Implementation Details

The TypeScript implementation includes:

- **mvsx_converter.ts**: Full Python equivalent with all I/O capabilities
  - ZIP archive creation using jszip
  - File reading/writing using Deno APIs
  - HTTP downloads using fetch API
  - Temporary directory management
  - Path manipulation using @std/path
  - Directory operations using @std/fs
- **Complete test coverage**: All Python test scenarios implemented
- **Same test data**: Uses exact same files from test-data/colab_examples/

## Data Sources

All example MVSJ files are located in:

```
../test-data/colab_examples/
```

These are the same files used by the Python test suite, ensuring consistency across implementations.
