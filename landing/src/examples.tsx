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
}, {
    header: 'Annotations',
    description: 'Load a structure (PDB ID 1h9t) and apply coloring and labels based on data from an MVS annotation file.',
    name: 'annotations',
    python: `builder = create_builder()

structure_url = "https://files.wwpdb.org/download/1h9t.cif"
annotation_url = "https://molstar.org/mol-view-spec/examples/annotations/annotations-1h9t.cif"

# Load structure
structure = (builder
             .download(url=structure_url)
             .parse(format="mmcif")
             .model_structure()
             )

# Create components using MVS annotations
protein = structure.component_from_uri(
    uri=annotation_url, format="cif",
    block_header="1h9t_annotations", category_name="components",
    field_name="component", field_values="Protein", schema="chain")
dna = structure.component_from_uri(
    uri=annotation_url, format="cif",
    category_name="components", field_values="DNA", schema="chain")
ions = structure.component_from_uri(
    uri=annotation_url, format="cif",
    category_name="components", field_values=["Gold", "Chloride"],
    schema="chain")

# Create representations
protein_repr = protein.representation(type="cartoon")
dna_repr = dna.representation(type="ball_and_stick")
ions_repr = ions.representation(type="surface")

# Apply coloring using MVS annotations
protein_repr.color_from_uri(
    uri=annotation_url, format="cif",
    block_header="1h9t_annotations", category_name="annotations",
    field_name="color", schema="residue_range")
dna_repr.color_from_uri(
    uri=annotation_url, format="cif",
    category_name="annotations", schema="residue_range")
ions_repr.color_from_uri(
    uri=annotation_url, format="cif",
    category_name="annotations", schema="residue_range")

# Add labels using MVS annotations
structure.label_from_uri(
    uri=annotation_url, format="cif",
    block_header="1h9t_annotations", category_name="annotations",
    field_name="label", schema="residue_range")

# Add tooltips using MVS annotations
structure.tooltip_from_uri(
    uri=annotation_url, format="cif",
    block_header="1h9t_annotations", category_name="annotations",
    field_name="label", schema="residue_range")

return builder.get_state()`,
}, {
    header: 'Primitives',
    description: 'Draw various geometrical primitives.',
    name: 'primitives',
    python: `builder = create_builder()
(
    builder.primitives(opacity=0.66)
    .ellipse(
        color="red",
        center=(1, 1, 1),
        major_axis=(1.5, 0, 0),
        minor_axis=(0, 2, 0),
        theta_start=0,
        theta_end=math.pi / 2,
        tooltip="XY",
    )
    .ellipse(
        color="green",
        center=(1, 1, 1),
        major_axis_endpoint=(1.5 + 1, 0 + 1, 0 + 1),
        minor_axis_endpoint=(0 + 1, 0 + 1, 1 + 1),
        theta_start=0,
        theta_end=math.pi / 2,
        tooltip="XZ",
    )
    .ellipse(
        color="blue",
        center=(1, 1, 1),
        major_axis=(0, 10, 0),
        minor_axis=(0, 0, 1),
        radius_major=2,
        radius_minor=1,
        theta_start=0,
        theta_end=math.pi / 2,
        tooltip="YZ",
    )
    .arrow(
        start=(1, 1, 1),
        end=(1 + 1.5, 1 + 0, 1 + 0),
        tube_radius=0.05,
        length=1.5 + 0.2,
        show_end_cap=True,
        color="#ffff00",
        tooltip="X",
    )
    .arrow(
        start=(1, 1, 1),
        direction=(0, 2 + 0.2, 0),
        tube_radius=0.05,
        show_end_cap=True,
        color="#ff00ff",
        tooltip="Y",
    )
    .arrow(
        end=(1, 1, 1),
        start=(1 + 0, 1 + 0, 1 + 1 + 0.2),
        show_start_cap=True,
        tube_radius=0.05,
        color="#00ffff",
        tooltip="Z",
    )
)

(
    builder.primitives(opacity=0.33).ellipsoid(
        center=(1, 1, 1),
        major_axis=(1, 0, 0),
        minor_axis=(0, 1, 0),
        radius=(1.5, 2, 1),
        color="#cccccc",
    )
)

return builder.get_state()`,
}, {
    header: 'Volumes',
    description: 'Load a structure and a volume from the Mol* Volume Server.',
    name: 'volumes',
    python: `builder = create_builder()

structure = (
    builder
    .download(url=_url_for_mmcif("1tqn")).parse(format="mmcif").model_structure()
)
(
    structure
    .component(selector="polymer")
    .representation(type="cartoon")
    .color(color="white")
)

ligand = structure.component(selector="ligand")
(
    ligand
    .representation(type="ball_and_stick")
    .color(custom={"molstar_color_theme_name": "element-symbol"})
)
ligand.focus(
    up=[0.98, -0.19, 0],
    direction=[-28.47, -17.66, -16.32],
    radius=14,
    radius_extent=5
)

volume_data = builder.download(
    url="https://www.ebi.ac.uk/pdbe/densities/x-ray/1tqn/box/-22.367,-33.367,-21.634/-7.106,-10.042,-0.937?detail=3"
).parse(format="bcif")

volume_data.volume(channel_id="2FO-FC").representation(
    type="isosurface",
    relative_isovalue=1.5,
    show_wireframe=True,
    show_faces=False,
).color(color="blue").opacity(opacity=0.3)

fo_fc = volume_data.volume(channel_id="FO-FC")
fo_fc.representation(
    type="isosurface",
    relative_isovalue=3,
    show_wireframe=True
).color(color="green").opacity(
    opacity=0.3
)
fo_fc.representation(
    type="isosurface",
    relative_isovalue=-3,
    show_wireframe=True
).color(color="red").opacity(
    opacity=0.3
)

snapshot = builder.get_snapshot(
    title="1tqn",
    description="""
### 1tqn with ligand and electron density map
- 2FO-FC at 1.5σ, blue
- FO-FC (positive) at 3σ, green
- FO-FC (negative) at -3σ, red
""",
)

return States(
    snapshots=[snapshot],
    metadata=GlobalMetadata(description="1tqn + Volume Server")
)
`,
}];

export function ExamplesUI() {
    const [example, setExample] = useState<ExampleSpec>(Examples[0]);
    return <>
        <div style={{ textAlign: 'center', marginTop: 20, padding: '0 20px' }}>
            <div className='examples'>
                {Examples.map((e, i) => <ExamplePreview key={i} example={e} setCurrent={() => setExample(e)} current={example === e} />)}
            </div>
        </div>
        <div style={{ margin: '20px auto', padding: '0 40px', maxWidth: 1980 }}>
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
    const url = resolveExampleSnapshotURL(example.name);
    return <>
        <div className='row' style={{ marginBottom: 10, display: 'flex', alignItems: 'flex-end' }}>
            <div className='nine columns'>
                <b>{example.header}:</b><br/> {example.description}
            </div>
            <div className='three columns' style={{ display: 'flex', alignItems: 'flex-end' }}>
                <a className='button button-primary' href={url} target='_blank' rel='noreferrer' style={{ width: '100%', fontWeight: 'bold', fontSize: '1.5rem', marginBottom: 0 }}>Open in New Window</a>
            </div>
        </div>
        <div style={{ display: 'flex' }}>
            <div style={{ flexGrow: 1, flexShrink: 0, flexBasis: '50%' }}>
                <iframe src={url} style={{ width: '100%', aspectRatio: 4 / 3, border: '1px solid #E0DDD4' }} />
            </div>
            <div style={{ flexGrow: 1, flexShrink: 0, flexBasis: '50%' }}>
                <div style={{ width: '100%', aspectRatio: 4 / 3, border: 'none', position: 'relative', marginLeft: 10 }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', overflowY: 'auto' }}>
                        <CB text={example.python as any} language='python' wrapLongLines theme={dracula} showLineNumbers style={{ minHeight: '100%' }} />
                    </div>
                </div>
            </div>
        </div>
    </>
}

// const ViewerRoot = 'file:///C:/Projects/molstar/molstar/build/viewer/index.html';
const ViewerRoot = 'https://molstar.org/viewer';
// const SnapshotRoot = window.location.origin;
const SnapshotRoot = 'https://molstar.org/mol-view-spec';
function resolveExampleSnapshotURL(snapshot: string) {
    const snapshotURL = `${SnapshotRoot}/examples/${snapshot}/state.mvsj`;
    return `${ViewerRoot}?mvs-url=${encodeURIComponent(`${snapshotURL}`)}&mvs-format=mvsj&hide-controls=1`;
}