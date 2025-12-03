# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **CI/CD**: Updated `doctype-check.yml` GitHub Actions workflow to only run the fix command when documentation drift is detected
  - Added step ID to the doctype check step for outcome tracking
  - Modified the fix step condition to skip execution when the check passes: `if: github.ref == 'refs/heads/main' && steps.doctype-check.outcome == 'failure'`
  - This prevents unnecessary fix runs and documentation updates when docs are already in sync

## [0.3.9] - Previous Release

- Previous release notes go here
