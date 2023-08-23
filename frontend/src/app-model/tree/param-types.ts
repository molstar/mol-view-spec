import * as t from 'io-ts';

import { choice, float, int, nullable, str, tuple } from './params-schema';


/** `format` parameter values of `parse` node in MVS tree */
export const ParseFormatT = choice('mmcif', 'bcif', 'pdb');

/** `format` parameter values of `parse` node in Molstar tree */
export const MolstarParseFormatT = choice('cif', 'pdb');

export const StructureKindT = choice('model', 'assembly', 'symmetry', 'crystal-symmetry');

export const ComponentSelectorT = choice('all', 'polymer', 'protein', 'nucleic', 'branched', 'ligand', 'ion', 'water');

export const ComponentExpression = t.partial({
    label_entity_id: str,
    label_asym_id: str,
    auth_asym_id: str,
    label_seq_id: int,
    auth_seq_id: int,
    pdbx_PDB_ins_code: str,
    beg_label_seq_id: int,
    end_label_seq_id: int,
    beg_auth_seq_id: int,
    end_auth_seq_id: int,
    label_atom_id: str,
    auth_atom_id: str,
    type_symbol: str,
    atom_id: int,
    atom_index: int,
});

export const RepresentationTypeT = choice('ball-and-stick', 'cartoon', 'surface');

export const ColorT = choice('white', 'gray', 'black', 'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'magenta');

export const SchemaT = choice('whole-structure', 'entity', 'chain', 'auth-chain', 'residue', 'auth-residue', 'residue-range', 'auth-residue-range', 'atom', 'auth-atom', 'all-atomic');

export const SchemaFormatT = choice('cif', 'bcif', 'json');

export const Vector3 = tuple([float, float, float]);

export const Matrix = tuple([float, float, float]);


/** Convert `format` parameter of `parse` node in MVS tree
 * into `format` and `is_binary` parameters in Molstar tree */
export const ParseFormatMvsToMolstar = {
    mmcif: { format: 'cif', is_binary: false },
    bcif: { format: 'cif', is_binary: true },
    pdb: { format: 'pdb', is_binary: false },
} satisfies { [p in t.TypeOf<typeof ParseFormatT>]: { format: t.TypeOf<typeof MolstarParseFormatT>, is_binary: boolean } };
