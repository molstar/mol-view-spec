
export interface NodeBase {
    children?: NodeBase[],
}

export interface RootNode extends NodeBase {
    kind: 'root',
}

export interface DownloadNode extends NodeBase {
    kind: 'download',
    url: string,
}

type ParseFormatT = 'mmcif' | 'pdb'

export interface ParseNode extends NodeBase {
    kind: 'parse',
    format: ParseFormatT,
    is_binary?: boolean,
}

export interface StructureNode extends NodeBase {
    kind: 'structure'
    assembly_id?: string,
    model_index?: number,
}

type ComponentSelectorT = 'all' | 'polymer' | 'protein' | 'nucleic' | 'ligand' | 'ion' | 'water'


export interface ComponentNode extends NodeBase {
    kind: 'component'
    selector: ComponentSelectorT
}

type RepresentationTypeT = 'ball-and-stick' | 'cartoon' | 'surface'
type ColorT = 'red' | 'white' | 'blue'  // presumably this is a general type and will be useful elsewhere
// TODO possible to type for hex color strings here?


export interface RepresentationNode extends NodeBase {
    kind: 'representation'
    type: RepresentationTypeT
    color?: ColorT
}

export type Node = RootNode | DownloadNode | ParseNode | StructureNode | ComponentNode | RepresentationNode
