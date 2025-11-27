/**
 * Phase 2 - Content & Mapping Module
 *
 * This module handles:
 * - Markdown parsing and anchor extraction
 * - doctype-map.json management
 * - Content injection into markdown files
 */

export { MarkdownParser, type DoctypeAnchor } from './markdown-parser';
export { DoctypeMapManager } from './map-manager';
export { ContentInjector, type InjectionResult } from './content-injector';
