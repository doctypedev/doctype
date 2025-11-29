/**
 * Phase 2 - Content & Mapping Module
 *
 * This module handles:
 * - Markdown parsing and anchor extraction
 * - Markdown anchor insertion (for init command)
 * - doctype-map.json management
 * - Content injection into markdown files
 */

export { MarkdownParser, type DoctypeAnchor } from './markdown-parser';
export { DoctypeMapManager } from './map-manager';
export { ContentInjector, type InjectionResult } from './content-injector';
export { MarkdownAnchorInserter, type AnchorInsertionOptions, type AnchorInsertionResult } from './markdown-anchor-inserter';
