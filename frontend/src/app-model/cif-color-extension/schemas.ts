import { Choice } from 'molstar/lib/extensions/volumes-and-segmentations/helpers';
import { Column, Table } from 'molstar/lib/mol-data/db';


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

export const CIFAnnotationSchema = {
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
    /** Atom name like 'CA', 'N', 'O'... */
    label_atom_id: str,
    /** Atom name like 'CA', 'N', 'O'... */
    auth_atom_id: str,
    /** Element symbol like 'H', 'HE', 'LI', 'BE'... */
    type_symbol: str,
    /** Unique atom identifier across conformations (_atom_site.id) */
    atom_id: int,
    /** 0-base index of the atom in the source data */
    atom_index: int,
    color: str,
    tooltip: str,
} satisfies Table.Schema;

export type AnnotationRow = Partial<Table.Row<typeof CIFAnnotationSchema>>


const CommonFields = ['color', 'tooltip'] as const;

export const FieldsForSchemas = {
    'whole-structure': [...CommonFields],
    'entity': ['label_entity_id', ...CommonFields],
    'chain': ['label_entity_id', 'label_asym_id', ...CommonFields],
    'auth-chain': ['auth_asym_id', ...CommonFields],
    'residue': ['label_entity_id', 'label_asym_id', 'label_seq_id', ...CommonFields],
    'auth-residue': ['auth_asym_id', 'auth_seq_id', 'pdbx_PDB_ins_code', ...CommonFields],
    'residue-range': ['label_entity_id', 'label_asym_id', 'beg_label_seq_id', 'end_label_seq_id', ...CommonFields],
    'auth-residue-range': ['auth_asym_id', 'beg_auth_seq_id', 'end_auth_seq_id', 'pdbx_PDB_ins_code', ...CommonFields],
    'atom': ['label_entity_id', 'label_asym_id', 'label_seq_id', 'label_atom_id', 'type_symbol', 'atom_id', 'atom_index', ...CommonFields],
    'auth-atom': ['auth_asym_id', 'auth_seq_id', 'pdbx_PDB_ins_code', 'auth_atom_id', 'type_symbol', 'atom_id', 'atom_index', ...CommonFields],
    'all-atomic': Object.keys(CIFAnnotationSchema) as (keyof typeof CIFAnnotationSchema)[],
} satisfies { [schema in AnnotationSchema]: (keyof typeof CIFAnnotationSchema)[] };
