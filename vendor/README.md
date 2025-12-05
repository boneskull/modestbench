# Vendored Dependencies

This directory contains third-party packages that have been vendored (copied
directly into the repository) instead of being installed from npm.

## Why Vendor?

Packages are vendored when:

- They are not published to npm
- We need a specific version/fork not available on npm
- We want to avoid git-based dependency references

## Packages

### `astro-broken-link-checker`

- **Source:** <https://github.com/imazen/astro-broken-link-checker>
- **Version:** 1.0.3
- **License:** Apache-2.0
- **Author:** Lilith River

An Astro integration to check for broken links during build time. This package
is not yet published to npm, so it has been vendored from the GitHub repository.

## Updating Vendored Packages

To update a vendored package:

1. Check the upstream repository for changes
2. Copy the updated source files
3. Update the version in `package.json`
4. Update this README with the new version
5. Run `npm install` to pick up any dependency changes

