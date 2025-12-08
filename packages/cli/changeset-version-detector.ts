/**
 * Automatic Version Type Detection
 *
 * Analyzes code changes to automatically determine semantic version type
 * without AI - using deterministic rules based on AST analysis
 */

import { ChangesetAnalysis, SymbolChange } from './changeset-analyzer';
import { Logger } from './logger';

export type VersionType = 'major' | 'minor' | 'patch';

/**
 * Detection result with reasoning
 */
export interface VersionDetectionResult {
  versionType: VersionType;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detects version type from analyzed changes
 */
export class VersionTypeDetector {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Detect version type from changes
   */
  detect(analysis: ChangesetAnalysis): VersionDetectionResult {
    const { symbolChanges } = analysis;

    if (symbolChanges.length === 0) {
      // No symbol changes - likely just refactoring or docs
      return {
        versionType: 'patch',
        reasoning: 'Internal changes with no public API modifications',
        confidence: 'high',
      };
    }

    // Count changes by type
    const added = symbolChanges.filter(c => c.changeType === 'added');
    const deleted = symbolChanges.filter(c => c.changeType === 'deleted');
    const modified = symbolChanges.filter(c => c.changeType === 'modified');

    this.logger.debug(`Changes: ${added.length} added, ${deleted.length} deleted, ${modified.length} modified`);

    // Rule 1: MAJOR - Breaking changes (deletions)
    if (deleted.length > 0) {
      const description = this.buildDetailedDescription({
        type: 'major',
        deleted,
        added,
        modified,
      });

      return {
        versionType: 'major',
        reasoning: description,
        confidence: 'high',
      };
    }

    // Rule 2: MAJOR - Modified with potential breaking changes
    const breakingModifications = modified.filter(c => this.isPotentiallyBreaking(c));
    if (breakingModifications.length > 0) {
      const description = this.buildDetailedDescription({
        type: 'major',
        breakingModifications,
        added,
        modified: modified.filter(c => !this.isPotentiallyBreaking(c)),
      });

      return {
        versionType: 'major',
        reasoning: description,
        confidence: 'medium',
      };
    }

    // Rule 3: MINOR - New symbols added
    if (added.length > 0) {
      const featureModifications = modified.filter(c => this.isFeatureAddition(c));
      const description = this.buildDetailedDescription({
        type: 'minor',
        added,
        featureModifications,
        modified: modified.filter(c => !this.isFeatureAddition(c)),
      });

      return {
        versionType: 'minor',
        reasoning: description,
        confidence: 'high',
      };
    }

    // Rule 4: MINOR - Modified with new features
    const featureModifications = modified.filter(c => this.isFeatureAddition(c));
    if (featureModifications.length > 0) {
      const description = this.buildDetailedDescription({
        type: 'minor',
        featureModifications,
        modified: modified.filter(c => !this.isFeatureAddition(c)),
      });

      return {
        versionType: 'minor',
        reasoning: description,
        confidence: 'medium',
      };
    }

    // Rule 5: PATCH - Only internal modifications
    if (modified.length > 0) {
      const description = this.buildDetailedDescription({
        type: 'patch',
        modified,
      });

      return {
        versionType: 'patch',
        reasoning: description,
        confidence: 'medium',
      };
    }

    // Fallback
    return {
      versionType: 'patch',
      reasoning: 'Changes detected but unable to categorize clearly',
      confidence: 'low',
    };
  }

  /**
   * Check if a modification is potentially breaking
   *
   * Heuristics:
   * - Signature got shorter (parameters removed)
   * - Required parameters changed position
   * - Return type changed significantly
   */
  private isPotentiallyBreaking(change: SymbolChange): boolean {
    if (!change.oldSignature || !change.newSignature) {
      return false;
    }

    const oldSig = change.oldSignature.signatureText;
    const newSig = change.newSignature.signatureText;

    // Heuristic 1: Signature got significantly shorter (likely removed params)
    if (newSig.length < oldSig.length * 0.7) {
      this.logger.debug(`Potential breaking: ${change.symbolName} signature shortened`);
      return true;
    }

    // Heuristic 2: Type changed from one base type to another
    // (e.g., string → number, object → array)
    const typeChanges = this.detectTypeChanges(oldSig, newSig);
    if (typeChanges.length > 0) {
      this.logger.debug(`Potential breaking: ${change.symbolName} has type changes`);
      return true;
    }

    return false;
  }

  /**
   * Check if a modification adds new features
   *
   * Heuristics:
   * - Signature got longer (new optional parameters)
   * - New methods added to class
   */
  private isFeatureAddition(change: SymbolChange): boolean {
    if (!change.oldSignature || !change.newSignature) {
      return false;
    }

    const oldSig = change.oldSignature.signatureText;
    const newSig = change.newSignature.signatureText;

    // Heuristic: Signature got longer (likely new optional params or features)
    if (newSig.length > oldSig.length * 1.2) {
      this.logger.debug(`Feature addition: ${change.symbolName} signature expanded`);
      return true;
    }

    // Heuristic: New optional parameters added (contains more '?')
    const oldOptionals = (oldSig.match(/\?:/g) || []).length;
    const newOptionals = (newSig.match(/\?:/g) || []).length;
    if (newOptionals > oldOptionals) {
      this.logger.debug(`Feature addition: ${change.symbolName} has new optional parameters`);
      return true;
    }

    return false;
  }

  /**
   * Detect fundamental type changes in signatures
   */
  private detectTypeChanges(oldSig: string, newSig: string): string[] {
    const changes: string[] = [];

    // Common type keywords that indicate fundamental changes
    const typeKeywords = [
      'string', 'number', 'boolean', 'object', 'array',
      'void', 'null', 'undefined', 'any', 'unknown',
      'Promise', 'Array', 'Record', 'Map', 'Set'
    ];

    for (const type of typeKeywords) {
      const oldHas = oldSig.includes(type);
      const newHas = newSig.includes(type);

      // Type was present but removed, or vice versa
      if (oldHas !== newHas) {
        changes.push(type);
      }
    }

    return changes;
  }

  /**
   * Build detailed description with bullet points
   */
  private buildDetailedDescription(changes: {
    type: 'major' | 'minor' | 'patch';
    added?: SymbolChange[];
    modified?: SymbolChange[];
    deleted?: SymbolChange[];
    breakingModifications?: SymbolChange[];
    featureModifications?: SymbolChange[];
  }): string {
    const parts: string[] = [];

    // Breaking changes prefix for MAJOR
    const prefix = changes.type === 'major' ? 'BREAKING: ' : '';

    // Handle deletions
    if (changes.deleted && changes.deleted.length > 0) {
      const symbols = changes.deleted.map(c => `\`${c.symbolName}\``).join(', ');
      if (changes.deleted.length === 1) {
        parts.push(`${prefix}Remove ${symbols}`);
      } else {
        parts.push(`${prefix}Remove ${changes.deleted.length} symbols: ${symbols}`);
      }
    }

    // Handle breaking modifications
    if (changes.breakingModifications && changes.breakingModifications.length > 0) {
      const symbols = changes.breakingModifications.map(c => `\`${c.symbolName}\``).join(', ');
      if (changes.breakingModifications.length === 1) {
        parts.push(`${prefix}Change signature of ${symbols}`);
      } else {
        parts.push(`${prefix}Change signatures of ${changes.breakingModifications.length} symbols: ${symbols}`);
      }
    }

    // Handle additions
    if (changes.added && changes.added.length > 0) {
      const symbols = changes.added.slice(0, 5).map(c => `\`${c.symbolName}\``).join(', ');
      const more = changes.added.length > 5 ? ` and ${changes.added.length - 5} more` : '';
      if (changes.added.length === 1) {
        parts.push(`Add ${symbols}`);
      } else {
        parts.push(`Add ${changes.added.length} new exports: ${symbols}${more}`);
      }
    }

    // Handle feature modifications
    if (changes.featureModifications && changes.featureModifications.length > 0) {
      const symbols = changes.featureModifications.map(c => `\`${c.symbolName}\``).join(', ');
      if (changes.featureModifications.length === 1) {
        parts.push(`Enhance ${symbols} with new capabilities`);
      } else {
        parts.push(`Enhance ${changes.featureModifications.length} exports: ${symbols}`);
      }
    }

    // Handle regular modifications (patches)
    if (changes.modified && changes.modified.length > 0) {
      const symbols = changes.modified.slice(0, 5).map(c => `\`${c.symbolName}\``).join(', ');
      const more = changes.modified.length > 5 ? ` and ${changes.modified.length - 5} more` : '';
      if (changes.modified.length === 1) {
        parts.push(`Update ${symbols}`);
      } else {
        parts.push(`Update ${changes.modified.length} exports: ${symbols}${more}`);
      }
    }

    // If we have multiple parts, format as bullet points
    if (parts.length > 1) {
      return parts.map(p => `- ${p}`).join('\n');
    } else if (parts.length === 1) {
      return parts[0];
    }

    return 'Internal changes';
  }

  /**
   * Generate a human-readable summary
   */
  generateSummary(analysis: ChangesetAnalysis): string {
    const { symbolChanges } = analysis;

    if (symbolChanges.length === 0) {
      return 'No public API changes';
    }

    const added = symbolChanges.filter(c => c.changeType === 'added').length;
    const deleted = symbolChanges.filter(c => c.changeType === 'deleted').length;
    const modified = symbolChanges.filter(c => c.changeType === 'modified').length;

    const parts: string[] = [];
    if (added > 0) parts.push(`${added} added`);
    if (modified > 0) parts.push(`${modified} modified`);
    if (deleted > 0) parts.push(`${deleted} deleted`);

    return `Symbol changes: ${parts.join(', ')}`;
  }
}
