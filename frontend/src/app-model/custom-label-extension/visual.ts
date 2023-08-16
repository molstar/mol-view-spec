/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
// import { VisualUpdateState } from '../../../mol-repr/util';
// import { VisualContext } from '../../../mol-repr/visual';
import { Structure, StructureElement, StructureProperties } from 'molstar/lib/mol-model/structure';
// import { Theme } from '../../../mol-theme/theme';
import { Text } from 'molstar/lib/mol-geo/geometry/text/text';
import { TextBuilder } from 'molstar/lib/mol-geo/geometry/text/text-builder';
// import { ComplexTextVisual, ComplexTextParams, ComplexVisual } from '../complex-visual';
import { ElementIterator, getSerialElementLoci, eachSerialElement } from 'molstar/lib/mol-repr/structure/visual/util/element';
// import { ColorNames } from '../../../mol-util/color/names';
// import { Vec3 } from '../../../mol-math/linear-algebra';
import { BoundaryHelper } from 'molstar/lib/mol-math/geometry/boundary-helper';
import * as Original from 'molstar/lib/mol-repr/structure/visual/label-text';
import { ComplexTextVisual, ComplexVisual } from 'molstar/lib/mol-repr/structure/complex-visual';
import { VisualContext } from 'molstar/lib/mol-repr/visual';
import { Theme } from 'molstar/lib/mol-theme/theme';
import { VisualUpdateState } from 'molstar/lib/mol-repr/util';
import { Vec3 } from 'molstar/lib/mol-math/linear-algebra';
import { omitObjectKeys } from '../utils';
import { deepEqual } from 'molstar/lib/mol-util';
import { ColorNames } from 'molstar/lib/mol-util/color/names';


export const CustomLabelTextParams = {
    ...omitObjectKeys(Original.LabelTextParams, ['level', 'chainScale', 'residueScale', 'elementScale']),
    borderColor: { ...Original.LabelTextParams.borderColor, defaultValue: ColorNames.black }, // TODO probably remove this (what if black background)
    items: PD.ObjectList(
        {
            elTexto: PD.Text('¯\\_(ツ)_/¯'),
            x: PD.Numeric(0),
            y: PD.Numeric(0),
            z: PD.Numeric(0),
            scale: PD.Numeric(1, { min: 0, max: 20, step: 0.1 }),
        },
        obj => obj.elTexto,
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
            // state.createGeometry = newProps.elTexto !== currentProps.elTexto;
            // state.createGeometry ||= newProps.x !== currentProps.x;
            // state.createGeometry ||= newProps.y !== currentProps.y;
            // state.createGeometry ||= newProps.z !== currentProps.z;
        }
    }, materialId);
}

function createLabelText(ctx: VisualContext, structure: Structure, theme: Theme, props: CustomLabelTextProps, text?: Text): Text {
    // return createChainText(ctx, structure, theme, props, text);
    // return createResidueText(ctx, structure, theme, props, text);
    // return createElementText(ctx, structure, theme, props, text);
    return createSingleText(ctx, structure, theme, props, text);
}

//

const tmpVec = Vec3();
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

function createSingleText(ctx: VisualContext, structure: Structure, theme: Theme, props: CustomLabelTextProps, text?: Text): Text {
    const l = StructureElement.Location.create(structure);
    const { units, serialMapping } = structure;
    const { label_atom_id, label_alt_id } = StructureProperties.atom;
    const { cumulativeUnitElementCount } = serialMapping;

    const sizeTheme = theme.size;

    const count = props.items.length;
    const builder = TextBuilder.create(props, count, count / 2, text);
    for (const item of props.items) {
        Vec3.set(tmpVec, item.x, item.y, item.z);
        builder.add(item.elTexto, tmpVec[0], tmpVec[1], tmpVec[2], sizeTheme.size(l), item.scale, 0);
    }

    return builder.getText();
}