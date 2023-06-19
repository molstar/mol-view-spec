import { choice } from "./params-schema"

export type ParseFormatT = 'mmcif' | 'pdb'

export type ComponentSelectorT = 'all' | 'polymer' | 'protein' | 'nucleic' | 'ligand' | 'ion' | 'water'

export type RepresentationTypeT = 'ball-and-stick' | 'cartoon' | 'surface'

export type ColorT = 'red' | 'white' | 'blue'  // presumably this is a general type and will be useful elsewhere
// TODO possible to type for hex color strings here?


export const ParseFormatT = choice('mmcif', 'pdb');

export const ComponentSelectorT = choice('all', 'polymer', 'protein', 'nucleic', 'ligand', 'ion', 'water');

export const RepresentationTypeT = choice('ball-and-stick', 'cartoon', 'surface');

export const ColorT = choice('red', 'white', 'blue');  // presumably this is a general type and will be useful elsewhere