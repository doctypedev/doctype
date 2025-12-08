/**
 * Changeset command - Generate changesets from code changes using AI
 */

import { Logger } from './logger';
import { ChangesetOptions, ChangesetResult } from './types';
import { ChangesetAnalyzer } from './changeset-analyzer';
import { ChangesetGenerator } from './changeset-generator';
import { MonorepoDetector } from './monorepo-detector';
import { PackageSelector } from './package-selector';
import * as path from 'path';

/**
 * Generate a changeset from code changes
 *
 * This command:
 * 1. Analyzes git diff to find changed files
 * 2. Uses AST analyzer to detect symbol-level changes
 * 3. Uses AI to determine version type (major/minor/patch) and description
 * 4. Generates a changeset file in .changeset directory
 */
export async function changesetCommand(
  options: ChangesetOptions = {}
): Promise<ChangesetResult> {
  const {
    baseBranch = 'main',
    stagedOnly = false,
    packageName, // No default here - will be detected
    outputDir = '.changeset',
    noAI = false,
    versionType,
    description,
    verbose = false,
    interactive = false,
    forceFetch = false, // Destructure forceFetch here
  } = options;

  const logger = new Logger(verbose);

  logger.info('Generating changeset from code changes...');
  logger.debug(`Base branch: ${baseBranch}`);
  logger.debug(`Staged only: ${stagedOnly}`);
  logger.debug(`Force fetch: ${forceFetch}`); // Log forceFetch
  try {
    // Step 0: Detect monorepo and select package
    const monorepoDetector = new MonorepoDetector(logger);
    const monorepoInfo = await monorepoDetector.detect();

    logger.debug(
      `Monorepo: ${monorepoInfo.isMonorepo ? 'Yes (' + monorepoInfo.type + ')' : 'No'}`
    );
    logger.debug(`Packages found: ${monorepoInfo.packages.length}`);

    // Select package (interactive or automatic)
    const packageSelector = new PackageSelector(logger);
    const selection = await packageSelector.select(monorepoInfo, packageName, interactive);

    const resolvedPackageNames = selection.packageNames;

    logger.debug(
      `Packages: ${resolvedPackageNames.join(', ')}${packageName
        ? ' (manual)'
        : selection.automatic
          ? ' (auto-detected)'
          : ' (selected)'
      }`
    );
    // Step 1: Analyze changes
    const analyzer = new ChangesetAnalyzer(logger);
    logger.info('Analyzing code changes...');

    const analysis = await analyzer.analyzeChanges({
      baseBranch,
      stagedOnly,
      projectRoot: process.cwd(),
      forceFetch, // Pass forceFetch here
    });

    if (analysis.totalChanges === 0 && !analysis.gitDiff) {
      logger.warn('No changes detected');
      return {
        success: false,
        error: 'No changes detected to generate changeset',
      };
    }

    // Filter analysis to include only changes relevant to selected packages
    // This ensures AI only focuses on what matters for these packages
    const relevantPackagePaths = resolvedPackageNames.map(name => {
      const pkg = monorepoInfo.packages.find(p => p.name === name);
      return pkg ? pkg.path : null; // Use pkg.path (absolute) instead of pkg.relativePath
    }).filter(p => p !== null) as string[];

    // If we have package paths (monorepo), filter changes
    // If not (relevantPackagePaths empty or single package repo), keep all changes
    if (relevantPackagePaths.length > 0 && monorepoInfo.isMonorepo) {
      // Filter symbol changes
      analysis.symbolChanges = analysis.symbolChanges.filter(change => {
        // change.filePath is absolute
        // We ensure strict directory matching
        return relevantPackagePaths.some(pkgPath =>
          change.filePath.startsWith(pkgPath + path.sep) || change.filePath === pkgPath
        );
      });

      // Filter changed files
      // files are also absolute in our analyzer (or relative? let's check analyzer)
      // ASTAnalyzer returns absolute paths usually.
      // ChangesetAnalyzer.extractChangedFiles returns `${projectRoot}/${filePath}` => Absolute.
      analysis.changedFiles = analysis.changedFiles.filter(file => {
        return relevantPackagePaths.some(pkgPath =>
          file.startsWith(pkgPath + path.sep) || file === pkgPath
        );
      });

      // Update total count
      analysis.totalChanges = analysis.symbolChanges.length;

      logger.debug(`Filtered analysis to ${analysis.totalChanges} changes for selected packages`);
    }

    logger.success(
      `Found ${analysis.totalChanges} symbol changes in ${analysis.changedFiles.length} files`
    );

    // Step 2: Generate changeset
    const generator = new ChangesetGenerator(logger);
    logger.info('Generating changeset...');

    const result = await generator.generateChangeset(analysis, {
      packageNames: resolvedPackageNames,
      outputDir,
      noAI,
      versionType,
      description,
      verbose,
    });

    if (result.success) {
      logger.success(`Changeset generated successfully!`);
      logger.info(`File: ${result.filePath}`);
      logger.info(`Type: ${result.versionType}`);
      logger.info(`Description: ${result.description}`);
    } else {
      logger.error(`Failed to generate changeset: ${result.error}`);
    }

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    logger.error('Changeset generation failed:', errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}
