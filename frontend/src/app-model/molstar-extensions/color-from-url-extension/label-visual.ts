/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Text } from 'molstar/lib/mol-geo/geometry/text/text';
import { TextBuilder } from 'molstar/lib/mol-geo/geometry/text/text-builder';
import { Structure } from 'molstar/lib/mol-model/structure';
import { ComplexTextVisual, ComplexVisual } from 'molstar/lib/mol-repr/structure/complex-visual';
import * as Original from 'molstar/lib/mol-repr/structure/visual/label-text';
import { ElementIterator, eachSerialElement, getSerialElementLoci } from 'molstar/lib/mol-repr/structure/visual/util/element';
import { VisualUpdateState } from 'molstar/lib/mol-repr/util';
import { VisualContext } from 'molstar/lib/mol-repr/visual';
import { Theme } from 'molstar/lib/mol-theme/theme';
import { ColorNames } from 'molstar/lib/mol-util/color/names';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';

import { omitObjectKeys } from '../../utils';
import { getModelIndices, textPropsForSelection } from '../helpers/label-text';
import { getAnnotationForStructure, groupRows } from './prop';
import { getAtomRangesForRow, getAtomRangesForRows } from '../helpers/selections';


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

function createLabelText(ctx: VisualContext, structure: Structure, theme: Theme, props: AnnotationLabelTextProps, text?: Text): Text {
    const { annotation } = getAnnotationForStructure(structure, props.annotationId);
    console.time('label getRows');
    const rows = annotation?.getRows() ?? [];
    console.timeEnd('label getRows');
    console.time('label groupRows');
    const { count, offsets, grouped } = groupRows(rows);
    console.timeEnd('label groupRows');
    console.log('annotation:', annotation, 'rows:', rows.length, 'groups:', count);
    const builder = TextBuilder.create(props, count, count / 2, text);
    console.time('label iterate');
    for (let iGroup = 0; iGroup < count; iGroup++) {
        // console.log('Group', iGroup);
        const iFirstRowInGroup = grouped[offsets[iGroup]];
        const labelText = annotation!.getValueForRow(iFirstRowInGroup, props.fieldName);
        if (!labelText) continue;
        const rowsInGroup = grouped.slice(offsets[iGroup], offsets[iGroup + 1]).map(j => rows[j]);
        // getAtomRangesForRows(structure.model, rowsInGroup, getModelIndices(structure.model));
        const p = textPropsForSelection(structure, theme.size.size, rowsInGroup);
        if (!p) continue;
        builder.add(labelText, p.center[0], p.center[1], p.center[2], p.radius, p.scale, p.group);
    }
    console.timeEnd('label iterate');
    return builder.getText();
}
