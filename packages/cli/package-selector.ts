/**
 * Interactive Package Selector
 *
 * Provides interactive CLI to select packages for changeset
 */

import * as clack from '@clack/prompts';
import { MonorepoInfo } from './monorepo-detector';
import { Logger } from './logger';

/**
 * Package selection result
 */
export interface PackageSelection {
  /** Selected package names */
  packageNames: string[];
  /** Whether selection was automatic or manual */
  automatic: boolean;
}

/**
 * Interactive package selector
 */
export class PackageSelector {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Select package(s) interactively or automatically
   */
  /**
   * Select package(s) interactively or automatically
   */
  async select(
    monorepoInfo: MonorepoInfo,
    manualPackageName?: string,
    forceInteractive: boolean = false
  ): Promise<PackageSelection> {
    // If manual package name provided, use it
    if (manualPackageName) {
      return {
        packageNames: [manualPackageName],
        automatic: false,
      };
    }

    // If not a monorepo, use the single package
    if (!monorepoInfo.isMonorepo && !forceInteractive) {
      const pkg = monorepoInfo.packages[0];
      if (pkg) {
        this.logger.debug(`Single package detected: ${pkg.name}`);
        return {
          packageNames: [pkg.name],
          automatic: true,
        };
      }

      // No package.json found
      return {
        packageNames: ['package'],
        automatic: true,
      };
    }

    // Monorepo: Auto-select if only one package has changes (unless forced interactive)
    if (monorepoInfo.changedPackages.length === 1 && !forceInteractive) {
      const pkg = monorepoInfo.changedPackages[0];
      this.logger.info(`Auto-detected changed package: ${pkg.name}`);
      return {
        packageNames: [pkg.name],
        automatic: true,
      };
    }

    // Multiple packages changed, no changes detected, or forced interactive
    // Show interactive selector
    return await this.selectInteractive(monorepoInfo);
  }

  /**
   * Show interactive package selector
   */
  private async selectInteractive(monorepoInfo: MonorepoInfo): Promise<PackageSelection> {
    const { packages, changedPackages } = monorepoInfo;

    // Build choices
    const choices = packages.map(pkg => ({
      value: pkg.name,
      label: pkg.name,
      hint: pkg.hasChanges
        ? `${pkg.relativePath} (has changes)`
        : pkg.relativePath,
    }));

    // Sort: changed packages first
    choices.sort((a, b) => {
      const aHasChanges = changedPackages.some(p => p.name === a.value);
      const bHasChanges = changedPackages.some(p => p.name === b.value);

      if (aHasChanges && !bHasChanges) return -1;
      if (!aHasChanges && bHasChanges) return 1;
      return a.label.localeCompare(b.label);
    });

    // Show intro
    clack.intro('📦 Select Packages for Changeset');

    if (changedPackages.length > 0) {
      clack.log.info(
        `Found ${changedPackages.length} package(s) with changes:\n` +
        changedPackages.map(p => `  • ${p.name}`).join('\n')
      );
    }

    // Prompt for selection
    const selected = await clack.multiselect({
      message: 'Which packages should this changeset be for? (Press <space> to select, <enter> to submit)',
      options: choices,
      initialValues: changedPackages.length > 0 ? changedPackages.map(p => p.name) : [],
      required: true,
    });

    // Handle cancellation
    if (clack.isCancel(selected)) {
      clack.cancel('Operation cancelled');
      process.exit(0);
    }

    const selectedPackages = selected as string[];

    clack.outro(`Selected: ${selectedPackages.join(', ')}`);

    return {
      packageNames: selectedPackages,
      automatic: false,
    };
  }

  /**
   * Select package non-interactively (for CI/headless environments)
   */
  selectNonInteractive(monorepoInfo: MonorepoInfo): PackageSelection {
    // If only one package changed, use it
    if (monorepoInfo.changedPackages.length === 1) {
      return {
        packageNames: [monorepoInfo.changedPackages[0].name],
        automatic: true,
      };
    }

    // If multiple packages changed, use the first one (alphabetically)
    if (monorepoInfo.changedPackages.length > 1) {
      const sorted = [...monorepoInfo.changedPackages].sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      this.logger.warn(
        `Multiple packages changed, automatically selecting: ${sorted[0].name}`
      );

      return {
        packageNames: [sorted[0].name],
        automatic: true,
      };
    }

    // No changes detected, use first package
    if (monorepoInfo.packages.length > 0) {
      this.logger.warn(
        `No changes detected, using first package: ${monorepoInfo.packages[0].name}`
      );

      return {
        packageNames: [monorepoInfo.packages[0].name],
        automatic: true,
      };
    }

    // Fallback
    return {
      packageNames: ['package'],
      automatic: true,
    };
  }
}
