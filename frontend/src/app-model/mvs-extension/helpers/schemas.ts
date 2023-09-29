/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Choice } from 'molstar/lib/extensions/volumes-and-segmentations/helpers';
import { Column, Table } from 'molstar/lib/mol-data/db';


/** Names of allowed annotation schemas (values for the annotation schema parameter) */
export type AnnotationSchema = Choice.Values<typeof AnnotationSchema>
export const AnnotationSchema = new Choice(
    {
        'whole-structure': 'Whole Structure',
        'entity': 'Entity',
        'chain': 'Chain (label*)',
        'auth-chain': 'Chain (auth*)',
        'residue': 'Residue (label*)',
        'auth-residue': 'Residue (auth*)',
        'residue-range': 'Residue range (label*)',
        'auth-residue-range': 'Residue range (auth*)',
        'atom': 'Atom (label*)',
        'auth-atom': 'Atom (auth*)',
        'all-atomic': 'All atomic selectors',
    },
    'all-atomic');


const { str, int } = Column.Schema;

/** Definition of `all-atomic` schema for CIF (other atomic schemas are subschemas of this one) */
export const CIFAnnotationSchema = {
    /** Tag for grouping multiple annotation rows with the same `group_id` (e.g. to show one label for two chains);
     * if the `group_id` is not given, the row is processed separately */
    group_id: str,

    label_entity_id: str,
    label_asym_id: str,
    auth_asym_id: str,

    label_seq_id: int,
    auth_seq_id: int,
    pdbx_PDB_ins_code: str,
    /** Minimum label_seq_id (inclusive) */
    beg_label_seq_id: int,
    /** Maximum label_seq_id (inclusive) */
    end_label_seq_id: int,
    /** Minimum auth_seq_id (inclusive) */
    beg_auth_seq_id: int,
    /** Maximum auth_seq_id (inclusive) */
    end_auth_seq_id: int,

    /** Atom name like 'CA', 'N', 'O'... */
    label_atom_id: str,
    /** Atom name like 'CA', 'N', 'O'... */
    auth_atom_id: str,
    /** Element symbol like 'H', 'He', 'Li', 'Be' (case-insensitive)... */
    type_symbol: str,
    /** Unique atom identifier across conformations (_atom_site.id) */
    atom_id: int,
    /** 0-base index of the atom in the source data */
    atom_index: int,
} satisfies Table.Schema;

/** Represents a set of criteria for selection of atoms in a model (`all-atomic` schema).
 * Missing/undefined values mean than we do not care about that specific atom property. */
export type AnnotationRow = Partial<Table.Row<typeof CIFAnnotationSchema>>


/** Allowed fields (i.e. CIF columns or JSON keys) for each annotation schema
 * (other fields will just be ignored) */
export const FieldsForSchemas = {
    'whole-structure': [],
    'entity': ['label_entity_id'],
    'chain': ['label_entity_id', 'label_asym_id'],
    'auth-chain': ['auth_asym_id'],
    'residue': ['label_entity_id', 'label_asym_id', 'label_seq_id'],
    'auth-residue': ['auth_asym_id', 'auth_seq_id', 'pdbx_PDB_ins_code'],
    'residue-range': ['label_entity_id', 'label_asym_id', 'beg_label_seq_id', 'end_label_seq_id'],
    'auth-residue-range': ['auth_asym_id', 'beg_auth_seq_id', 'end_auth_seq_id', 'pdbx_PDB_ins_code'],
    'atom': ['label_entity_id', 'label_asym_id', 'label_seq_id', 'label_atom_id', 'type_symbol', 'atom_id', 'atom_index'],
    'auth-atom': ['auth_asym_id', 'auth_seq_id', 'pdbx_PDB_ins_code', 'auth_atom_id', 'type_symbol', 'atom_id', 'atom_index'],
    'all-atomic': Object.keys(CIFAnnotationSchema) as (keyof typeof CIFAnnotationSchema)[],
} satisfies { [schema in AnnotationSchema]: (keyof typeof CIFAnnotationSchema)[] };
