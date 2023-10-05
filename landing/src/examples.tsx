import { ReactNode, useState } from 'react';
import { CopyBlock, dracula } from 'react-code-blocks';

export interface ExampleSpec {
    header: string,
    description: ReactNode,
    thumbnail: string,
    uri: string,
    python: string,
    json: string,
}


export const Examples: ExampleSpec[] = [{
    header: 'Ligand Focus',
    description: 'Load 4hhb and zoom in on the 1st HEM ligand. The ligand and its non-covalent interaction partners are shown in ball-and-stick representation.',
    thumbnail: 'example1.png',
    uri: 'example1.mvsj',
    python: `builder = Root()
structure = (
    builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/4hhb_updated.cif")
    .parse(format="mmcif")
    .model_structure()
)
structure.component().representation()
structure.component(selector=ComponentExpression(label_asym_id="E")).focus()

return builder.get_state()`,
    json: ``
}, {
    header: 'Color by Chain',
    description: 'Load a gamma-thrombin that was cleaved into 4 fragments and color each chain differently.',
    thumbnail: 'example2.png',
    uri: 'example1.mvsj',
    python: `builder = Root()
structure = (
    builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/2hnt_updated.cif")
    .parse(format="mmcif")
    .model_structure()
)
(
    structure.component()
    .representation(type="cartoon")
    .color(selector=ComponentExpression(label_asym_id="A"), color="#648fff")
    .color(selector=ComponentExpression(label_asym_id="B"), color="#785ef0")
    .color(selector=ComponentExpression(label_asym_id="C"), color="#dc267f")
    .color(selector=ComponentExpression(label_asym_id="D"), color="#fe6100")
)

return builder.get_state()`,
    json: ``
}, {
    header: 'Structure Superposition',
    description: 'Superimpose 4hhb and 1oj6 by rotating and translating the 2nd structure.',
    thumbnail: 'example3.png',
    uri: 'example1.mvsj',
    python: `builder = Root()
(
    builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/4hhb_updated.cif")
    .parse(format="mmcif")
    .model_structure()
)
(
    builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/1oj6_updated.cif")
    .parse(format="mmcif")
    .model_structure()
    .transform(
        rotation=[-0.72, -0.33, -0.61, 0.36, 0.57, -0.74, 0.59, -0.75, -0.30],
        translation=[-12.54, 46.79, 94.50]
    )
)
return builder.get_state()`,
    json: ``
}, {
    header: 'Structure Superposition',
    description: 'Superimpose 4hhb and 1oj6 by rotating and translating the 2nd structure.',
    thumbnail: 'example4.png',
    uri: 'example1.mvsj',
    python: `builder = Root()
(
    builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/4hhb_updated.cif")
    .parse(format="mmcif")
    .model_structure()
)
(
    builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/1oj6_updated.cif")
    .parse(format="mmcif")
    .model_structure()
    .transform(
        rotation=[-0.72, -0.33, -0.61, 0.36, 0.57, -0.74, 0.59, -0.75, -0.30],
        translation=[-12.54, 46.79, 94.50]
    )
)
return builder.get_state()`,
    json: ``
}, {
    header: 'Structure Superposition',
    description: 'Superimpose 4hhb and 1oj6 by rotating and translating the 2nd structure.',
    thumbnail: 'example5.png',
    uri: 'example1.mvsj',
    python: `builder = Root()
(
    builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/4hhb_updated.cif")
    .parse(format="mmcif")
    .model_structure()
)
(
    builder.download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/1oj6_updated.cif")
    .parse(format="mmcif")
    .model_structure()
    .transform(
        rotation=[-0.72, -0.33, -0.61, 0.36, 0.57, -0.74, 0.59, -0.75, -0.30],
        translation=[-12.54, 46.79, 94.50]
    )
)
return builder.get_state()`,
    json: ``
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
        }}><img alt={example.header} src={`img/examples/${example.thumbnail}`} /></a>
        <p className='tooltip-info'>
            <b>{example.header}:</b> {example.description}
        </p>
    </div>
}

function CurrentExample({ example }: { example: ExampleSpec }) {

    return <>
        <div className='row' style={{ marginBottom: 10, display: 'flex', alignItems: 'flex-end' }}>
            <div className='nine columns'>
                <b>{example.header}:</b><br/> {example.description}    
            </div>
            <div className='three columns' style={{ display: 'flex', alignItems: 'flex-end' }}>
                <a className='button' href={resolveExampleSnapshotURL(example.uri)} target='_blank' rel='noreferrer' style={{ width: '100%', fontWeight: 'bold', marginBottom: 0 }}>Open in Mol*</a>
            </div>
        </div>
        <div className='row'>
            <div className='twelve columns'>
                <CopyBlock text={example.python as any} language='python' wrapLongLines theme={dracula} showLineNumbers />
            </div>
        </div>
    </>
}



const ViewerURL = 'https://molstar.org/viewer/';
function resolveExampleSnapshotURL(snapshot: string) {
    const snapshotRoot = `${window.location.origin}/snapshots/`;
    return `${ViewerURL}?snapshot-url=${encodeURIComponent(`${snapshotRoot}${snapshot}`)}&snapshot-url-type=molj&prefer-webgl1=1`;
}