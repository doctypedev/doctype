/**
 * Content & Mapping Module
 *
 * This module handles:
 * - Markdown parsing and anchor extraction (powered by Rust core)
 * - Markdown anchor insertion (for init command)
 * - sintesi-map.json management
 * - Content injection into markdown files
 */

// Re-export Rust-powered markdown extraction
export {
  extractAnchors,
  validateMarkdownAnchors,
  parseCodeRef,
  type DoctypeAnchor,
  type ExtractionResult,
  type CodeRefParts,
} from '../core';

export { DoctypeMapManager } from './map-manager';
export { ContentInjector, type InjectionResult } from './content-injector';
export { MarkdownAnchorInserter, type AnchorInsertionOptions, type AnchorInsertionResult } from './markdown-anchor-inserter';
