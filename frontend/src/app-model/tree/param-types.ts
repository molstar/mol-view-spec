export type ParseFormatT = 'mmcif' | 'pdb'

export type ComponentSelectorT = 'all' | 'polymer' | 'protein' | 'nucleic' | 'ligand' | 'ion' | 'water'

export type RepresentationTypeT = 'ball-and-stick' | 'cartoon' | 'surface'

export type ColorT = 'red' | 'white' | 'blue'  // presumably this is a general type and will be useful elsewhere
// TODO possible to type for hex color strings here?
