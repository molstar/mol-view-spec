# Change Log
All notable changes to this project will be documented in this file, following the suggestions of [Keep a CHANGELOG](http://keepachangelog.com/). This project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]

- Support for multiple states in one `.msvj` file
- Configurable transitions/animations between states
- Configurable transparency of representations
- Add support for additional/custom properties on each node ("vendor-specific properties")
  - This allows users to store custom data 
  - Mol* can be instructed to show non-covalent interactions by providing vendor-specific properties
- Fixes several issues with defined types
- Support `ref` property on `Node` which enables referencing nodes by this value
- Initial geometrical primitives support

## [v1.0.0] - 2024-04-10
- Initial release