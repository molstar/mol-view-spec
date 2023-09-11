import React, { useEffect, useRef } from 'react';
import { Button, Typography, Link } from '@mui/material';

import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import { useBehavior } from 'molstar/lib/mol-plugin-ui/hooks/use-behavior';

import './App.css';
import { AppModel } from './app-model/app-model';


export function App() {
    return (
        <div className='App'>
            <Main />
        </div>
    );
}

const PanelWidth = '30%';

function Main() {
    const modelRef = useRef<AppModel>();
    const model = modelRef.current ??= new AppModel();
    const status = useBehavior(model.status);
    const loadedUrl = useBehavior(model.url);
    const loadedTree = useBehavior(model.tree);

    const exampleUrls = {
        load: 'http://localhost:9000/api/v1/examples/load/1cbs',
        // label: 'http://localhost:9000/api/v1/examples/label/1cbs',
        // color: 'http://localhost:9000/api/v1/examples/color/1cbs',
        formats: 'http://localhost:9000/api/v1/examples/testing/formats',
        structures: 'http://localhost:9000/api/v1/examples/testing/structures',
        transforms: 'http://localhost:9000/api/v1/examples/testing/transforms',
        components: 'http://localhost:9000/api/v1/examples/testing/components',
        'colors-from-cif': 'http://localhost:9000/api/v1/examples/testing/color_from_cif',
        'colors rainbow': 'http://localhost:9000/api/v1/examples/testing/color_rainbow',
        'colors cif': 'http://localhost:9000/api/v1/examples/testing/color_cif',
        'colors cif multicategory': 'http://localhost:9000/api/v1/examples/testing/color_multicategory_cif',
        'colors bcif': 'http://localhost:9000/api/v1/examples/testing/color_bcif',
        'colors small': 'http://localhost:9000/api/v1/examples/testing/color_small',
        'colors domains': 'http://localhost:9000/api/v1/examples/testing/color_domains',
        'tooltips domains': 'http://localhost:9000/api/v1/examples/testing/color_domains?colors=false&tooltips=true',
        'colors+tooltips domains': 'http://localhost:9000/api/v1/examples/testing/color_domains?colors=true&tooltips=true',
        'colors validation 1tqn': 'http://localhost:9000/api/v1/examples/testing/color_validation?id=1tqn',
        'colors validation 3j3q': 'http://localhost:9000/api/v1/examples/testing/color_validation?id=3j3q',
        'labels': 'http://localhost:9000/api/v1/examples/testing/labels',
        'focus': 'http://localhost:9000/api/v1/examples/testing/focus',
        'camera': 'http://localhost:9000/api/v1/examples/testing/camera',
    };

    return (
        <div className='Main'>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: PanelWidth, zIndex: 1 }}>
                <Viewer model={model} />
            </div>

            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: PanelWidth, overflowY: 'scroll' }}>
                <div style={{ display: 'flex', flexDirection: 'column', margin: 10, gap: 5 }}>
                    <Typography variant='h5' style={{ marginBottom: 15 }}>mol-view-spec</Typography>

                    <Typography variant='body1'>Examples:</Typography>
                    {Object.entries(exampleUrls).map(([name, url]) =>
                        <Button key={name} variant={url === loadedUrl ? 'contained' : 'outlined'} onClick={() => model.loadMvsFromUrl(url)}>
                            {name}
                        </Button>
                    )}
                    <Typography variant='caption'>{status}</Typography>

                    {loadedUrl &&
                        <Typography variant='body2' style={{ wordWrap: 'break-word', marginTop: 10 }}>
                            <b>Loaded URL:</b><br />
                            <Link href={loadedUrl} target='_blank'>{loadedUrl}</Link>
                        </Typography>
                    }

                    {loadedTree && <>
                        <Typography variant='body2' style={{ wordWrap: 'break-word', marginTop: 10 }}>
                            <b>Loaded tree:</b>
                        </Typography>
                        <div style={{ maxHeight: 400, overflow: 'auto', textAlign: 'left', backgroundColor: '#eee' }}>
                            <pre style={{ margin: 5 }}>{loadedTree}</pre>
                        </div>
                    </>}
                </div>
                <div>
                    <Button onClick={() => model.printCamera()}>Print camera</Button>
                </div>
            </div>
        </div>
    );
}

function Viewer({ model }: { model: AppModel }) {
    const target = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (target.current) {
            model.initPlugin(target.current);
        }
    }, [model]);

    return <div ref={target}></div>;
}

