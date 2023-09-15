/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { SortedArray } from 'molstar/lib/mol-data/int';
import { Sphere3D } from 'molstar/lib/mol-math/geometry';
import { BoundaryHelper } from 'molstar/lib/mol-math/geometry/boundary-helper';
import { Vec3 } from 'molstar/lib/mol-math/linear-algebra';
import { Model, Structure, StructureElement, StructureProperties } from 'molstar/lib/mol-model/structure';
import { Theme } from 'molstar/lib/mol-theme/theme';
import { UUID } from 'molstar/lib/mol-util';

import { extend } from '../../utils';
import { AtomRanges, mergeRanges } from './atom-ranges';
import { IndicesAndSortings, createIndicesAndSortings } from './indexing';
import { AnnotationRow } from './schemas';
import { getAtomRangesForRow, getAtomRangesForRows } from './selections';


interface TextProps {
    center: Vec3,
    radius: number,
    scale: number,
    group: number,
}

const tmpVec = Vec3();
const tmpArray: number[] = [];
const boundaryHelper = new BoundaryHelper('98');

// TODO find a smart place to store these (maybe model._dynamicPropertyData? or compute once before creating all labels?)
const modelIndices: { [id: UUID]: IndicesAndSortings } = {};
function getModelIndices(model: Model): IndicesAndSortings {
    return modelIndices[model.id] ??= createIndicesAndSortings(model);
}
export function textPropsForSelection(structure: Structure, sizeFunction: (location: StructureElement.Location) => number, rows: AnnotationRow | AnnotationRow[]): TextProps | undefined {
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
        const ranges = rangesByModel[unit.model.id] ??= getAtomRangesForRows(unit.model, rows, getModelIndices(unit.model));
        const pos = unit.conformation.position;
        const { elements } = unit;
        loc.unit = unit;
        let iRange = SortedArray.findPredecessorIndex(SortedArray.ofSortedArray(ranges.to), elements[0] + 1);
        const nRanges = ranges.from.length;
        for (let iAtom = 0, nAtoms = elements.length; iAtom < nAtoms; iAtom++) {
            loc.element = elements[iAtom];
            // const qualifiesC = atomQualifies(loc.unit.model, loc.element, row);
            while (iRange < nRanges && ranges.to[iRange] <= loc.element) iRange++;
            const qualifies = iRange < nRanges && ranges.from[iRange] <= loc.element;
            // if (qualifies !== qualifiesC) throw new Error('AssertionError')
            if (qualifies) {
                pos(loc.element, tmpVec);
                extend(tmpArray, tmpVec);
                group ??= structure.serialMapping.cumulativeUnitElementCount[iUnit] + iAtom;
                atomSize ??= sizeFunction(loc);
                includedAtoms++;
                if (type_symbol(loc) !== 'H') includedHeavyAtoms++;
            };
        }
    }
    // console.timeEnd('select atoms');
    // console.log('includedAtoms:', includedAtoms)
    if (includedAtoms > 0) {
        // console.time('boundarySphere');
        const { center, radius } = (includedAtoms > 1) ? boundarySphere(tmpArray) : { center: Vec3.fromArray(Vec3(), tmpArray, 0), radius: 1.1 * atomSize! };
        // console.timeEnd('boundarySphere')
        const scale = (includedHeavyAtoms || includedAtoms) ** (1 / 3);
        if (includedAtoms === 1) console.log('radius:', radius, 'atomSize:', atomSize);
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
