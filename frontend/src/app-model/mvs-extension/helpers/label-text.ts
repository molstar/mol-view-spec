/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Sphere3D } from 'molstar/lib/mol-math/geometry';
import { BoundaryHelper } from 'molstar/lib/mol-math/geometry/boundary-helper';
import { Vec3 } from 'molstar/lib/mol-math/linear-algebra';
import { ElementIndex, Model, Structure, StructureElement, StructureProperties } from 'molstar/lib/mol-model/structure';
import { UUID } from 'molstar/lib/mol-util';

import { AtomRanges, selectAtomsInRanges } from './atom-ranges';
import { getIndicesAndSortings } from './indexing';
import { AnnotationRow } from './schemas';
import { getAtomRangesForRows } from './selections';
import { extend } from './utils';


interface TextProps {
    center: Vec3,
    radius: number,
    scale: number,
    group: number,
}

const tmpVec = Vec3();
const tmpArray: number[] = [];
const boundaryHelper = new BoundaryHelper('98');
const outAtoms: ElementIndex[] = [];
const outFirstAtomIndex: { value?: number } = {};

export function textPropsForSelection(structure: Structure, sizeFunction: (location: StructureElement.Location) => number, rows: AnnotationRow | AnnotationRow[], onlyInModel?: Model): TextProps | undefined {
    const loc = StructureElement.Location.create(structure);
    const { units } = structure;
    const { type_symbol } = StructureProperties.atom;
    tmpArray.length = 0;
    let includedAtoms = 0;
    let includedHeavyAtoms = 0;
    let group: number | undefined = undefined;
    let atomSize: number | undefined = undefined;
    const rangesByModel: { [modelId: UUID]: AtomRanges } = {};
    for (let iUnit = 0, nUnits = units.length; iUnit < nUnits; iUnit++) {
        const unit = units[iUnit];
        if (onlyInModel && unit.model.id !== onlyInModel.id) continue;
        const ranges = rangesByModel[unit.model.id] ??= getAtomRangesForRows(unit.model, rows, getIndicesAndSortings(unit.model));
        const position = unit.conformation.position;
        loc.unit = unit;
        selectAtomsInRanges(unit.elements, ranges, outAtoms, outFirstAtomIndex);
        for (const atom of outAtoms) {
            loc.element = atom;
            position(atom, tmpVec);
            extend(tmpArray, tmpVec);
            group ??= structure.serialMapping.cumulativeUnitElementCount[iUnit] + outFirstAtomIndex.value!;
            atomSize ??= sizeFunction(loc);
            includedAtoms++;
            if (type_symbol(loc) !== 'H') includedHeavyAtoms++;
        }
    }
    if (includedAtoms > 0) {
        const { center, radius } = (includedAtoms > 1) ? boundarySphere(tmpArray) : { center: Vec3.fromArray(Vec3(), tmpArray, 0), radius: 1.1 * atomSize! };
        const scale = (includedHeavyAtoms || includedAtoms) ** (1 / 3);
        return { center, radius, scale, group: group! };
    }
}

/** Calculate the boundary sphere for a set of points given by their flattened coordinates (`flatCoords.slice(0,3)` is the first point etc.) */
function boundarySphere(flatCoords: readonly number[]): Sphere3D {
    const length = flatCoords.length;
    boundaryHelper.reset();
    for (let offset = 0; offset < length; offset += 3) {
        Vec3.fromArray(tmpVec, flatCoords, offset);
        boundaryHelper.includePosition(tmpVec);
    }
    boundaryHelper.finishedIncludeStep();
    for (let offset = 0; offset < length; offset += 3) {
        Vec3.fromArray(tmpVec, flatCoords, offset);
        boundaryHelper.radiusPosition(tmpVec);
    }
    return boundaryHelper.getSphere();
}
// This doesn't really compute the boundary sphere, but is much faster (400->15ms for 3j3q)
function boundarySphereApproximation(flatCoords: readonly number[]): Sphere3D {
    let x = 0.0, y = 0.0, z = 0.0;
    let cumX = 0, cumY = 0, cumZ = 0;

    const length = flatCoords.length;
    const nPoints = Math.floor(length / 3);
    if (nPoints < 0) return { center: Vec3.zero(), radius: 0 };
    for (let offset = 0; offset < length; offset += 3) {
        cumX += flatCoords[offset];
        cumY += flatCoords[offset + 1];
        cumZ += flatCoords[offset + 2];
    }
    cumX /= nPoints;
    cumY /= nPoints;
    cumZ /= nPoints;
    let maxSqDist = 0;
    for (let offset = 0; offset < length; offset += 3) {
        x = flatCoords[offset];
        y = flatCoords[offset + 1];
        z = flatCoords[offset + 2];
        const sqDist = (x - cumX) ** 2 + (y - cumY) ** 2 + (z - cumZ) ** 2;
        if (sqDist > maxSqDist) maxSqDist = sqDist;
    }
    return { center: Vec3.create(cumX, cumY, cumZ), radius: maxSqDist ** 0.5 };
}
