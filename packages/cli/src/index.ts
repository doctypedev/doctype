#!/usr/bin/env node

/**
 * Sintesi CLI - Main entry point
 *
 * Commands:
 * - init: Initialize Sintesi configuration for your project
 * - check: Verify documentation is in sync with code
 * - fix: Update documentation when drift is detected (with AI-powered generation)
 * - generate: Generate documentation content using AI
 * - changeset: Generate changesets from code changes using AI
 *
 * Now with AI-powered documentation generation using OpenAI, Gemini, Anthropic, or Mistral APIs
 */

// Load environment variables from .env file
import 'dotenv/config';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { checkCommand } from './commands/check';
import { fixCommand } from './commands/fix';
import { generateCommand } from './commands/generate';
import { initCommand } from './commands/init';
import { changesetCommand } from './commands/changeset';
import { readmeCommand, ReadmeOptions } from './commands/readme';
import { CheckOptions, FixOptions, GenerateOptions, InitOptions, ChangesetOptions } from './types';

// Parse command line arguments
yargs(hideBin(process.argv))
  .scriptName('sintesi')
  .usage('$0 <command> [options]')
  .version('0.1.0')
  .alias('v', 'version')
  .alias('h', 'help')

  // Init command
  .command(
    'init',
    'Initialize Sintesi configuration for your project',
    (yargs) => {
      return yargs.option('verbose', {
        type: 'boolean',
        description: 'Enable verbose logging',
        default: false,
      });
    },
    async (argv) => {
      const options: InitOptions = {
        verbose: argv.verbose as boolean,
      };

      const result = await initCommand(options);

      if (!result.success) {
        process.exit(1);
      }
    }
  )

  // Readme command
  .command(
    'readme',
    'Generate a README.md based on project context',
    (yargs) => {
      return yargs
        .option('output', {
          alias: 'o',
          type: 'string',
          description: 'Output file path (default: README.md)',
        })
        .option('force', {
          alias: 'f',
          type: 'boolean',
          description: 'Overwrite existing file',
          default: false,
        })
        .option('verbose', {
          type: 'boolean',
          description: 'Enable verbose logging',
          default: false,
        });
    },
    async (argv) => {
      const options: ReadmeOptions = {
        output: argv.output as string,
        force: argv.force as boolean,
        verbose: argv.verbose as boolean,
      };

      await readmeCommand(options);
    }
  )

  // Generate command
  .command(
    'generate',
    'Generate documentation content using AI',
    (yargs) => {
      return yargs
        .option('map', {
          alias: 'm',
          type: 'string',
          description: 'Path to sintesi-map.json (overrides config)',
        })
        .option('verbose', {
          type: 'boolean',
          description: 'Enable verbose logging',
          default: false,
        })
        .option('dry-run', {
          alias: 'd',
          type: 'boolean',
          description: 'Preview changes without writing files',
          default: false,
        })
        .option('auto-commit', {
          alias: 'a',
          type: 'boolean',
          description: 'Automatically commit changes with git',
          default: false,
        })
        .option('interactive', {
          alias: 'i',
          type: 'boolean',
          description: 'Prompt before each generation (future feature)',
          default: false,
        })
        .option('no-ai', {
          type: 'boolean',
          description: 'Disable AI-generated content (use placeholder instead)',
          default: false,
        });
    },
    async (argv) => {
      const options: GenerateOptions = {
        map: argv.map as string,
        verbose: argv.verbose as boolean,
        dryRun: argv['dry-run'] as boolean,
        autoCommit: argv['auto-commit'] as boolean,
        interactive: argv.interactive as boolean,
        noAI: argv['no-ai'] as boolean,
      };

      const result = await generateCommand(options);

      // Always exit with error if there's a configuration error
      if (result.configError) {
        process.exit(1);
      }

      // Exit with error code if any generations failed
      if (!result.success) {
        process.exit(1);
      }
    }
  )

  // Check command
  .command(
    'check',
    'Verify documentation is in sync with code',
    (yargs) => {
      return yargs
        .option('map', {
          alias: 'm',
          type: 'string',
          description: 'Path to sintesi-map.json (overrides config)',
        })
        .option('verbose', {
          type: 'boolean',
          description: 'Enable verbose logging',
          default: false,
        })
        .option('strict', {
          type: 'boolean',
          description: 'Exit with error code if drift detected',
          default: true,
        })
        .option('smart', {
          type: 'boolean',
          description: 'Use AI to detect high-level drift (e.g. README updates)',
          default: false,
        })
        .option('base', {
          type: 'string',
          description: 'Base branch for smart check comparison (default: origin/main)',
        });
    },
    async (argv) => {
      const options: CheckOptions = {
        map: argv.map as string,
        verbose: argv.verbose as boolean,
        strict: argv.strict as boolean,
        smart: argv.smart as boolean,
        base: argv.base as string,
      };

      const result = await checkCommand(options);

      // Always exit with error if there's a configuration error
      if (result.configError) {
        process.exit(1);
      }

      // Exit with error code if drift detected and strict mode
      if (!result.success && options.strict) {
        process.exit(1);
      }
    }
  )

  // Fix command
  .command(
    'fix',
    'Update documentation to fix detected drift',
    (yargs) => {
      return yargs
        .option('map', {
          alias: 'm',
          type: 'string',
          description: 'Path to sintesi-map.json (overrides config)',
        })
        .option('verbose', {
          type: 'boolean',
          description: 'Enable verbose logging',
          default: false,
        })
        .option('dry-run', {
          alias: 'd',
          type: 'boolean',
          description: 'Preview changes without writing files',
          default: false,
        })
        .option('auto-commit', {
          alias: 'a',
          type: 'boolean',
          description: 'Automatically commit changes with git',
          default: false,
        })
        .option('interactive', {
          alias: 'i',
          type: 'boolean',
          description: 'Prompt before each fix (future feature)',
          default: false,
        })
        .option('no-ai', {
          type: 'boolean',
          description: 'Disable AI-generated content (use placeholder instead)',
          default: false,
        })
        .option('prune', {
          type: 'boolean',
          description: 'Remove missing entries from the map and markdown',
          default: false,
        });
    },
    async (argv) => {
      const options: FixOptions = {
        map: argv.map as string,
        verbose: argv.verbose as boolean,
        dryRun: argv['dry-run'] as boolean,
        autoCommit: argv['auto-commit'] as boolean,
        interactive: argv.interactive as boolean,
        noAI: argv['no-ai'] as boolean,
        prune: argv.prune as boolean,
      };

      const result = await fixCommand(options);

      // Always exit with error if there's a configuration error
      if (result.configError) {
        process.exit(1);
      }

      // Exit with error code if any fixes failed
      if (!result.success) {
        process.exit(1);
      }
    }
  )

  // Changeset command
  .command(
    'changeset',
    'Generate a changeset file from code changes using AI',
    (yargs) => {
      return yargs
        .option('base-branch', {
          alias: 'b',
          type: 'string',
          description: 'Base branch to compare against',
          default: 'main',
        })
        .option('staged-only', {
          alias: 's',
          type: 'boolean',
          description: 'Only analyze staged changes',
          default: false,
        })
        .option('package-name', {
          alias: 'p',
          type: 'string',
          description: 'Package name for the changeset (auto-detected from package.json if not specified)',
        })
        .option('output-dir', {
          alias: 'o',
          type: 'string',
          description: 'Output directory for changeset',
          default: '.changeset',
        })
        .option('skip-ai', {
          type: 'boolean',
          description: 'Skip AI analysis and use defaults',
          default: false,
        })
        .option('version-type', {
          alias: 't',
          type: 'string',
          description: 'Manually specify version type',
          choices: ['major', 'minor', 'patch'],
        })
        .option('description', {
          alias: 'd',
          type: 'string',
          description: 'Manually specify description',
        })
        .option('verbose', {
          type: 'boolean',
          description: 'Enable verbose logging',
          default: false,
        })
        .option('interactive', {
          alias: 'i',
          type: 'boolean',
          description: 'Force interactive package selection',
          default: false,
        })
        .option('force-fetch', {
          type: 'boolean',
          description: 'Fetch latest changes from remote before analyzing',
          default: false
        });
    },
    async (argv) => {
      const options: ChangesetOptions = {
        baseBranch: argv['base-branch'] as string,
        stagedOnly: argv['staged-only'] as boolean,
        packageName: argv['package-name'] as string,
        outputDir: argv['output-dir'] as string,
        noAI: argv['skip-ai'] as boolean,
        versionType: argv['version-type'] as 'major' | 'minor' | 'patch' | undefined,
        description: argv.description as string | undefined,
        verbose: argv.verbose as boolean,
        interactive: argv.interactive as boolean,
      };

      const result = await changesetCommand(options);

      // Exit with error code if changeset generation failed
      if (!result.success) {
        process.exit(1);
      }
    }
  )

  // Help and examples
  .example('$0 init', 'Initialize Sintesi for your project')
  .example('$0 generate', 'Generate documentation using AI')
  .example('$0 check', 'Check for documentation drift')
  .example('$0 check --verbose', 'Check with detailed output')
  .example('$0 fix', 'Fix detected drift with AI-generated docs')
  .example('$0 fix --dry-run', 'Preview AI-generated docs without writing')
  .example('$0 fix --auto-commit', 'Fix and commit changes automatically')
  .example('$0 fix --no-ai', 'Fix using placeholder content (no AI)')
  .example('$0 fix --verbose', 'Fix with detailed AI generation logs')
  .example('$0 changeset', 'Generate changeset from current changes')
  .example('$0 changeset --base-branch develop', 'Compare against develop branch')
  .example('$0 changeset --staged-only', 'Only analyze staged changes')
  .example('$0 changeset --skip-ai', 'Generate changeset without AI analysis')
  .example('$0 changeset -t minor -d "Add new feature"', 'Manually specify version and description')
  .example('$0 readme', 'Generate README.md for the current project')
  .example('$0 readme --force', 'Force overwrite existing README.md')

  .command(
    '$0',
    'Open interactive menu',
    () => { },
    async () => {
      const { showMainMenu } = await import('./commands/menu');
      await showMainMenu();
    }
  )
  .strict()
  .recommendCommands()
  .showHelpOnFail(true)
  .parse();
