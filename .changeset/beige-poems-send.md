---
"@sintesi/core": minor
"@sintesi/sintesi": minor
---

🚀 **New Architecture & Reviewer Agent**

- **New AI Roles**: Added `Reviewer` and `Researcher` agents. The CLI now performs a self-review of generated documentation using the Reviewer agent to fix hallucinations before saving.
- **Service Layer**: Introduced `GenerationContextService` for better context awareness (detects CLI binary names, tech stacks, and relevant imports) and `ReviewService`.
- **Site Mode**: Added `--site` flag to `documentation` command to generate structured guides ready for VitePress/Starlight.
- **Rebranding**: Project updated to "Sintesi".
