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
    header: 'Example 1',
    description: 'First example',
    thumbnail: 'example1.png',
    uri: 'example1.mvsj',
    python: `builder = Root()
(builder
    .download(url=f"https://www.ebi.ac.uk/pdbe/entry-files/download/{id.lower()}_updated.cif")
    .parse(format="mmcif")
    .symmetry_structure(ijk_min=(-1, -1, -1), ijk_max=(1, 1, 1)))
return builder.get_state()`,
    json: `{ a: 1, b: 2, c: 3 }`
}, {
    header: 'Example 2',
    description: 'Second example',
    thumbnail: 'example2.png',
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
    json: `{ a: 1, b: 2, c: 3 }`
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
        <div className='row'>
            <div className='twelve columns'>
                <b>{example.header}:</b> {example.description}
                <a className='button' href={resolveExampleSnapshotURL(example.uri)} target='_blank' rel='noreferrer' style={{ marginLeft: 20 }}>Open in Mol*</a>
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