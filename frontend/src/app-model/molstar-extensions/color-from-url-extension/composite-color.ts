/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Choice } from 'molstar/lib/extensions/volumes-and-segmentations/helpers';
import { SortedArray } from 'molstar/lib/mol-data/int';
import { Location } from 'molstar/lib/mol-model/location';
import { Bond, ElementIndex, Structure, StructureElement } from 'molstar/lib/mol-model/structure';
import { StaticStructureComponentTypes, createStructureComponent } from 'molstar/lib/mol-plugin-state/helpers/structure-component';
import { PluginStateObject } from 'molstar/lib/mol-plugin-state/objects';
import { MolScriptBuilder } from 'molstar/lib/mol-script/language/builder';
import { Expression } from 'molstar/lib/mol-script/language/expression';
import { ColorTheme, LocationColor } from 'molstar/lib/mol-theme/color';
import { ThemeDataContext } from 'molstar/lib/mol-theme/theme';
import { UUID } from 'molstar/lib/mol-util';
import { Color } from 'molstar/lib/mol-util/color';
import { ColorNames } from 'molstar/lib/mol-util/color/names';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { capitalize, stringToWords } from 'molstar/lib/mol-util/string';

import { extend, mapArrToObj, sortIfNeeded } from '../../utils';


/** Special value that can be used as color with null-like semantic (i.e. "no color provided").
 * By some lucky coincidence, Mol* treats -1 as white. */
export const NoColor = Color(-1);

/** Return true if `color` is a real color, false if it is `NoColor`. */
function isValidColor(color: Color): boolean {
    return color >= 0;
}

const DefaultBackgroundColor = ColorNames.white;

const StaticSelectorChoice = new Choice(mapArrToObj(StaticStructureComponentTypes, t => capitalize(t)), 'all');


/** Parameter definition for color theme "Composite" */
export function makeCompositeColorThemeParams(colorThemeRegistry: ColorTheme.Registry, ctx: ThemeDataContext) {
    const colorThemeInfo = {
        help: (value: { name: string, params: {} }) => {
            const { name, params } = value;
            const p = colorThemeRegistry.get(name);
            const ct = p.factory({}, params);
            return { description: ct.description, legend: ct.legend };
        }
    };
    const nestedThemeTypes = colorThemeRegistry.types.filter(([name, label, category]) => name !== COMPOSITE_COLOR_THEME_NAME && colorThemeRegistry.get(name).isApplicable(ctx)); // Adding 'composite' theme itself would cause infinite recursion
    return {
        layers: PD.ObjectList(
            {
                theme: PD.Mapped<any>(
                    'uniform',
                    nestedThemeTypes,
                    name => PD.Group<any>(colorThemeRegistry.get(name).getParams({ structure: Structure.Empty })),
                    colorThemeInfo),
                selection: PD.MappedStatic('static', { // like StructureComponentParams in molstar/lib/mol-plugin-state/helpers/structure-component
                    static: StaticSelectorChoice.PDSelect(),
                    expression: PD.Value<Expression>(MolScriptBuilder.struct.generator.all),
                    bundle: PD.Value<StructureElement.Bundle>(StructureElement.Bundle.Empty),
                    script: PD.Script({ language: 'mol-script', expression: '(sel.atom.all)' }),
                }, { description: 'Define a part of the structure where this layer applies (use Static:all to apply to the whole structure)' }),
            },
            obj => stringToWords(obj.theme.name),
            { description: 'A list of layers, each defining a color theme. The last listed layer is the top layer (applies first). If the top layer does not provide color for a location or its selection does not cover the location, the underneath layers will apply.' }),
        background: PD.Color(DefaultBackgroundColor, { description: 'Color for elements where no layer applies' }),
    };
}
export type CompositeColorThemeParams = ReturnType<typeof makeCompositeColorThemeParams>

/** Parameter values for color theme "Composite" */
export type CompositeColorThemeProps = PD.Values<CompositeColorThemeParams>

export const DefaultCompositeColorThemeProps: CompositeColorThemeProps = { layers: [], background: DefaultBackgroundColor };


/** Parameter values for defining a structure selection */
export type Selector = CompositeColorThemeProps['layers'][number]['selection']

export const SelectorAll = { name: 'static', params: 'all' } satisfies Selector;

export function isSelectorAll(props: Selector): props is typeof SelectorAll {
    return props.name === 'static' && props.params === 'all';
}


/** Return color theme that assigns colors based on a list of nested color themes (layers).
 * The last layer in the list whose selection covers the given location and which provides a valid (non-negative) color value will be used. */
export function CompositeColorTheme(ctx: ThemeDataContext, props: CompositeColorThemeProps, colorThemeRegistry: ColorTheme.Registry): ColorTheme<CompositeColorThemeParams> {
    const colorLayers: { color: LocationColor, elementSet: ElementSet | undefined }[] = []; // undefined elementSet means 'all'
    for (let i = props.layers.length - 1; i >= 0; i--) { // iterate from end to get top layer first, bottom layer last
        const layer = props.layers[i];
        const themeProvider = colorThemeRegistry.get(layer.theme.name);
        if (!themeProvider) {
            console.warn(`Skipping color theme '${layer.theme.name}', cannot find it in registry.`);
            continue;
        }
        const theme = themeProvider.factory(ctx, layer.theme.params);
        switch (theme.granularity) {
            case 'uniform':
            case 'instance':
            case 'group':
            case 'groupInstance':
            case 'vertex':
            case 'vertexInstance':
                const elementSet = isSelectorAll(layer.selection) ? undefined : elementSetFromSelector(ctx.structure, layer.selection); // treating 'all' specially for performance reasons (it's expected to be used most often)
                colorLayers.push({ color: theme.color, elementSet });
                break;
            default:
                console.warn(`Skipping color theme '${layer.theme.name}', cannot process granularity '${theme.granularity}'`);
        }
    };

    function structureElementColor(loc: StructureElement.Location, isSecondary: boolean): Color {
        for (const layer of colorLayers) {
            const matches = !layer.elementSet || elementSetHas(layer.elementSet, loc);
            if (!matches) continue;
            const color = layer.color(loc, isSecondary);
            if (!isValidColor(color)) continue;
            return color;
        }
        return props.background;
    }
    const auxLocation = StructureElement.Location.create(ctx.structure);

    const color: LocationColor = (location: Location, isSecondary: boolean) => {
        if (StructureElement.Location.is(location)) {
            return structureElementColor(location, isSecondary);
        } else if (Bond.isLocation(location)) {
            // this will be applied for each bond twice, to get color of each half (a* refers to the adjacent atom, b* to the opposite atom)
            auxLocation.unit = location.aUnit;
            auxLocation.element = location.aUnit.elements[location.aIndex];
            return structureElementColor(auxLocation, isSecondary);
        }
        return props.background;
    };
    if (ctx.structure) benchmarkColorFunction(color, ctx.structure);

    return {
        factory: (ctx_, props_) => CompositeColorTheme(ctx_, props_, colorThemeRegistry),
        granularity: 'group',
        preferSmoothing: true,
        color: color,
        props: props,
        description: 'Combines colors from multiple color themes.',
    };
}


const COMPOSITE_COLOR_THEME_NAME = 'composite';

/** A thingy that is needed to register color theme "Composite" */
export function makeCompositeColorThemeProvider(colorThemeRegistry: ColorTheme.Registry): ColorTheme.Provider<CompositeColorThemeParams, 'composite'> {
    return {
        name: COMPOSITE_COLOR_THEME_NAME,
        label: 'Composite',
        category: ColorTheme.Category.Misc,
        factory: (ctx, props) => CompositeColorTheme(ctx, props, colorThemeRegistry),
        getParams: (ctx: ThemeDataContext) => makeCompositeColorThemeParams(colorThemeRegistry, ctx),
        defaultValues: DefaultCompositeColorThemeProps,
        isApplicable: (ctx: ThemeDataContext) => true,
    };
}


function substructureFromSelector(structure: Structure, selector: Selector): Structure {
    const pso = createStructureComponent(structure, { type: selector, label: '', nullIfEmpty: false }, { source: structure });
    if (PluginStateObject.Molecule.Structure.is(pso)) {
        return pso.data;
    } else {
        return Structure.Empty;
    }
}

/** Data structure for fast lookup of a structure element location in a structure */
type ElementSet = { [modelId: UUID]: SortedArray<ElementIndex> }

function elementSetFromSelector(structure: Structure | undefined, selector: Selector): ElementSet {
    if (!structure) return {};
    const arrays: { [modelId: UUID]: ElementIndex[] } = {};
    const selection = substructureFromSelector(structure, selector); // using `getAtomRangesForRow` might (might not) be faster here
    for (const unit of selection.units) {
        extend(arrays[unit.model.id] ??= [], unit.elements);
    }
    const result: { [modelId: UUID]: SortedArray<ElementIndex> } = {};
    for (const modelId in arrays) {
        const array = arrays[modelId as UUID];
        sortIfNeeded(array, (a, b) => a - b);
        result[modelId as UUID] = SortedArray.ofSortedArray(array);
    }
    return result;
}

/** Decide if the element set `set` contains structure element location `location` */
function elementSetHas(set: ElementSet, location: StructureElement.Location): boolean {
    const array = set[location.unit.model.id];
    return array ? SortedArray.has(array, location.element) : false;
}

function benchmarkColorFunction(colorFunction: LocationColor, structure: Structure) {
    console.log('Benchmarking color function', colorFunction, 'on', structure.elementCount, 'atoms');
    console.time('Benchmarking color');
    const loc = StructureElement.Location.create(structure);
    for (const unit of structure.units) {
        loc.unit = unit;
        const elements = unit.elements;
        for (let i = 0, n = unit.elements.length; i < n; i++) {
            loc.element = elements[i];
            colorFunction(loc, false);
        }
    }
    console.timeEnd('Benchmarking color');
}
