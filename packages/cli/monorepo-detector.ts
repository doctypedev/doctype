/**
 * Monorepo Detection and Package Discovery
 *
 * Automatically detects monorepo structure and finds all packages
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { Logger } from './logger';
import { glob } from 'glob';

/**
 * Package information
 */
export interface PackageInfo {
  /** Package name from package.json */
  name: string;
  /** Absolute path to package directory */
  path: string;
  /** Relative path from repo root */
  relativePath: string;
  /** Package version */
  version: string;
  /** Whether this package has changes in current git diff */
  hasChanges: boolean;
}

/**
 * Monorepo detection result
 */
export interface MonorepoInfo {
  /** Whether this is a monorepo */
  isMonorepo: boolean;
  /** Type of monorepo (pnpm, yarn, lerna, npm) */
  type?: 'pnpm' | 'yarn' | 'lerna' | 'npm';
  /** Root directory of the monorepo */
  root: string;
  /** All packages found */
  packages: PackageInfo[];
  /** Packages with changes */
  changedPackages: PackageInfo[];
}

/**
 * Changeset config structure
 */
interface ChangesetConfig {
  ignore?: string[];
  [key: string]: any;
}

/**
 * Detects monorepo structure and packages
 */
export class MonorepoDetector {
  private logger: Logger;
  private repoRoot: string;

  constructor(logger: Logger, repoRoot: string = process.cwd()) {
    this.logger = logger;
    this.repoRoot = repoRoot;
  }

  /**
   * Detect monorepo and find all packages
   */
  async detect(): Promise<MonorepoInfo> {
    this.logger.debug('Detecting monorepo structure...');

    // Check if we're in a git repository
    if (!this.isGitRepo()) {
      return this.singlePackageResult();
    }

    // Detect monorepo type
    const type = this.detectMonorepoType();

    if (!type) {
      return this.singlePackageResult();
    }

    this.logger.debug(`Detected ${type} monorepo`);

    // Find all packages
    let packages = await this.findPackages(type);

    // Filter out ignored packages
    const ignoreList = this.getIgnoreList();
    if (ignoreList.length > 0) {
      const beforeCount = packages.length;
      packages = this.filterIgnoredPackages(packages, ignoreList);
      const ignoredCount = beforeCount - packages.length;
      if (ignoredCount > 0) {
        this.logger.debug(`Ignored ${ignoredCount} package(s) from .changeset/config.json`);
      }
    }

    if (packages.length <= 1) {
      return this.singlePackageResult();
    }

    // Detect which packages have changes
    const changedPackages = this.detectChangedPackages(packages);

    return {
      isMonorepo: true,
      type,
      root: this.repoRoot,
      packages,
      changedPackages,
    };
  }

  /**
   * Check if current directory is a git repository
   */
  private isGitRepo(): boolean {
    try {
      execSync('git rev-parse --git-dir', { stdio: 'pipe', cwd: this.repoRoot });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Detect type of monorepo
   */
  private detectMonorepoType(): 'pnpm' | 'yarn' | 'lerna' | 'npm' | null {
    // Check for pnpm-workspace.yaml
    if (fs.existsSync(path.join(this.repoRoot, 'pnpm-workspace.yaml'))) {
      return 'pnpm';
    }

    // Check for lerna.json
    if (fs.existsSync(path.join(this.repoRoot, 'lerna.json'))) {
      return 'lerna';
    }

    // Check for yarn workspaces
    const rootPackageJson = this.readPackageJson(this.repoRoot);
    if (rootPackageJson?.workspaces) {
      // Yarn or npm workspaces
      if (fs.existsSync(path.join(this.repoRoot, 'yarn.lock'))) {
        return 'yarn';
      }
      return 'npm';
    }

    return null;
  }

  /**
   * Find all packages in the monorepo
   */
  private async findPackages(type: 'pnpm' | 'yarn' | 'lerna' | 'npm'): Promise<PackageInfo[]> {
    const patterns = this.getWorkspacePatterns(type);
    const packages: PackageInfo[] = [];

    for (const pattern of patterns) {
      const packageJsonPaths = await glob(pattern, {
        cwd: this.repoRoot,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
      });

      for (const pkgJsonPath of packageJsonPaths) {
        const packageDir = path.dirname(pkgJsonPath);
        const pkgJson = this.readPackageJson(packageDir);

        if (pkgJson?.name) {
          packages.push({
            name: pkgJson.name,
            path: packageDir,
            relativePath: path.relative(this.repoRoot, packageDir),
            version: pkgJson.version || '0.0.0',
            hasChanges: false, // Will be set later
          });
        }
      }
    }

    this.logger.debug(`Found ${packages.length} packages`);
    return packages;
  }

  /**
   * Get workspace patterns based on monorepo type
   */
  private getWorkspacePatterns(type: 'pnpm' | 'yarn' | 'lerna' | 'npm'): string[] {
    switch (type) {
      case 'pnpm': {
        const workspaceFile = path.join(this.repoRoot, 'pnpm-workspace.yaml');
        const content = fs.readFileSync(workspaceFile, 'utf-8');
        // Simple YAML parsing for packages array
        const match = content.match(/packages:\s*\n((?:\s+-\s+.+\n?)+)/);
        if (match) {
          return match[1]
            .split('\n')
            .map(line => line.trim().replace(/^-\s+['"]?(.+?)['"]?$/, '$1'))
            .filter(Boolean)
            .map(p => `${p}/package.json`);
        }
        return ['packages/*/package.json'];
      }

      case 'lerna': {
        const lernaJson = JSON.parse(
          fs.readFileSync(path.join(this.repoRoot, 'lerna.json'), 'utf-8')
        );
        const patterns = lernaJson.packages || ['packages/*'];
        return patterns.map((p: string) => `${p}/package.json`);
      }

      case 'yarn':
      case 'npm': {
        const rootPkg = this.readPackageJson(this.repoRoot);
        const workspaces = Array.isArray(rootPkg?.workspaces)
          ? rootPkg.workspaces
          : rootPkg?.workspaces?.packages || [];
        return workspaces.map((p: string) => `${p}/package.json`);
      }

      default:
        return ['packages/*/package.json'];
    }
  }

  /**
   * Detect which packages have git changes
   */
  private detectChangedPackages(packages: PackageInfo[]): PackageInfo[] {
    try {
      // Get all changed files from git diff
      const changedFiles = execSync('git diff --name-only main...HEAD', {
        encoding: 'utf-8',
        cwd: this.repoRoot,
      })
        .split('\n')
        .filter(Boolean);

      this.logger.debug(`Found ${changedFiles.length} changed files`);

      // Map changed files to packages
      const changedPackages: PackageInfo[] = [];

      for (const pkg of packages) {
        const hasChanges = changedFiles.some(file => {
          const absolutePath = path.join(this.repoRoot, file);
          return absolutePath.startsWith(pkg.path + path.sep);
        });

        if (hasChanges) {
          pkg.hasChanges = true;
          changedPackages.push(pkg);
        }
      }

      this.logger.debug(`Found ${changedPackages.length} packages with changes`);
      return changedPackages;
    } catch (error) {
      this.logger.warn('Failed to detect changed packages:', error);
      return [];
    }
  }

  /**
   * Read package.json from a directory
   */
  private readPackageJson(dir: string): any {
    try {
      const pkgJsonPath = path.join(dir, 'package.json');
      if (fs.existsSync(pkgJsonPath)) {
        return JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      }
    } catch {
      // Ignore errors
    }
    return null;
  }

  /**
   * Return result for single package (non-monorepo)
   */
  private singlePackageResult(): MonorepoInfo {
    const pkgJson = this.readPackageJson(this.repoRoot);

    const packages: PackageInfo[] = pkgJson?.name
      ? [{
          name: pkgJson.name,
          path: this.repoRoot,
          relativePath: '.',
          version: pkgJson.version || '0.0.0',
          hasChanges: true,
        }]
      : [];

    return {
      isMonorepo: false,
      root: this.repoRoot,
      packages,
      changedPackages: packages,
    };
  }

  /**
   * Read ignore list from .changeset/config.json
   */
  private getIgnoreList(): string[] {
    try {
      const configPath = path.join(this.repoRoot, '.changeset', 'config.json');
      if (!fs.existsSync(configPath)) {
        return [];
      }

      const config: ChangesetConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return config.ignore || [];
    } catch (error) {
      this.logger.debug('Failed to read .changeset/config.json:', error);
      return [];
    }
  }

  /**
   * Filter out packages that match ignore patterns
   */
  private filterIgnoredPackages(packages: PackageInfo[], ignoreList: string[]): PackageInfo[] {
    if (ignoreList.length === 0) {
      return packages;
    }

    return packages.filter(pkg => {
      // Check if package name matches any ignore pattern
      const isIgnored = ignoreList.some(pattern => {
        // Support wildcards (* and **)
        if (pattern.includes('*')) {
          const regexPattern = pattern
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
          const regex = new RegExp(`^${regexPattern}$`);
          return regex.test(pkg.name);
        }

        // Exact match
        return pkg.name === pattern;
      });

      if (isIgnored) {
        this.logger.debug(`Ignoring package: ${pkg.name}`);
      }

      return !isIgnored;
    });
  }
}
