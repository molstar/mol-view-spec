# MolViewSpec selectors

Selectors are used in MVS to define substructures (components) and apply colors, labels, or tooltips to them. MVS nodes that take a `selector` parameter are `component` (creates a component from the parent `structure` node) and `color` (applies coloring to a part of the parent `representation` node).

There are three kinds of selectors:

-   **Static selector** is a string that selects a part of the structure based on entity type. The supported static selectors are these:

    `"all", "polymer", "protein", "nucleic", "branched", "ligand", "ion", "water"`

-   **Component expression** is an object that selects a set of atoms based on their properties like chain identifier, residue number, or type symbol. The type of a component expression object is:

    ```ts
    {
        label_entity_id?: str,    // Entity identifier
        label_asym_id?: str,      // Chain identifier in label_* numbering
        auth_asym_id?: str,       // Chain identifier in auth_* numbering
        label_seq_id?: int,       // Residue number in label_* numbering
        auth_seq_id?: int,        // Residue number in auth_* numbering
        pdbx_PDB_ins_code?: str,  // PDB insertion code
        beg_label_seq_id?: int,   // Minimum label_seq_id (inclusive), leave blank to start from the beginning of the chain
        end_label_seq_id?: int,   // Maximum label_seq_id (inclusive), leave blank to go to the end of the chain
        beg_auth_seq_id?: int,    // Minimum auth_seq_id (inclusive), leave blank to start from the beginning of the chain
        end_auth_seq_id?: int,    // Maximum auth_seq_id (inclusive), leave blank to go to the end of the chain
        label_atom_id?: str,      // Atom name like 'CA', 'N', 'O', in label_* numbering
        auth_atom_id?: str,       // Atom name like 'CA', 'N', 'O', in auth_* numbering
        type_symbol?: str,        // Element symbol like 'H', 'HE', 'LI', 'BE'
        atom_id?: int,            // Unique atom identifier (_atom_site.id)
        atom_index?: int,         // 0-based index of the atom in the source data
        instance_id?: str         // Instance identifier to distinguish instances of the same chain created by applying different symmetry operators, like 'ASM-X0-1' for assemblies or '1_555' for crystals
    }
    ```

    A component expression can include any combination of the fields. An expression with multiple fields selects atoms that fulfill all fields at the same time. Examples:

    ```ts
    // Select whole chain A
    selector: { label_asym_id: 'A' }

    // Select residues 100 to 200 (inclusive) in chain B
    selector: { label_asym_id: 'B', beg_label_seq_id: 100, end_label_seq_id: 200 }

    // Select C-alpha atoms in residue 100 (using auth_* numbering) of any chain
    selector: { auth_seq_id: 100, type_symbol: 'C', auth_atom_id: 'CA' }
    ```

-   **Union component expression** is an array of simple component expressions. A union component expression is interpreted as set union, i.e. it selects all atoms that fulfill at least one of the expressions in the array. Example:

    ```ts
    // Select chains A, B, and C
    selector: [{ label_asym_id: 'A' }, { label_asym_id: 'B' }, { label_asym_id: 'C' }];

    // Select residues up to 100 (inclusive) in chain A plus all magnesium atoms
    selector: [{ label_asym_id: 'A', end_label_seq_id: 100 }, { type_symbol: 'MG' }];
    ```

### `instance_id`

The `instance_id` field in component expressions does not refer to any column in mmCIF `atom_site` category, but can be used distinguish instances of the same chain created by applying different symmetry operators. Instance IDs follow these rules:

#### Crystals

Instances created by crystal (spacegroup) symmetry use IDs in the form `n_klm`, in accordance with the [mmCIF dictionary recommendation](https://mmcif.wwpdb.org/dictionaries/mmcif_pdbx_v50.dic/Items/_struct_conn.ptnr1_symmetry.html). However, to avoid any ambiguities, any translation index (`k`, `l`, `m`) smaller than 0 or greater than 9 is always enclosed in parenthesis. Indices 0–9 never use parentheses.

-   e.g. `1_555`, `2_454`
-   e.g. `1_(11)15`, `1_1(11)5`, `1_11(15)` (instead of ambiguous `1_1115`)
-   e.g. `1_(-1)1(-1)`

#### Assemblies

Instances in assemblies use IDs inspired by the [wwPDB recommendation for naming chains in assemblies](https://www.wwpdb.org/news/news?year=2022#62559153c8eabd0c4864f208). Instance IDs are based on data from [pdbx_struct_assembly_gen](https://mmcif.wwpdb.org/dictionaries/mmcif_pdbx_v50.dic/Categories/pdbx_struct_assembly_gen.html) and [pdbx_struct_oper_list](https://mmcif.wwpdb.org/dictionaries/mmcif_pdbx_v50.dic/Categories/pdbx_struct_oper_list.html) categories in mmCIF dictionary.

Where only one operator is applied to create the instance, the instance ID is `ASM-` plus the operator identifier ([pdbx_struct_oper_list.id](https://mmcif.wwpdb.org/dictionaries/mmcif_pdbx_v50.dic/Items/_pdbx_struct_oper_list.id.html)).

-   e.g. `ASM-1`, `ASM-2`, `ASM-3`, `ASM-4` from generator expression `1,2,3,4`
-   e.g. `ASM-1`, `ASM-2`, `ASM-3`, `ASM-4`, `ASM-5` from generator expression `(1-5)`

Where multiple operators are applied to create the instance, the instance ID is `ASM-` plus a dash-separated list of operator identifiers. The order of the operators is the same as in the [generator expression](https://mmcif.wwpdb.org/dictionaries/mmcif_pdbx_v50.dic/Items/_pdbx_struct_assembly_gen.oper_expression.html) (i.e. rightmost operator is applied first).

-   e.g. `ASM-X0-1`, `ASM-X0-2`... `ASM-X0-20` from generator expression `(X0)(1-20)`
-   e.g. `ASM-1-61`, `ASM-1-62`... `ASM-2-61`, `ASM-2-62`... `ASM-60-88` from generator expression `(1-60)(61-88)`

### `ref`

Component expressions can be applied to primitives as well. Furthermore, a `ref` can be provided to make selections with
a specific node when working e.g. with multiple structures.
Any MVS node allows you to set an anchor:

    builder.download(url=url).parse(format="mmcif").model_structure(ref="X")

This `ref` can then be referenced in the context of a selection:

    PrimitiveComponentExpressions(structure_ref="X", expressions=[ComponentExpression(auth_seq_id=508)])

An alternative to using selectors is using [MVS annotations](./annotations.md). This means defining the selections in a separate file and referencing them from the MVS file.
