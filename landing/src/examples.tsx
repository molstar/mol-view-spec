import { ReactNode, useState } from 'react';
import { CopyBlock, dracula } from 'react-code-blocks';

export interface ExampleSpec {
    header: string,
    description: ReactNode,
    name: string,
    python: string,
}


export const Examples: ExampleSpec[] = [{
    header: 'Basic',
    description: 'Load a molecule from URL (PDB ID 1cbs) and display default representation (cartoon) in blue color.',
    name: 'basic',
    python: `builder = create_builder()
structure = (builder
    .download(url="https://www.ebi.ac.uk/pdbe/entry-files/download/1cbs_updated.cif")
    .parse(format="mmcif")
    .model_structure()
    .component()
    .representation()
    .color(color="blue")
)

return builder.get_state()`,
}, {
    header: 'Labels',
    description: 'A molecule (PDB ID 1lap) visualization with a custom labels.',
    name: 'label',
    python: `builder = create_builder()
structure = (builder
    .download(url="https://www.ebi.ac.uk/pdbe/entry-files/download/1lap_updated.cif")
    .parse(format="mmcif")
    .model_structure()
)

# Reference a residue of interest
residue = ComponentExpression(label_asym_id="A", label_seq_id=120)

# Represent everything as cartoon & color the residue red
whole = structure.component()
(whole
    .representation()
    .color(color="red", selector=ComponentExpression(label_asym_id="A", label_seq_id=120))
)

# label the residues with custom text & focus it
(structure
    .component(selector=residue)
    .label(text="ALA 120 A: My Label")
    .focus()
)

return builder.get_state()`,
}, {
    header: 'Components',
    description: 'An aaRS (PDB ID 1c0a) visualization with different selections. Protein in orange, RNA in blue, ligand in green, and active site residues colored red.',
    name: 'components',
    python: `builder = mvs.create_builder()

structure = (builder
    .download(url="https://www.ebi.ac.uk/pdbe/entry-files/download/1c0a_updated.cif")
    .parse(format="mmcif")
    .assembly_structure()
)

# represent protein & RNA as cartoon
(
    structure.component(selector="protein")
    .representation()
    .color(color="#e19039")
)
(
    structure.component(selector="nucleic")
    .representation()
    .color(color="#4b7fcc")
)
# represent ligand in active site as ball-and-stick
ligand = structure.component(selector=mvs.ComponentExpression(label_asym_id='E'))
ligand.representation(type="ball_and_stick").color(color="#229954")

# represent 2 crucial arginine residues as red ball-and-stick and label with custom text
arg_b_217 = (structure
    .component(selector=mvs.ComponentExpression(label_asym_id="B", label_seq_id=217))
)
arg_b_217.representation(type="ball_and_stick").color(color="#ff0000")
arg_b_217.label(text="aaRS Class II Signature")
arg_b_537 = (structure
    .component(selector=mvs.ComponentExpression(label_asym_id="B", label_seq_id=537))
)
arg_b_537.representation(type="ball_and_stick").color(color="#ff0000")
arg_b_537.label(text="aaRS Class II Signature")

# position camera to zoom in on ligand and signature residues
focus = (structure.component(selector=[
    mvs.ComponentExpression(label_asym_id='E'),
    mvs.ComponentExpression(label_asym_id="B", label_seq_id=217),
    mvs.ComponentExpression(label_asym_id="B", label_seq_id=537)
]).focus()

return builder.get_state()`,
}, {
    header: 'Superposition',
    description: 'Two molecules superposed by applying a matrix transform.',
    name: 'superposition',
    python: `builder = create_builder()

# Load first structure and color it red
(builder
    .download(url="https://www.ebi.ac.uk/pdbe/entry-files/download/4hhb_updated.cif")
    .parse(format="mmcif")
    .model_structure()
    .component()
    .representation()
    .color(color="red")
)

# Load second structure, apply matrix transform, and color it blue
(builder
    .download(url="https://www.ebi.ac.uk/pdbe/entry-files/download/1oj6_updated.cif")
    .parse(format="mmcif")
    .model_structure()
    .transform(
        rotation=[
            -0.7202161, -0.33009904, -0.61018308,
            0.36257631, 0.57075962, -0.73673053,
            0.59146191, -0.75184312, -0.29138417
        ],
        translation=[-12.54, 46.79, 94.50]
    )
    .component()
    .representation()
    .color(color="blue")
)

return builder.get_state()`,
}, {
    header: 'Symmetry Mates',
    description: 'Load a molecule determined by X-ray crystallography (PDB ID 1tqn) and display crystal symmetry mates by specifying Miller indices.',
    name: 'symmetry',
    python: `builder = create_builder()
structure = (builder
    .download(url="https://www.ebi.ac.uk/pdbe/entry-files/download/1tqn_updated.cif")
    .parse(format="mmcif")
    .symmetry_structure(ijk_min=(-1, -1, -1), ijk_max=(1, 1, 1))
    .component()
    .representation()
    .color(color="teal")
)

return builder.get_state()`,
}];

export function ExamplesUI() {
    const [example, setExample] = useState<ExampleSpec>(Examples[0]);
    return <>
        <div className='row'>
            <div className='twelve columns'>
                <div className='examples'>
                    {Examples.map((e, i) => <ExamplePreview key={i} example={e} setCurrent={() => setExample(e)} current={example === e} />)}
                </div>
            </div>
        </div>
        <div className='row' style={{ marginTop: 20 }}>
            <CurrentExample example={example} />
        </div>
    </>
}

function ExamplePreview({ example, setCurrent, current }: { example: ExampleSpec, setCurrent: () => void, current?: boolean }) {
    return <div className='tooltip'>
        <a href='#' className={current ? 'current' : undefined} onClick={e => {
            e.preventDefault();
            setCurrent();
        }}><img alt={example.header} src={`examples/${example.name}/thumb.png`} /></a>
        <p className='tooltip-info'>
            <b>{example.header}:</b> {example.description}
        </p>
    </div>
}

function CurrentExample({ example }: { example: ExampleSpec }) {
    const CB = CopyBlock as any;
    return <>
        <div className='row' style={{ marginBottom: 10, display: 'flex', alignItems: 'flex-end' }}>
            <div className='nine columns'>
                <b>{example.header}:</b><br/> {example.description}
            </div>
            <div className='three columns' style={{ display: 'flex', alignItems: 'flex-end' }}>
                <a className='button button-primary' href={resolveExampleSnapshotURL(example.name)} target='_blank' rel='noreferrer' style={{ width: '100%', fontWeight: 'bold', fontSize: '1.5rem', marginBottom: 0 }}>Open in Mol*</a>
            </div>
        </div>
        <div className='row'>
            <div className='twelve columns'>
                <CB text={example.python as any} language='python' wrapLongLines theme={dracula} showLineNumbers />
            </div>
        </div>
    </>
}

// const ViewerURL = 'file:///C:/Projects/molstar/molstar/build/viewer/index.html';
const ViewerRoot = 'https://molstar.org/viewer';
// const SnapshotRoot = window.location.origin;
const SnapshotRoot = 'https://molstar.org/mol-view-spec';
function resolveExampleSnapshotURL(snapshot: string) {
    const snapshotURL = `${SnapshotRoot}/examples/${snapshot}/state.mvsj`;
    return `${ViewerRoot}?mvs-url=${encodeURIComponent(`${snapshotURL}`)}&mvs-format=mvsj&hide-controls=1`;
}