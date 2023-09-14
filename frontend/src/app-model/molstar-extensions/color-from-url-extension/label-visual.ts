/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Text } from 'molstar/lib/mol-geo/geometry/text/text';
import { TextBuilder } from 'molstar/lib/mol-geo/geometry/text/text-builder';
import { Vec3 } from 'molstar/lib/mol-math/linear-algebra';
import { Structure } from 'molstar/lib/mol-model/structure';
import { ComplexTextVisual, ComplexVisual } from 'molstar/lib/mol-repr/structure/complex-visual';
import * as Original from 'molstar/lib/mol-repr/structure/visual/label-text';
import { ElementIterator, eachSerialElement, getSerialElementLoci } from 'molstar/lib/mol-repr/structure/visual/util/element';
import { VisualUpdateState } from 'molstar/lib/mol-repr/util';
import { VisualContext } from 'molstar/lib/mol-repr/visual';
import { Theme } from 'molstar/lib/mol-theme/theme';
import { deepEqual } from 'molstar/lib/mol-util';
import { ColorNames } from 'molstar/lib/mol-util/color/names';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';

import { omitObjectKeys } from '../../utils';
import { textPropsForSelection } from '../helpers/label-text';
import { PD_MaybeInteger, PD_MaybeString } from '../helpers/param-definition';
import { getAnnotationForStructure } from './prop';


export const AnnotationLabelTextParams = {
    annotationId: PD.Text('', { description: 'Reference to "Annotation" custom model property', isEssential: true }),
    fieldName: PD.Text('label', { description: 'Annotation field (column) from which to take label contents', isEssential: true }),
    ...omitObjectKeys(Original.LabelTextParams, ['level', 'chainScale', 'residueScale', 'elementScale']),
    borderColor: { ...Original.LabelTextParams.borderColor, defaultValue: ColorNames.black }, // TODO probably remove this (what if black background)
};

export type AnnotationLabelTextParams = typeof AnnotationLabelTextParams
export type AnnotationLabelTextProps = PD.Values<AnnotationLabelTextParams>

export function AnnotationLabelTextVisual(materialId: number): ComplexVisual<AnnotationLabelTextParams> {
    return ComplexTextVisual<AnnotationLabelTextParams>({
        defaultProps: PD.getDefaultValues(AnnotationLabelTextParams),
        createGeometry: createLabelText,
        createLocationIterator: ElementIterator.fromStructure,
        getLoci: getSerialElementLoci,
        eachLocation: eachSerialElement,
        setUpdateState: (state: VisualUpdateState, newProps: PD.Values<AnnotationLabelTextParams>, currentProps: PD.Values<AnnotationLabelTextParams>) => {
            state.createGeometry = newProps.annotationId !== currentProps.annotationId || newProps.fieldName !== currentProps.fieldName;
        }
    }, materialId);
}

const tmpVec = Vec3();

function createLabelText(ctx: VisualContext, structure: Structure, theme: Theme, props: AnnotationLabelTextProps, text?: Text): Text {
    const { annotation } = getAnnotationForStructure(structure, props.annotationId);
    const rows = annotation?.getRows() ?? [];
    console.log('annotation:', annotation);
    const count = rows.length;
    const builder = TextBuilder.create(props, count, count / 2, text);
    for (let i = 0; i < rows.length; i++) {
        const p = textPropsForSelection(structure, theme.size.size, rows[i]);
        if (!p) continue;
        let text = annotation?.getValueForRow(i, props.fieldName);
        if (text === undefined) continue;
        builder.add(text, p.center[0], p.center[1], p.center[2], p.radius, p.scale, p.group);
    }

    return builder.getText();
}
