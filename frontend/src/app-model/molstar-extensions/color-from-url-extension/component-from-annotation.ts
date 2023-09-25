/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Structure, StructureSelection } from 'molstar/lib/mol-model/structure';
import { StructureQueryHelper } from 'molstar/lib/mol-plugin-state/helpers/structure-query';
import { PluginStateTransform, PluginStateObject as SO } from 'molstar/lib/mol-plugin-state/objects';
import { StateObject, StateTransformer } from 'molstar/lib/mol-state';
import { deepEqual } from 'molstar/lib/mol-util';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';

import { canonicalJsonString, omitObjectKeys } from '../../utils';
import { rowsToExpression } from '../helpers/selections';
import { getAnnotationForStructure } from './prop';


export const AnnotationStructureComponentParams = {
    annotationId: PD.Text('', { description: 'Reference to "Annotation" custom model property' }),
    fieldName: PD.Text('component', { description: 'Annotation field (column) from which to take component identifier' }),
    fieldValues: PD.MappedStatic('all', {
        all: PD.EmptyGroup(),
        selected: PD.ObjectList({
            value: PD.Text(),
        }, obj => obj.value),
    }),
    nullIfEmpty: PD.Optional(PD.Boolean(true, { isHidden: false })),
    label: PD.Text('', { isHidden: false }),
};
export type AnnotationStructureComponentProps = PD.ValuesFor<typeof AnnotationStructureComponentParams>


export type AnnotationStructureComponent = typeof AnnotationStructureComponent
export const AnnotationStructureComponent = PluginStateTransform.BuiltIn({
    name: 'structure-component-from-annotation',
    display: { name: 'Annotation Component', description: 'A molecular structure component defined by annotation data.' },
    from: SO.Molecule.Structure,
    to: SO.Molecule.Structure,
    params: AnnotationStructureComponentParams,
})({
    apply({ a, params, cache }) {
        return createAnnotationStructureComponent(a.data, params, cache as any);
    },
    update: ({ a, b, oldParams, newParams, cache }) => {
        return updateAnnotationStructureComponent(a.data, b, oldParams, newParams, cache as any);
    },
    dispose({ b }) {
        b?.data.customPropertyDescriptors.dispose();
    }
});


export function createAnnotationStructureComponent(structure: Structure, params: AnnotationStructureComponentProps, cache: { source: Structure, entry?: StructureQueryHelper.CacheEntry }) {
    cache.source = structure;

    const { annotation } = getAnnotationForStructure(structure, params.annotationId);
    let component: Structure = Structure.Empty;
    if (annotation) {
        let rows = annotation.getRows();
        if (params.fieldValues.name === 'selected') {
            const selectedValues = new Set<string | undefined>(params.fieldValues.params.map(obj => obj.value));
            rows = rows.filter((row, i) => selectedValues.has(annotation.getValueForRow(i, params.fieldName)));
        }
        const expression = rowsToExpression(rows);

        const { selection, entry } = StructureQueryHelper.createAndRun(structure, expression);
        cache.entry = entry;
        component = StructureSelection.unionStructure(selection);
    }

    if (params.nullIfEmpty && component.elementCount === 0) return StateObject.Null;

    let label = params.label;
    if (label === undefined || label === '') {
        if (params.fieldValues.name === 'selected' && params.fieldValues.params.length > 0) {
            const ellipsis = params.fieldValues.params.length > 1 ? '+...' : '';
            label = `${params.fieldName}: "${params.fieldValues.params[0].value}"${ellipsis}`;
        } else {
            label = 'Component from Annotation';
        }
    }

    const props = { label, description: Structure.elementDescription(component) };
    return new SO.Molecule.Structure(component, props);
}

export function updateAnnotationStructureComponent(a: Structure, b: SO.Molecule.Structure, oldParams: AnnotationStructureComponentProps, newParams: AnnotationStructureComponentProps, cache: { source: Structure, entry?: StructureQueryHelper.CacheEntry }) {
    const change = !deepEqual(newParams, oldParams);
    const needsRecreate = !deepEqual(omitObjectKeys(newParams, ['label']), omitObjectKeys(oldParams, ['label']));
    if (!change) {
        return StateTransformer.UpdateResult.Unchanged;
    }
    if (!needsRecreate) {
        b.label = newParams.label || b.label;
        return StateTransformer.UpdateResult.Updated;
    }
    return StateTransformer.UpdateResult.Recreate;
}
