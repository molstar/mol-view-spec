import { CustomProperty } from 'molstar/lib/mol-model-props/common/custom-property';
import { CustomStructureProperty } from 'molstar/lib/mol-model-props/common/custom-structure-property';
import { CustomPropertyDescriptor } from 'molstar/lib/mol-model/custom-property';
import { Loci } from 'molstar/lib/mol-model/loci';
import { Structure, StructureElement } from 'molstar/lib/mol-model/structure';
import { LociLabelProvider } from 'molstar/lib/mol-plugin-state/manager/loci-label';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';

import { AnnotationsProvider } from './prop';
import { filterDefined } from '../../utils';


/** Parameter definition for custom structure property "AnnotationTooltips" */
export const AnnotationTooltipsParams = {
    tooltips: PD.ObjectList(
        {
            annotationId: PD.Text('', { description: 'Reference to "Annotation" custom model property' }),
            fieldName: PD.Text('tooltip', { description: 'Annotation field (column) from which to take color values' }),
        },
        obj => `${obj.annotationId}:${obj.fieldName}`
    ),
};
export type AnnotationTooltipsParams = typeof AnnotationTooltipsParams

/** Values of custom structure property "AnnotationTooltips" (and for its params at the same type) */
export type AnnotationTooltipsProps = PD.Values<AnnotationTooltipsParams>


/** Provider for custom structure property "AnnotationTooltips" */
export const AnnotationTooltipsProvider: CustomStructureProperty.Provider<AnnotationTooltipsParams, AnnotationTooltipsProps> = CustomStructureProperty.createProvider({
    label: 'Annotation Tooltips',
    descriptor: CustomPropertyDescriptor<any, any>({
        name: 'annotation-tooltips',
    }),
    type: 'local',
    defaultParams: AnnotationTooltipsParams,
    getParams: (data: Structure) => AnnotationTooltipsParams,
    isApplicable: (data: Structure) => data.root === data,
    obtain: async (ctx: CustomProperty.Context, data: Structure, props: Partial<AnnotationTooltipsProps>) => {
        const fullProps = { ...PD.getDefaultValues(AnnotationTooltipsParams), ...props };
        for (const model of data.models) await AnnotationsProvider.attach(ctx, model); // TODO I should probably detach somewhere but I have nooooo idea where
        return { value: fullProps } satisfies CustomProperty.Data<AnnotationTooltipsProps>;
    },
});


/** Label provider based on data from "Annotation" custom model property */
export const AnnotationTooltipsLabelProvider = {
    label: (loci: Loci): string | undefined => {
        switch (loci.kind) {
            case 'element-loci':
                const location = StructureElement.Loci.getFirstLocation(loci);
                if (!location) return undefined;
                const tooltipProps = AnnotationTooltipsProvider.get(location.structure).value;
                if (!tooltipProps || tooltipProps.tooltips.length === 0) return undefined;
                const annotations = AnnotationsProvider.get(location.unit.model).value;
                const texts = tooltipProps.tooltips.map(p => annotations?.getAnnotation(p.annotationId)?.getValueForLocation(location, p.fieldName));
                return filterDefined(texts).join(' | ');
            default:
                return undefined;
        }
    }
} satisfies LociLabelProvider;
