# Change Log
All notable changes to this project will be documented in this file, following the suggestions of [Keep a CHANGELOG](http://keepachangelog.com/). This project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]

- Add `load/s` to `MVSJ` object
- Add `find_ref` to `State` and `MVSJ` objects

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
