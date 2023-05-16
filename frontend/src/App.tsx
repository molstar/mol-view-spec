import React, { useEffect, useRef } from 'react';

import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import { Button, Typography } from '@mui/material';

import './App.css';
import { AppModel } from './app-model/app-model';


export default App;

function App() {
    return (
        <div className='App'>
            <Main />
        </div>
    );
}

const PanelWidth = '20%';

function Main() {
    const modelRef = useRef<AppModel>();
    const model = modelRef.current ??= new AppModel();

    return (
        <div className='Main'>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: PanelWidth }}>
                <Viewer model={model} />
            </div>
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: PanelWidth }}>
                <div style={{ display: 'flex', flexDirection: 'column', margin: 10 }}>
                    <Typography variant='h5' style={{ marginBottom: 10 }}>mol-view-spec</Typography>
                    <Button variant='outlined' onClick={() => model.foo()}>Foo</Button>
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

    return <div ref={target}></div>
}

