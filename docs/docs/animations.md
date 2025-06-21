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

The output is valid MolViewSpec JSON that can be opened in Mol*. Mol* will interpolate between individual substates and 
add smooth transitions by default. You can further customize this behavior using the `transition_duration_ms` and 
`linger_duration_ms` properties. 