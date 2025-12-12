---
title: Roadmap
description: Future plans and upcoming features for the Sintesi documentation ecosystem.
icon: 🗺️
order: 50
---

# What's Next for Sintesi Documentation

This project aims to evolve into a fully dynamic and "smart" documentation generator.
Here are the next steps planned for the `sintesi documentation` command and the ecosystem.

## 1. Interactive Components (Vue/React)
Currently, we generate static Markdown. The next step is to leverage the power of VitePress/Nextra to include interactive components directly in the docs.

- **Goal**: Allow the AI to inject `<Callout>`, `<Tabs>`, or `<Terminal>` components.
- **Implementation**:
  - Define a standard set of components in the base theme.
  - Instruct the `Writer` agent to use these tags instead of standard Markdown where appropriate.
  - Example: Use `<Badge type="warning">Deprecated</Badge>` for deprecated APIs.

## 2. Dynamic Landing Page
The entry point (`index.md`) should be more than just a README copy.

- **Goal**: Generate a marketing-oriented Landing Page.
- **Implementation**:
  - Analyze `package.json` and code to understand the "Value Proposition".
  - Generate a specific `index.md` with YAML frontmatter for VitePress Home Layout (Hero, Features, Footer).

## 3. "Self-Healing" Documentation
Automated verification of the generated documentation.

- **Goal**: Ensure that code examples in the documentation actually work.
- **Implementation**:
  - Extract code blocks from Markdown.
  - Run them against the current codebase (if possible) or lint them.
  - If errors are found, feed them back to the `Writer` agent to fix the documentation automatically.

## 4. Semantic Search / RAG
- **Goal**: "Ask your docs".
- **Implementation**: Index the generated documentation chunks and provide an AI search interface (already partially supported by VitePress Algolia, but a local LLM version would be better).

## 5. Multi-language Support (i18n)
- **Goal**: Automatically translate documentation.
- **Implementation**: Add a `locales` config. The `Writer` agent generates `docs/it/guide.md` parallel to `docs/guide.md`.
