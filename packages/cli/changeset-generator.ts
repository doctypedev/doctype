/**
 * Changeset Generator - Creates changeset files from analyzed changes
 */

import { Logger } from './logger';
import { ChangesetAnalysis } from './changeset-analyzer';
import { VersionTypeDetector } from './changeset-version-detector';
import { ChangesetPrompt } from './prompts/changeset-prompt';
import fs from 'fs/promises';
import path from 'path';

/**
 * Changeset version type
 */
export type VersionType = 'major' | 'minor' | 'patch';

/**
 * Changeset generation result
 */
export interface ChangesetResult {
  /** Whether the changeset was generated successfully */
  success: boolean;
  /** Path to the generated changeset file */
  filePath?: string;
  /** Version type determined */
  versionType?: VersionType;
  /** Generated description */
  description?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Options for changeset generation
 */
export interface GenerateOptions {
  /** Package names (default: [@doctypedev/doctype]) */
  packageNames?: string[];
  /** Output directory (default: .changeset) */
  outputDir?: string;
  /** Skip AI analysis and use defaults */
  noAI?: boolean;
  /** Manually specify version type */
  versionType?: VersionType;
  /** Manually specify description */
  description?: string;
  /** Verbose logging */
  verbose?: boolean;
}

/**
 * AI response for changeset analysis
 */
interface ChangesetAIResponse {
  versionType: VersionType;
  description: string;
  reasoning: string;
}

/**
 * Changeset Generator
 *
 * Uses AI to analyze code changes and generate appropriate changeset files
 */
export class ChangesetGenerator {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Generate a changeset file from analyzed changes
   */
  /**
   * Generate a changeset file from analyzed changes
   */
  async generateChangeset(
    analysis: ChangesetAnalysis,
    options: GenerateOptions = {}
  ): Promise<ChangesetResult> {
    const {
      packageNames = ['package'],
      outputDir = '.changeset',
      noAI = false,
      versionType: manualVersionType,
      description: manualDescription,
      verbose = false,
    } = options;

    // Check if there are any changes
    if (analysis.totalChanges === 0 && !analysis.gitDiff) {
      return {
        success: false,
        error: 'No changes detected to generate changeset',
      };
    }

    let versionType: VersionType;
    let description: string;

    // Use manual values if provided
    if (manualVersionType && manualDescription) {
      versionType = manualVersionType;
      description = manualDescription;
      this.logger.info(`Using manual version type: ${versionType}`);
    } else if (noAI) {
      // Use automatic detection without AI
      const detector = new VersionTypeDetector(this.logger);
      const detection = detector.detect(analysis);

      versionType = detection.versionType;
      description = detection.reasoning;

      this.logger.info(`Auto-detected version type: ${versionType} (${detection.confidence} confidence)`);
      if (verbose) {
        this.logger.debug(`Detection reasoning: ${detection.reasoning}`);
      }
    } else {
      // Use AI to determine version type and description
      try {
        const aiResponse = await this.analyzeWithAI(analysis, verbose);
        versionType = aiResponse.versionType;
        description = aiResponse.description;

        this.logger.info(`AI determined version type: ${versionType}`);
        if (verbose) {
          this.logger.debug(`AI reasoning: ${aiResponse.reasoning}`);
        }
      } catch (error) {
        this.logger.error('AI analysis failed, falling back to automatic detection:', error);

        // Fallback to automatic detection if AI fails
        const detector = new VersionTypeDetector(this.logger);
        const detection = detector.detect(analysis);

        versionType = detection.versionType;
        description = detection.reasoning;

        this.logger.info(`Auto-detected version type: ${versionType} (fallback)`);
      }
    }

    // Generate changeset file
    try {
      const filePath = await this.writeChangesetFile(
        packageNames,
        versionType,
        description,
        outputDir
      );

      this.logger.success(`Generated changeset: ${filePath}`);

      return {
        success: true,
        filePath,
        versionType,
        description,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Analyze changes with AI to determine version type and description
   */
  private async analyzeWithAI(
    analysis: ChangesetAnalysis,
    verbose: boolean
  ): Promise<ChangesetAIResponse> {
    const { createAgentFromEnv } = await import('../ai/ai-agent');
    const agent = createAgentFromEnv({ debug: verbose });

    // Build prompt for AI
    const prompt = ChangesetPrompt.buildAnalysisPrompt(analysis);

    if (verbose) {
      this.logger.debug('Sending analysis to AI...');
    }

    try {
      // Use the AI agent to analyze changes
      // We'll use the provider's direct text generation capability
      const provider = (agent as any).provider;

      const response = await provider.generateText(prompt, {
        temperature: 0.3, // Lower temperature for more deterministic results
      });

      // Parse AI response
      return this.parseAIResponse(response);
    } catch (error) {
      this.logger.error('Failed to get AI response:', error);
      throw error;
    }
  }

  // buildAnalysisPrompt logic moved to ./prompts/changeset-prompt.ts

  /**
   * Parse AI response to extract version type and description
   */
  private parseAIResponse(response: string): ChangesetAIResponse {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate response
      if (!parsed.versionType || !parsed.description) {
        throw new Error('Invalid AI response structure');
      }

      // Validate version type
      if (!['major', 'minor', 'patch'].includes(parsed.versionType)) {
        throw new Error(`Invalid version type: ${parsed.versionType}`);
      }

      return {
        versionType: parsed.versionType as VersionType,
        description: parsed.description,
        reasoning: parsed.reasoning || 'No reasoning provided',
      };
    } catch (error) {
      this.logger.error('Failed to parse AI response:', error);
      this.logger.debug('Raw response:', response);
      throw new Error('Failed to parse AI response');
    }
  }

  /**
   * Write changeset file to disk
   */
  private async writeChangesetFile(
    packageNames: string[],
    versionType: VersionType,
    description: string,
    outputDir: string
  ): Promise<string> {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Generate random filename (similar to changesets CLI)
    const filename = this.generateFilename();
    const filePath = path.join(outputDir, `${filename}.md`);

    // Generate changeset frontmatter
    let frontmatter = '---\n';
    for (const pkgName of packageNames) {
      frontmatter += `"${pkgName}": ${versionType}\n`;
    }
    frontmatter += '---\n';

    // Generate changeset content
    const content = `${frontmatter}
${description}
`;

    // Write file
    await fs.writeFile(filePath, content, 'utf-8');

    return filePath;
  }

  /**
   * Generate random filename for changeset
   */
  private generateFilename(): string {
    const adjectives = [
      'happy', 'brave', 'calm', 'bright', 'clever', 'cool', 'fair', 'fancy',
      'gentle', 'jolly', 'kind', 'lively', 'nice', 'proud', 'quiet', 'swift',
      'wise', 'young', 'zealous', 'new', 'old', 'big', 'small', 'fast', 'slow',
    ];

    const nouns = [
      'pandas', 'tigers', 'eagles', 'dolphins', 'wolves', 'foxes', 'bears',
      'lions', 'owls', 'hawks', 'whales', 'sharks', 'cats', 'dogs', 'birds',
      'fish', 'trees', 'flowers', 'stars', 'moons', 'suns', 'clouds', 'rivers',
    ];

    const verbs = [
      'walk', 'run', 'jump', 'fly', 'swim', 'dance', 'sing', 'play',
      'sleep', 'eat', 'drink', 'laugh', 'cry', 'smile', 'talk', 'listen',
    ];

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const verb = verbs[Math.floor(Math.random() * verbs.length)];

    return `${adj}-${noun}-${verb}`;
  }
}
