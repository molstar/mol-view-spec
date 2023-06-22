import { choice } from './params-schema';


export const ParseFormatT = choice('mmcif', 'pdb');

export const StructureKindT = choice('model', 'assembly', 'symmetry', 'crystal-symmetry');

export const ComponentSelectorT = choice('all', 'polymer', 'protein', 'nucleic', 'branched', 'ligand', 'ion', 'water');

export const RepresentationTypeT = choice('ball-and-stick', 'cartoon', 'surface');

export const ColorT = choice('red', 'white', 'blue'); // presumably this is a general type and will be useful elsewhere
