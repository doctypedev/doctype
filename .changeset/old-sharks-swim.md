---
"@doctypedev/doctype": minor
---

- **New**: `doctype check` now detects "untracked" symbols (exported code not yet in the map).
- **New**: Added `--prune` flag to `doctype fix` to remove dead documentation entries.
- **Fix**: Huge performance improvement in drift detection via AST caching.
- **Fix**: Filtered out local variables from being documented as public APIs.
