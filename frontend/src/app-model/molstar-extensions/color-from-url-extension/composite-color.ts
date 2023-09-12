/**
 * Copyright (c) 2023 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Adam Midlik <midlik@gmail.com>
 */

import { Location } from 'molstar/lib/mol-model/location';
import { Structure } from 'molstar/lib/mol-model/structure';
import { ColorTheme, LocationColor } from 'molstar/lib/mol-theme/color';
import { ThemeDataContext } from 'molstar/lib/mol-theme/theme';
import { Color } from 'molstar/lib/mol-util/color';
import { ColorNames } from 'molstar/lib/mol-util/color/names';
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition';
import { stringToWords } from 'molstar/lib/mol-util/string';


/** Special value that can be used as color with null-like semantic (i.e. "no color provided").
 * By some lucky coincidence, Mol* treats -1 as white. */
export const NoColor = Color(-1);

/** Return true if `color` is a real color, false if it is `NO_COLOR`. */
function isValidColor(color: Color): boolean {
    return color >= 0;
}

const DefaultBackgroundColor = ColorNames.gainsboro;


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
                selection: PD.Select('all', [['all', 'All']]),
            },
            obj => stringToWords(obj.theme.name)),
        background: PD.Color(DefaultBackgroundColor, { description: 'Color for elements where no layer applies' }),
    };
}
export type CompositeColorThemeParams = ReturnType<typeof makeCompositeColorThemeParams>


/** Parameter values for color theme "Composite" */
export type CompositeColorThemeProps = PD.Values<CompositeColorThemeParams>

export const DefaultCompositeColorThemeProps: CompositeColorThemeProps = { layers: [], background: DefaultBackgroundColor };


/** Return color theme that assigns colors based on a list of nested color themes (layers).
 * The last layer in the list whose selection covers the given location and which provides a valid (non-negative) color value will be used.
 */
export function CompositeColorTheme(ctx: ThemeDataContext, props: CompositeColorThemeProps, colorThemeRegistry: ColorTheme.Registry): ColorTheme<CompositeColorThemeParams> {
    console.log('Creating CompositeColorTheme', ctx, props);
    /** Top layer first */
    const colorLayers: { selection: typeof props['layers'][number]['selection'], color: LocationColor }[] = [];
    const nThemes = props.layers.length;
    for (let i = nThemes - 1; i >= 0; i--) { // iterate from end to get top layer first, bottom layer last
        const layer = props.layers[i];
        const theme = colorThemeRegistry.get(layer.theme.name)?.factory(ctx, layer.theme.params);
        if (!theme) {
            console.warn(`Skipping colorTheme '${layer.theme.name}', cannot find it in registry.`);
            continue;
        }
        switch (theme.granularity) {
            case 'uniform':
            case 'instance':
            case 'group':
            case 'groupInstance':
            case 'vertex':
            case 'vertexInstance':
                console.log(`Adding colorTheme '${layer.theme.name}'`, theme);
                colorLayers.push({ selection: layer.selection, color: theme.color });
                break;
            default:
                console.warn(`Skipping colorTheme '${layer.theme.name}', cannot process granularity '${theme.granularity}'`);
        }
        if (layer.selection !== 'all') throw new Error('NotImplementedError');
    };
    console.log('CompositeColorTheme colorLayers:', colorLayers);
    const color: LocationColor = (location: Location, isSecondary: boolean) => {
        for (const layer of colorLayers) {
            if (layer.selection !== 'all') throw new Error('NotImplementedError');
            // TODO check if layer.selection covers this location!
            const c = layer.color(location, isSecondary);
            console.log('trying color:', location, layer, c);
            if (isValidColor(c)) return c;
        }
        return props.background;
    };

    return {
        factory: (ctx_, props_) => CompositeColorTheme(ctx_, props_, colorThemeRegistry),
        granularity: 'group',
        preferSmoothing: true,
        color: color,
        props: props,
        description: 'Assigns colors from multiple color themes.',
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
