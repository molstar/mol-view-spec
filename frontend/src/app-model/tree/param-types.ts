import * as t from 'io-ts';

import { choice } from './params-schema';


/** `format` parameter values of `parse` node in MVS tree */
export const ParseFormatT = choice('mmcif', 'bcif', 'pdb');

/** `format` parameter values of `parse` node in Molstar tree */
export const MolstarParseFormatT = choice('cif', 'pdb');

export const StructureKindT = choice('model', 'assembly', 'symmetry', 'crystal-symmetry');

export const ComponentSelectorT = choice('all', 'polymer', 'protein', 'nucleic', 'branched', 'ligand', 'ion', 'water');

export const RepresentationTypeT = choice('ball-and-stick', 'cartoon', 'surface');

export const ColorT = choice('white', 'gray', 'black', 'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'magenta');

export const SchemaT = choice('chain', 'auth-chain', 'residue', 'auth-residue', 'residue-range', 'auth-residue-range', 'atom', 'auth-atom');

export const SchemaFormatT = choice('cif', 'json');

/** Convert `format` parameter of `parse` node in MVS tree
 * into `format` and `is_binary` parameters of `parse` node in Molstar tree */
export const ParseFormatMvsToMolstar = {
    mmcif: { format: 'cif', is_binary: false },
    bcif: { format: 'cif', is_binary: true },
    pdb: { format: 'pdb', is_binary: false },
} satisfies { [p in t.TypeOf<typeof ParseFormatT>]: { format: t.TypeOf<typeof MolstarParseFormatT>, is_binary: boolean } };
