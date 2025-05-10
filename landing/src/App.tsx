import { ExamplesUI } from './examples';

const PythonCollabLink = 'https://colab.research.google.com/drive/1O2TldXlS01s-YgkD9gy87vWsfCBTYuz9';
const MkDocsLink = 'https://molstar.org/mol-view-spec-docs/';

export function App() {
    return <>
        <div className='container' style={{ marginBottom: 20 }}>
            <div className='row' style={{ textAlign: 'center', marginTop: 40 }}>
                <a href='https://molstar.org/' target='_blank' rel='noreferrer'>
                    <img style={{ maxWidth: 160, width: '100%', marginBottom: 20 }} src='img/molstar-logo.png' alt='logo' />
                </a>
                <h2 style={{ fontWeight: 'bold' }}>
                    MolViewSpec
                </h2>
            </div>

            <div className='row' style={{ textAlign: 'center' }}>
                <div className='one columns'>&nbsp;</div>
                <div className='ten columns' style={{ borderTop: '1px solid #E0DDD4', paddingTop: 20 }}>
                    <h5 className='hero-heading'>
                        Toolkit and <a href='https://molstar.org/'>Mol*</a> Extension for Describing Molecular Visualizations
                    </h5>
                </div>
                <div className='one columns'>&nbsp;</div>
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
                            The toolkit is available under <a href='https://github.com/molstar/mol-view-spec/blob/master/LICENSE' target='_blank' rel='noreferrer'>MIT license</a> (free for both commertial and non-commerial use) as a <a href='https://pypi.org/project/molviewspec/' target='_blank' rel='noreferrer'>Python package</a> that enables
                            building molecular scenes via a declarative API and <a href='https://github.com/molstar/molstar/tree/master/src/extensions/mvs' target='_blank' rel='noreferrer'>Mol* extension</a> to enable both
                            scene building and visualization.
                        </p>
                    </div>
                </div>
            </div>

            <div className='row' style={{ display: 'flex' }}>
                <div className='twelve columns header-links'>
                    <a className='button button-primary' href='https://github.com/molstar/mol-view-spec/' style={{ fontSize: '2rem' }} target='_blank' rel='noreferrer'>
                        <svg width='14' height='14' style={{ marginRight: '0.75rem' }}><use href='#github-logo' /></svg>
                        GitHub
                    </a>
                    <a className='button' href='https://github.com/molstar/mol-view-spec/issues' style={{ fontSize: '2rem' }}
                        target='_blank' rel='noreferrer'>Issues and Feedback</a>
                </div>
            </div>

            <div className='row' style={{ display: 'flex' }}>
                <div className='twelve columns header-links'>
                    <a className='button' href={MkDocsLink} style={{ fontSize: '1.5rem' }}
                        target='_blank' rel='noreferrer'>Documentation</a>
                    <a className='button' href={PythonCollabLink} style={{ fontSize: '1.5rem' }}
                        target='_blank' rel='noreferrer'>Python Collab</a>
                    <a className='button' href='https://doi.org/10.1002/cpz1.1099' style={{ fontSize: '1.5rem' }}
                        target='_blank' rel='noreferrer'>Protocols</a>
                    <a className='button' href='https://doi.org/10.1093/nar/gkaf370' style={{ fontSize: '1.5rem' }}
                        target='_blank' rel='noreferrer'>NAR Paper</a>
                </div>
            </div>

            <div className='row' style={{ textAlign: 'justify', marginTop: 20 }}>
                <div className='twelve columns'>
                    <b>When using MolViewSpec, please cite:</b><br />
                    <ul>
                        <li><span style={{ fontSize: 'smaller' }}>Adam Midlik, Sebastian Bittrich, Jennifer R Fleming, Sreenath Nair, Sameer Velankar, Stephen K Burley, Jasmine Y Young, Brinda Vallat, David Sehnal: <a
                            href='https://doi.org/10.1093/nar/gkaf370'>MolViewSpec: a Mol* extension for describing and sharing molecular visualizations</a>, <i>Nucleic Acids Research</i>, 2025; <a
                                href='https://doi.org/10.1093/nar/gkaf370'>10.1093/nar/gkaf370</a>.</span>
                        </li>
                        <li>
                            <span style={{ fontSize: 'smaller' }}>Sebastian Bittrich, Adam Midlik, Mihaly Varadi, Sameer Velankar, Stephen K. Burley, Jasmine Y. Young, David Sehnal, Brinda Vallat: <a
                                href='https://doi.org/10.1002/cpz1.1099'>Describing and Sharing Molecular Visualizations Using the MolViewSpec Toolkit</a>, <i>Current Protocols</i>, 2024; <a
                                    href='https://doi.org/10.1002/cpz1.1099'>10.1002/cpz1.1099</a>.</span>
                        </li>
                    </ul>
                </div>
            </div>


            <div className='row' style={{ textAlign: 'center', marginTop: 20, borderTop: '1px solid #E0DDD4', paddingTop: 20 }}>
                <div className='twelve columns'>
                    <h5 className='hero-heading' style={{ marginBottom: 0 }}><b>Demos</b></h5>
                </div>
            </div>

            <div style={{ width: '100%', textAlign: 'center', marginTop: 20 }}>
                <div className='demos'>
                    <div className='tooltip'>
                        <a href='https://molstar.org/demos/mvs-stories/' target='_blank' rel='noreferrer'><img alt='Stories' src='img/stories.png' /></a>
                        <p className='tooltip-info'>
                            <b>Stories:</b> An interactive molecular story-telling app. The source code can be found <a
                                href='https://github.com/molstar/molstar/tree/master/src/examples' target='_blank' rel='noreferrer'>here</a>.
                        </p>
                    </div>

                    <div className='tooltip'>
                        <a href='https://molstar.org/demos/ihm-restraints/' target='_blank' rel='noreferrer'><img alt='I/HM Restraints' src='img/ihm-restraints.png' /></a>
                        <p className='tooltip-info'>
                            <b>I/HM Restraints:</b> Visualize structural restraints for integrated hybrid models (I/HM). The source code can be found <a
                                href='https://github.com/molstar/molstar/tree/master/src/examples' target='_blank' rel='noreferrer'>here</a>.
                        </p>
                    </div>
                </div>
            </div>

            <div className='row' style={{ textAlign: 'center', marginTop: 20, paddingTop: 20 }}>
                <div className='twelve columns'>
                    <h5 className='hero-heading' style={{ marginBottom: 0 }}><b>Examples</b></h5>
                </div>
            </div>

        </div>

        <ExamplesUI />

        <div className='container'>
            <div style={{ fontSize: '0.95rem', margin: '10px auto 20px auto', color: '#555', textAlign: 'center' }}>
                The examples show molecular scenes described using the <a href='https://pypi.org/project/molviewspec/' target='_blank' rel='noreferrer'>MolViewSpec Python package</a>.<br />
                WebGL2 support is required to view the interactive examples. The examples were tested in Firefox, Chrome & Safari on PC, Linux and MacOS/iOS.
            </div>

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


            <div className='row' style={{ textAlign: 'right', color: '#999', marginTop: 20, marginBottom: 20, fontSize: '0.9rem' }}>
                Copyright © 2023–now, MolViewSpec Contributors | <a href='/mol-view-spec/terms-of-use.html' style={{ color: '#999' }}>Terms of Use &
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
    </>
}
