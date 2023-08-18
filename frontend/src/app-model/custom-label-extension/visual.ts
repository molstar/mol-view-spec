/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
// import { VisualUpdateState } from '../../../mol-repr/util';
// import { VisualContext } from '../../../mol-repr/visual';
import { Model, Structure, StructureElement, StructureProperties } from 'molstar/lib/mol-model/structure';
// import { Theme } from '../../../mol-theme/theme';
import { Text } from 'molstar/lib/mol-geo/geometry/text/text';
import { TextBuilder } from 'molstar/lib/mol-geo/geometry/text/text-builder';
// import { ComplexTextVisual, ComplexTextParams, ComplexVisual } from '../complex-visual';
import { ElementIterator, eachSerialElement, getSerialElementLoci } from 'molstar/lib/mol-repr/structure/visual/util/element';
// import { ColorNames } from '../../../mol-util/color/names';
// import { Vec3 } from '../../../mol-math/linear-algebra';
import { Sphere3D } from 'molstar/lib/mol-math/geometry';
import { BoundaryHelper } from 'molstar/lib/mol-math/geometry/boundary-helper';
import { Vec3 } from 'molstar/lib/mol-math/linear-algebra';
import { ComplexTextVisual, ComplexVisual } from 'molstar/lib/mol-repr/structure/complex-visual';
import * as Original from 'molstar/lib/mol-repr/structure/visual/label-text';
import { VisualUpdateState } from 'molstar/lib/mol-repr/util';
import { VisualContext } from 'molstar/lib/mol-repr/visual';
import { Theme } from 'molstar/lib/mol-theme/theme';
import { UUID, deepEqual } from 'molstar/lib/mol-util';
import { ColorNames } from 'molstar/lib/mol-util/color/names';
import { AtomRanges, rangesMap } from '../cif-color-extension/helpers/atom-ranges';
import { IndicesAndSortings, createIndicesAndSortings } from '../cif-color-extension/helpers/indexing';
import { atomQualifies, getAtomRangesForRow } from '../cif-color-extension/helpers/selections';
import { extend, omitObjectKeys } from '../utils';
import { SortedArray } from 'molstar/lib/mol-data/int';
import { AnnotationRow } from '../cif-color-extension/schemas';


export const CustomLabelTextParams = {
    ...omitObjectKeys(Original.LabelTextParams, ['level', 'chainScale', 'residueScale', 'elementScale']),
    borderColor: { ...Original.LabelTextParams.borderColor, defaultValue: ColorNames.black }, // TODO probably remove this (what if black background)
    items: PD.ObjectList(
        {
            text: PD.Text('¯\\_(ツ)_/¯'),
            position: PD.MappedStatic('selection', {
                x_y_z: PD.Group({
                    x: PD.Numeric(0),
                    y: PD.Numeric(0),
                    z: PD.Numeric(0),
                    scale: PD.Numeric(1, { min: 0, max: 20, step: 0.1 })
                }),
                selection: PD.Group({
                    label_entity_id: PD_MaybeString(),
                    label_asym_id: PD_MaybeString(),
                    auth_asym_id: PD_MaybeString(),

                    label_seq_id: PD_MaybeInteger(),
                    auth_seq_id: PD_MaybeInteger(),
                    pdbx_PDB_ins_code: PD_MaybeString(),
                    /** Minimum label_seq_id (inclusive) */
                    beg_label_seq_id: PD_MaybeInteger(undefined, { description: 'Minimum label_seq_id (inclusive)' }),
                    /** Maximum label_seq_id (inclusive) */
                    end_label_seq_id: PD_MaybeInteger(),
                    /** Minimum auth_seq_id (inclusive) */
                    beg_auth_seq_id: PD_MaybeInteger(),
                    /** Maximum auth_seq_id (inclusive) */
                    end_auth_seq_id: PD_MaybeInteger(),

                    /** Atom name like 'CA', 'N', 'O'... */
                    label_atom_id: PD_MaybeString(),
                    /** Atom name like 'CA', 'N', 'O'... */
                    auth_atom_id: PD_MaybeString(),
                    /** Element symbol like 'H', 'HE', 'LI', 'BE'... */
                    type_symbol: PD_MaybeString(),
                    /** Unique atom identifier across conformations (_atom_site.id) */
                    atom_id: PD_MaybeInteger(),
                    /** 0-base index of the atom in the source data */
                    atom_index: PD_MaybeInteger(),

                }),
            }),
        },
        obj => obj.text,
        { isEssential: true }
    ),
    // ...ComplexTextParams,
    // background: PD.Boolean(false),
    // backgroundMargin: PD.Numeric(0, { min: 0, max: 1, step: 0.01 }),
    // backgroundColor: PD.Color(ColorNames.black),
    // backgroundOpacity: PD.Numeric(0.5, { min: 0, max: 1, step: 0.01 }),
    // borderWidth: PD.Numeric(0.25, { min: 0, max: 0.5, step: 0.01 }),
    // level: PD.Select('residue', [['chain', 'Chain'], ['residue', 'Residue'], ['element', 'Element']] as const, { isEssential: true }),
    // chainScale: PD.Numeric(10, { min: 0, max: 20, step: 0.1 }),
    // residueScale: PD.Numeric(1, { min: 0, max: 20, step: 0.1 }),
    // elementScale: PD.Numeric(0.5, { min: 0, max: 20, step: 0.1 }),
};
// export const CustomLabelTextParams = Original.LabelTextParams;

export type CustomLabelTextParams = typeof CustomLabelTextParams
export type CustomLabelTextProps = PD.Values<CustomLabelTextParams>
// export type CustomLabelLevels = CustomLabelTextProps['level']

export function CustomLabelTextVisual(materialId: number): ComplexVisual<CustomLabelTextParams> {
    return ComplexTextVisual<CustomLabelTextParams>({
        defaultProps: PD.getDefaultValues(CustomLabelTextParams),
        createGeometry: createLabelText,
        createLocationIterator: ElementIterator.fromStructure,
        getLoci: getSerialElementLoci,
        eachLocation: eachSerialElement,
        setUpdateState: (state: VisualUpdateState, newProps: PD.Values<CustomLabelTextParams>, currentProps: PD.Values<CustomLabelTextParams>) => {
            state.createGeometry = !deepEqual(newProps.items, currentProps.items);
            // state.createGeometry = newProps.text !== currentProps.text;
            // state.createGeometry ||= newProps.x !== currentProps.x;
            // state.createGeometry ||= newProps.y !== currentProps.y;
            // state.createGeometry ||= newProps.z !== currentProps.z;
        }
    }, materialId);
}

function createLabelText(ctx: VisualContext, structure: Structure, theme: Theme, props: CustomLabelTextProps, text?: Text): Text {
    console.time('createLabelText');
    // const result =  createChainText(ctx, structure, theme, props, text);
    // const result =  createResidueText(ctx, structure, theme, props, text);
    // const result =  createElementText(ctx, structure, theme, props, text);
    const result = createSingleText(ctx, structure, theme, props, text);
    console.timeEnd('createLabelText');
    return result;
}


const tmpVec = Vec3();
const tmpArray: number[] = [];
const boundaryHelper = new BoundaryHelper('98');

function createChainText(ctx: VisualContext, structure: Structure, theme: Theme, props: CustomLabelTextProps, text?: Text): Text {
    const l = StructureElement.Location.create(structure);
    const { units, serialMapping } = structure;
    const { auth_asym_id, label_asym_id } = StructureProperties.chain;
    const { cumulativeUnitElementCount } = serialMapping;

    const count = units.length;
    const chainScale = 10;
    const builder = TextBuilder.create(props, count, count / 2, text);

    for (let i = 0, il = units.length; i < il; ++i) {
        const unit = units[i];
        l.unit = unit;
        l.element = unit.elements[0];
        const { center, radius } = unit.lookup3d.boundary.sphere;
        Vec3.transformMat4(tmpVec, center, unit.conformation.operator.matrix);
        const authId = auth_asym_id(l);
        const labelId = label_asym_id(l);
        const text = authId === labelId ? labelId : `${labelId} [${authId}]`;
        builder.add(text, tmpVec[0], tmpVec[1], tmpVec[2], radius, chainScale, cumulativeUnitElementCount[i]);
    }

    return builder.getText();
}

function createResidueText(ctx: VisualContext, structure: Structure, theme: Theme, props: CustomLabelTextProps, text?: Text): Text {
    const l = StructureElement.Location.create(structure);
    const { units, serialMapping } = structure;
    const { label_comp_id } = StructureProperties.atom;
    const { auth_seq_id } = StructureProperties.residue;
    const { cumulativeUnitElementCount } = serialMapping;

    const count = structure.polymerResidueCount * 2;
    const residueScale = 1;
    const builder = TextBuilder.create(props, count, count / 2, text);

    for (let i = 0, il = units.length; i < il; ++i) {
        const unit = units[i];
        const pos = unit.conformation.position;
        const { elements } = unit;
        l.unit = unit;
        l.element = unit.elements[0];

        const residueIndex = unit.model.atomicHierarchy.residueAtomSegments.index;
        const groupOffset = cumulativeUnitElementCount[i];

        let j = 0;
        const jl = elements.length;
        while (j < jl) {
            const start = j, rI = residueIndex[elements[j]];
            j++;
            while (j < jl && residueIndex[elements[j]] === rI) j++;

            boundaryHelper.reset();
            for (let eI = start; eI < j; eI++) {
                pos(elements[eI], tmpVec);
                boundaryHelper.includePosition(tmpVec);
            }
            boundaryHelper.finishedIncludeStep();
            for (let eI = start; eI < j; eI++) {
                pos(elements[eI], tmpVec);
                boundaryHelper.radiusPosition(tmpVec);
            }

            l.element = elements[start];

            const { center, radius } = boundaryHelper.getSphere();
            const authSeqId = auth_seq_id(l);
            const compId = label_comp_id(l);

            const text = `${compId} ${authSeqId}`;
            builder.add(text, center[0], center[1], center[2], radius, residueScale, groupOffset + start);
        }
    }

    return builder.getText();
}

function createElementText(ctx: VisualContext, structure: Structure, theme: Theme, props: CustomLabelTextProps, text?: Text): Text {
    const l = StructureElement.Location.create(structure);
    const { units, serialMapping } = structure;
    const { label_atom_id, label_alt_id } = StructureProperties.atom;
    const { cumulativeUnitElementCount } = serialMapping;

    const sizeTheme = theme.size;

    const count = structure.elementCount;
    const elementScale = 0.5;
    const builder = TextBuilder.create(props, count, count / 2, text);

    for (let i = 0, il = units.length; i < il; ++i) {
        const unit = units[i];
        const pos = unit.conformation.position;
        const { elements } = unit;
        l.unit = unit;

        const groupOffset = cumulativeUnitElementCount[i];

        for (let j = 0, _j = elements.length; j < _j; j++) {
            l.element = elements[j];
            pos(l.element, tmpVec);
            const atomId = label_atom_id(l);
            const altId = label_alt_id(l);
            const text = altId ? `${atomId}%${altId}` : atomId;
            builder.add(text, tmpVec[0], tmpVec[1], tmpVec[2], sizeTheme.size(l), elementScale, groupOffset + j);
        }
    }

    return builder.getText();
}

// TODO find a smart place to store these
const modelIndices: { [id: UUID]: IndicesAndSortings } = {};
function getModelIndices(model: Model): IndicesAndSortings {
    return modelIndices[model.id] ??= createIndicesAndSortings(model);
}

function createSingleText(ctx: VisualContext, structure: Structure, theme: Theme, props: CustomLabelTextProps, text?: Text): Text {
    const count = props.items.length;
    const builder = TextBuilder.create(props, count, count / 2, text);
    for (const item of props.items) {
        let scale: number;
        switch (item.position.name) {
            case 'x_y_z':
                Vec3.set(tmpVec, item.position.params.x, item.position.params.y, item.position.params.z);
                scale = item.position.params.scale;
                builder.add(item.text, tmpVec[0], tmpVec[1], tmpVec[2], scale, scale, 0);
                break;
            case 'selection':
                console.time('addLabelItem');
                const p = textPropsForSelection(structure, theme, item.position.params);
                if (p) builder.add(item.text, p.center[0], p.center[1], p.center[2], p.radius, p.scale, p.group);
                console.timeEnd('addLabelItem');
                break;
        }
    }

    return builder.getText();
}

interface TextPosition {
    center: Vec3,
    radius: number,
    scale: number,
    group: number,
}
function textPropsForSelection(structure: Structure, theme: Theme, row: AnnotationRow): TextPosition | undefined {
    const loc = StructureElement.Location.create(structure);
    const { units } = structure;
    const { type_symbol } = StructureProperties.atom;
    tmpArray.length = 0;
    let includedAtoms = 0;
    let includedHeavyAtoms = 0;
    let group: number | undefined = undefined;
    let atomSize: number | undefined = undefined;
    const rangesByModel: { [modelId: UUID]: AtomRanges } = {};
    // {
    //     // Just a debugging block for timing, TODO remove
    //     console.time('get ranges');
    //     for (let iUnit = 0, nUnits = units.length; iUnit < nUnits; iUnit++) {
    //         const unit = units[iUnit];
    //         rangesByModel[unit.model.id] ??= getAtomRangesForRow(unit.model, row, getModelIndices(unit.model));
    //     }
    //     console.timeEnd('get ranges');
    // }
    // console.time('select atoms');
    for (let iUnit = 0, nUnits = units.length; iUnit < nUnits; iUnit++) {
        const unit = units[iUnit];
        const ranges = rangesByModel[unit.model.id] ??= getAtomRangesForRow(unit.model, row, getModelIndices(unit.model));
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
                atomSize ??= theme.size.size(loc);
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


/** The magic with negative zero looks crazy, but it's needed if we want to be able to write negative numbers, LOL. Please help if you know a better solution. */
function parseMaybeInt(input: string): number | undefined {
    if (input.trim() === '-') return -0;
    const num = parseInt(input);
    return isNaN(num) ? undefined : num;
}
function stringifyMaybeInt(num: number | undefined): string {
    if (num === undefined) return '';
    if (Object.is(num, -0)) return '-';
    return num.toString();
}
function PD_MaybeInteger(defaultValue?: number, info?: PD.Info): PD.Base<number | undefined> {
    return PD.Converted<number | undefined, PD.Text>(stringifyMaybeInt, parseMaybeInt, PD.Text(stringifyMaybeInt(defaultValue), info));
}

function parseMaybeString(input: string): string | undefined {
    return input === '' ? undefined : input;
}
function stringifyMaybeString(str: string | undefined): string {
    return str === undefined ? '' : str;
}
function PD_MaybeString(defaultValue?: string, info?: PD.Info): PD.Base<string | undefined> {
    return PD.Converted<string | undefined, PD.Text>(stringifyMaybeString, parseMaybeString, PD.Text(stringifyMaybeString(defaultValue), info));
}
