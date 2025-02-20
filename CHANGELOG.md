# Change Log
All notable changes to this project will be documented in this file, following the suggestions of [Keep a CHANGELOG](http://keepachangelog.com/). This project adheres to [Semantic Versioning](http://semver.org/).

## Unreleased

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
- Add `element_granularity` field to component expressions
- Add I/HM basic restraints example
- Add primitives: ellipse, ellipsoid, box, arrow
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