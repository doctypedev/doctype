---
"@sintesi/sintesi": minor
---

🚀 **Default Site Structure**: The `documentation` command now generates organized, static-site friendly file structures (e.g., for VitePress) by default, grouping files into logical folders like `guide/` and `reference/`. The `--site` flag has been removed.

🐛 **Fix Drift Recursion**: Updated `SmartChecker` to ignore changes to `README.md` itself during drift analysis. This prevents CI infinite loops where documentation updates triggered false positive code changes.
