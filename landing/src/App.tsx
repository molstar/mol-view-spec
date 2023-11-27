import { ExamplesUI } from "./examples";

const DocsLink = 'https://colab.research.google.com/drive/1O2TldXlS01s-YgkD9gy87vWsfCBTYuz9';

export function App() {
    return <div className='container' style={{ marginBottom: 20 }}>
        <div className='row' style={{ textAlign: 'center', marginTop: 40 }}>
            <img style={{ maxWidth: 160, width: '100%', marginBottom: 20 }} src='img/molstar-logo.png' alt='logo' />
            <h2 style={{ fontWeight: 'bold' }}>
                MolViewSpec
            </h2>
        </div>

        <div className='row' style={{ textAlign: 'center' }}>
            <div className='two columns'>&nbsp;</div>
            <div className='eight columns' style={{ borderTop: '1px solid #E0DDD4', paddingTop: 20 }}>
                <h5 className='hero-heading'>
                    Toolkit and <a href='https://molstar.org/'>Mol*</a> Extension for Describing Molecular Visualizations
                </h5>
            </div>
            <div className='two columns'>&nbsp;</div>
        </div>

        <div className='row' style={{ marginTop: 0, display: 'flex' }}>
            <div className='twelve columns' style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ margin: 5, textAlign: 'justify' }}>
                    <p>
                        <b>MolViewSpec</b> provides a generic mechanism for describing visual scenes or views that are used in molecular visualizations.
                        It adopts declarative data-driven approach to describe, load, render, and visually deliver molecular structures, along with 3D representations,
                        coloring schemes, and associated structural, biological, or functional annotations. The toolkit allows for describing the information required
                        for representing a <i>molecular view state</i> as data in a nested tree format that can be consumed by visualization software tools
                        such as Mol*.
                    </p>

                    <p style={{ fontStyle: 'italic' }}>
                        The toolkit is available as a <a href='https://pypi.org/project/molviewspec/' target='_blank' rel='noreferrer'>Python package</a> that enables
                        building molecular scenes via a declarative and API and <a href='https://github.com/molstar/molstar/tree/master/src/extensions/mvs'  target='_blank' rel='noreferrer'>Mol* extension</a> to enable both
                        scene building and visualization.
                    </p>
                </div>
            </div>
        </div>

        <div className='row' style={{ display: 'flex' }}>
            <div className='four columns'>
                <a className='button button-primary' href='https://github.com/molstar/mol-view-spec/' style={{ fontSize: '2rem', width: '100%' }} target='_blank' rel='noreferrer'>
                    <svg width='14' height='14' style={{ marginRight: '0.75rem' }}><use href='#github-logo' /></svg>
                    GitHub
                </a>
            </div>

            <div className='four columns'>
                <a className='button' href={DocsLink} style={{ fontSize: '2rem', width: '100%' }}
                    target='_blank' rel='noreferrer'>Documentation</a>
            </div>

            <div className='four columns'>
                <a className='button' href='https://github.com/molstar/mol-view-spec/issues' style={{ fontSize: '2rem', width: '100%', marginBottom: 0 }}
                    target='_blank' rel='noreferrer'>Issues and Feedback</a>
            </div>
        </div>

        <div className='row' style={{ textAlign: 'center', marginTop: 20, borderTop: '1px solid #E0DDD4', paddingTop: 20 }}>
            <div className='twelve columns'>
                <h5 className='hero-heading' style={{ marginBottom: 0 }}><b>Examples</b></h5>
                <div>
                    The below examples show molecular scenes described using the <a href='https://pypi.org/project/molviewspec/' target='_blank' rel='noreferrer'>MolViewSpec Python package</a><br/>and can be opened in Mol* using the <b>Open in Mol*</b> button.
                </div>
                <div style={{ fontSize: '0.95rem', margin: '0 auto 20px auto', color: '#555' }}>
                    WebGL2 support is required to view the interactive examples. The examples were tested in Firefox, Chrome & Safari on PC, Linux and MacOS/iOS.
                </div>
            </div>
        </div>

        <ExamplesUI />

        <div className='row' style={{ textAlign: 'center', marginTop: 40 }}>
            <div className='twelve columns' style={{ borderTop: '1px solid #E0DDD4', paddingTop: 30 }}>
                <h5 className='hero-heading'>The project is an open collaboration started by</h5>
                <div className='founders'>
                    <a href='https://pdbe.org'><img alt='PDBe' src='img/pdbe_logo.png' /></a>
                    <a href='https://rcsb.org'><img alt='RCSB' src='img/rcsb_logo.png' /></a>
                    <a href='https://ceitec.cz'><img alt='CEITEC' src='img/ceitec_logo.jpg' /></a>
                </div>
            </div>
        </div>


        <div className='row' style={{ textAlign: 'right', color: '#999', marginTop: 20 }}>
            Copyright 2023–now, MolViewSpec Contributors | <a href='terms-of-use.html' style={{ color: '#999' }}>Terms of Use &
                GDPR</a>
        </div>

        <svg style={{ display: 'none' }} version='2.0'>
            <defs>
                <symbol id='github-logo' viewBox='0 0 24 24'>
                    <path d='M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' />
                </symbol>
            </defs>
        </svg>
    </div>
}
