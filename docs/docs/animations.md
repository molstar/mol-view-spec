# MolViewSpec animations

Animations are sequential collections of individual MolViewSpec scenes. You can combine them freely into complex stories
that render scenes one-by-one. The Mol* viewer can interpolate between these states, providing you with a powerful story
telling tool tailored to structural biology.

## Creating snapshots

Use the builder as normal and define the desired scene. Invoke `get_snapshot()` to obtain a snapshot instance (in 
contrast to the default way of emitting the generated state description using `get_state()`).

```python
snapshot1 = builder.get_snapshot(
    title="1tqn",
    description="""
### 1tqn with ligand and electron density map
- 2FO-FC at 1.5σ, blue
- FO-FC (positive) at 3σ, green
- FO-FC (negative) at -3σ, red
""",
    duration_ms: 2000,
)
```

A snapshot can hold additional metadata such as a custom title and description. Markup is supported.

## Combining snapshots

Individual snapshots can then be combined into an animation by providing them in the desired order using the `snapshots`
parameter. Additionally, global metadata can be added that describes shared properties of all snapshots.

```python
states = States(snapshots=[snapshot1, snapshot2], metadata=GlobalMetadata(description="1tqn + Volume Server")).json(
    exclude_none=True, indent=2
)
```

The output is valid MolViewSpec JSON that can be opened in Mol*. 
Mol* will interpolate between individual substates and add smooth transitions by default. 
You can set the duration of the snapshot using the `duration_ms` property in the snapshot metadata. 
(Setting transition duration via `transition_duration_ms` property is deprecated and a `transition` node should be used instead (see [Camera transitions](#camera-transitions)).)

## Animating Snapshots

Properties within a single snapshots can be animated. For example:

```python
builder = create_builder()
structure = builder.download(url="https://files.wwpdb.org/download/1cbs.cif").parse(format="mmcif").model_structure()
structure.component(selector="polymer").representation(type="cartoon").clip(
    ref="clip", type="plane", point=[22, 13, 0], normal=[0, 0, 1]
)

anim = builder.animation()
anim.interpolate(
    kind="scalar",
    target_ref="clip",
    duration_ms=2000,
    property=["point", 2],
    end=55,
    easing="sin-in",
)
```

## Camera transitions

Use `builder.transition()` to customize how the camera moves when transitioning from the previous snapshot to the current snapshot. 
This is the preferred API for camera motion between states and lets you control the transition duration, trajectory, and easing profile.

```python
builder = create_builder()
builder.camera(target=[0, 0, 0], position=[20, 20, 20])
builder.transition(
    duration_ms=1500,
    trajectory="leap",
    easing="sin-in-out",
)
snapshot = builder.get_snapshot(title="Overview")
```

The available options are:

- `duration_ms`: total duration of the camera transition in milliseconds
- `trajectory`: path used for the move. Common choices are `"linear"`, `"linear-relative"`, `"leap"`, and
  `"leap-relative"`
- `easing`: motion curve used to accelerate and decelerate the camera. Examples include `"linear"`, `"sin-in"`,
  `"sin-out"`, and `"sin-in-out"`

This overrides the older snapshot metadata-based `transition_duration_ms` setting for the transition into the current
snapshot. For simple camera moves, `duration_ms` is often enough; for more cinematic motion, combine a `trajectory` and
an `easing` function to shape the movement.
