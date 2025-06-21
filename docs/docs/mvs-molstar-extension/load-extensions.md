# Mol\* MVS Extension: Custom Load Extensions

Mol\* MolViewSpec extension provides functionality for customizing the state loading.

## `is_hidden` Custom State Example

### Example State

The following state assigns `is_hidden` custom state to the representation:

```py
builder = create_builder()
(
    builder.download(url="https://files.wwpdb.org/download/1cbs.cif")
    .parse(format="mmcif")
    .model_structure()
    .component()
    .representation(custom={"is_hidden": True})
    .color(color="blue")
)
```

### The Extension

Based on the `is_hidden` property, the extension will update the state of the corresponding Mol\* node when loading the state to make the representation hidden:

```ts
import { MolstarLoadingExtension } from 'molstar/lib/extensions/mvs/load';

export const IsHiddenCustomStateExtension: MolstarLoadingExtension<{}> = {
    id: 'is-hidden-custom-state',
    description: 'Allow updating initial visibility of nodes',
    createExtensionContext: () => ({}),
    action: (updateTarget, node) => {
        if (!node.custom || !node.custom?.is_hidden) return;
        updateTarget.update.to(updateTarget.selector).updateState({ isHidden: true });
    },
};
```

### Using the Extension

To load the state with the custom extension, use:

```ts
await loadMVS(this.plugin, data, { replaceExisting: false, extensions: [IsHiddenCustomStateExtension] });
```

See [Mol\* MVS Extension](./index.md) for more information how to use the `loadMVS` function.