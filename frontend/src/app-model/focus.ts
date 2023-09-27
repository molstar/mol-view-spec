/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Camera } from 'molstar/lib/mol-canvas3d/camera';
import { GraphicsRenderObject } from 'molstar/lib/mol-gl/render-object';
import { Sphere3D } from 'molstar/lib/mol-math/geometry';
import { BoundaryHelper } from 'molstar/lib/mol-math/geometry/boundary-helper';
import { Vec3 } from 'molstar/lib/mol-math/linear-algebra';
import { Loci } from 'molstar/lib/mol-model/loci';
import { Structure } from 'molstar/lib/mol-model/structure';
import { PluginStateObject } from 'molstar/lib/mol-plugin-state/objects';
import { PluginCommands } from 'molstar/lib/mol-plugin/commands';
import { PluginContext } from 'molstar/lib/mol-plugin/context';
import { StateObjectSelector } from 'molstar/lib/mol-state';

import { Defaults } from './param-defaults';
import { ParamsOfKind } from './tree/generic';
import { MolstarTree } from './tree/molstar-nodes';


/** Defined in `molstar/lib/mol-plugin-state/manager/camera.ts` but private */
const DefaultCameraFocusOptions = {
    minRadius: 5,
    extraRadiusForFocus: 4,
    extraRadiusForZoomAll: 0,
};

export async function focusCameraNode(plugin: PluginContext, params: ParamsOfKind<MolstarTree, 'camera'>) {
    const target = Vec3.create(...params.target);
    const position = Vec3.create(...params.position);
    const up = Vec3.create(...params.up ?? Defaults.camera.up);
    const snapshot: Partial<Camera.Snapshot> = { target, position, up };
    await PluginCommands.Camera.SetSnapshot(plugin, { snapshot });
}

export async function focusStructureNode(plugin: PluginContext, structureNodeSelector: StateObjectSelector | undefined, params: ParamsOfKind<MolstarTree, 'focus'> = {}) {
    let structure: Structure | undefined = undefined;
    if (structureNodeSelector) {
        const cell = plugin.state.data.cells.get(structureNodeSelector.ref);
        structure = cell?.obj?.data;
        if (!structure) console.warn('Focus: no structure');
        if (!(structure instanceof Structure)) {
            console.warn('Focus: cannot apply to a non-structure node');
            structure = undefined;
        }
    }
    const boundingSphere = structure ? Loci.getBoundingSphere(Structure.Loci(structure)) : getPluginBoundingSphere(plugin);
    if (boundingSphere && plugin.canvas3d) {
        // cannot use plugin.canvas3d.camera.getFocus with up+direction, because it sometimes flips orientation
        // await PluginCommands.Camera.Focus(plugin, { center: boundingSphere.center, radius: boundingSphere.radius }); // this could not set orientation
        const target = boundingSphere.center;
        const extraRadius = structure ? DefaultCameraFocusOptions.extraRadiusForFocus : DefaultCameraFocusOptions.extraRadiusForZoomAll;
        const sphereRadius = Math.max(boundingSphere.radius + extraRadius, DefaultCameraFocusOptions.minRadius);
        const distance = getFocusDistance(plugin.canvas3d.camera, boundingSphere.center, sphereRadius) ?? 100;
        const direction = Vec3.create(...params.direction ?? Defaults.focus.direction);
        Vec3.setMagnitude(direction, direction, distance);
        const position = Vec3.sub(Vec3(), target, direction);
        const up = Vec3.create(...params.up ?? Defaults.focus.up);
        const snapshot: Partial<Camera.Snapshot> = { target, position, up, radius: sphereRadius };
        await PluginCommands.Camera.SetSnapshot(plugin, { snapshot });
    }
}

function getFocusDistance(camera: Camera, center: Vec3, radius: number) {
    const p = camera.getFocus(center, radius);
    if (!p.position || !p.target) return undefined;
    return Vec3.distance(p.position, p.target);
}

function getPluginBoundingSphere(plugin: PluginContext) {
    const renderObjects = getRenderObjects(plugin, false);
    const spheres = renderObjects.map(r => r.values.boundingSphere.ref.value).filter(sphere => sphere.radius > 0);
    return boundingSphereOfSpheres(spheres);
}

function getRenderObjects(plugin: PluginContext, includeHidden: boolean): GraphicsRenderObject[] {
    let reprCells = Array.from(plugin.state.data.cells.values()).filter(cell => cell.obj && PluginStateObject.isRepresentation3D(cell.obj));
    if (!includeHidden) reprCells = reprCells.filter(cell => !cell.state.isHidden);
    const renderables = reprCells.flatMap(cell => cell.obj!.data.repr.renderObjects);
    return renderables;
}

let boundaryHelper: BoundaryHelper | undefined = undefined;

function boundingSphereOfSpheres(spheres: Sphere3D[]): Sphere3D {
    boundaryHelper ??= new BoundaryHelper('98');
    boundaryHelper.reset();
    for (const s of spheres) boundaryHelper.includeSphere(s);
    boundaryHelper.finishedIncludeStep();
    for (const s of spheres) boundaryHelper.radiusSphere(s);
    return boundaryHelper.getSphere();
}
