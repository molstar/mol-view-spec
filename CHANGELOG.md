# Change Log
All notable changes to this project will be documented in this file, following the suggestions of [Keep a CHANGELOG](http://keepachangelog.com/). This project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]

- add molviewspec-ts, a typescript implementation of mol-view-spec
- color_from_uri and color_from_source take selector parameter

## [v1.8.1] - 2025-12-22

- Fix compression not being applied to mvsj_to_mvsx function, MVSX node, and molstar widget
- Fixed passing None value to optional node params

## [v1.8.0] - 2025-11-05

- Add support for `dx` volume format
- Add support for `top`, `prmtop`, and `psf` topology formats
- Add support for `nctraj`, `dcd`, and `trr` coordinate formats
- Add support for clipping of primitives
- Add support for `near` in `CameraParams`
- Use `viewportShowToggleFullscreen` instead of `viewportShowExpand` to support fullscreen in Jupyter and Streamlit

## [v1.7.0] - 2025-09-28

NOTE: Most of these features require Mol* 5.0 to work

- Add snapshot animation support
- Add `load/s` to `MVSJ` object
- Add `find_ref` to `State` and `MVSJ` objects
- Add `ref/custom` props to builder methods where previously missing
- Add `vector_radius` param for primitive `angle_measurement`
- Add `field_remapping` param for `*_from_*` nodes
- Add `palette` param for `color_from_*` nodes
- Add `clip` node support for structure and volume representations
- Add `instance_id` field to ComponentExpression and MVS annotations
- Add `grid_slice` volume representation support
- Add `label_show_tether`, `label_tether_length`, `label_attachment`, and `label_background_color` to `PrimitivesParams`
- Add `snapshot_key` to `PrimitivesParams` that enables navigating to a different snapshot on interaction
- Add `matrix` field support to `TransformParams`
- Add `instance` node type
- Add `surface_type` (`molecular` / `gaussian`) to the surface representation
- Add `backbone` and `line` representation types
- Add `transform.rotation_center` to support rotating objects around their centroids or defined points
- Add `coordinates` node to support loading coords from separate files
- Add support for additional file formats (`pdbqt`, `gro`, `xyz`, `mol`, `sdf`, `mol2`, `xtc`, `lammpstrj`)
- Support transforms and instancing on structures, components, and volumes
- Make `canvas.background_color` optional

## [v1.6.0] - 2025-04-22

- Add `MSVJ` and `MVSX` wrapper objects
- Add `to_dict` and `dumps` methods to `State` and `States` objects
- Support `stories` UI in `molstar_html`
- Add `molstar_notebook/html/streamlit/_ipython_display_` methods to `State`/`States`/`MVSJ`/`MVSX`/`Root` objects
- Breaking: state builder `Root.get_state` now returns `State` object instead of serialized JSON
  - Use `get_state().dumps()` to achieve the same result

## [v1.5.0] - 2025-04-09

- Fix missing tooltip default value for `BoxParams`
- Add simple widgets for Jupyter & Colab (`builder.molstar_notebook()`) and Streamlit (`builder.molstar_streamlit()`)

## [v1.4.0] - 2025-04-09

- Add `auth/label_comp_id` to `ComponentExpression`
- Add MVSJ to MVSX archive functionality
  - Create self-contained archives with all external resources for offline use
  - Functions for finding and updating URI references in MVSJ files
  - Download external resources and package them with MVSJ into a ZIP archive
  - Extract archives to recover original files with localized references

## [v1.3.0] - 2025-03-18

- Support for pydantic v2

## [v1.2.1] - 2025-02-26

- State-related nodes are now exported by the package

## [v1.2.0] - 2025-02-25

- Focus node 
  - Can be on root
  - Focus node radius, radius_factor, radius_extent parameters
- Breaking: Change `transparency` to `opacity`
- Breaking: Renamed geometrical primitive `line` to `tube`
- Breaking: Change multiple geometrical primitive parameters
- Multi-state data model tweaks
- Support for representation-specific parameters (customize presentation visuals)
- Add `coarse` component kind
- Add `spacefill` representation
- Add `carbohydrate` representation
- Add `element_granularity` field to component expressions
- Add I/HM basic restraints example
- Add primitives: ellipse, ellipsoid, box, arrow, angle
- Add basic support for volumetric data (map, volume server)
- Add membrane orientation examples


## [v1.1.0] - 2024-12-09

- Support for multiple states in one `.msvj` file
- Configurable transitions/animations between states
- Configurable opacity of representations
- Add support for additional/custom properties on each node ("vendor-specific properties")
  - This allows users to store custom data 
  - Mol* can be instructed to show non-covalent interactions by providing vendor-specific properties
- Fixes several issues with defined types
- Support `ref` property on `Node` which enables referencing nodes by this value
- Geometrical primitives support (experimental and under development)

## [v1.0.0] - 2024-04-10
- Initial release
