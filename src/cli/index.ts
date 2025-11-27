#!/usr/bin/env node

/**
 * Doctype CLI - Main entry point
 *
 * Commands:
 * - check: Verify documentation is in sync with code
 * - fix: Update documentation when drift is detected (with AI-powered generation)
 *
 * Phase 4: Now with AI-powered documentation generation using OpenAI or Gemini APIs
 */

// Load environment variables from .env file
import 'dotenv/config';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { checkCommand } from './check';
import { fixCommand } from './fix';
import { CheckOptions, FixOptions } from './types';

// Parse command line arguments
yargs(hideBin(process.argv))
  .scriptName('doctype')
  .usage('$0 <command> [options]')
  .version('0.1.0')
  .alias('v', 'version')
  .alias('h', 'help')

  // Check command
  .command(
    'check',
    'Verify documentation is in sync with code',
    (yargs) => {
      return yargs
        .option('map', {
          alias: 'm',
          type: 'string',
          description: 'Path to doctype-map.json',
          default: './doctype-map.json',
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
        });
    },
    async (argv) => {
      const options: CheckOptions = {
        map: argv.map as string,
        verbose: argv.verbose as boolean,
        strict: argv.strict as boolean,
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
          description: 'Path to doctype-map.json',
          default: './doctype-map.json',
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

  // Help and examples
  .example('$0 check', 'Check for documentation drift')
  .example('$0 check --verbose', 'Check with detailed output')
  .example('$0 fix', 'Fix detected drift with AI-generated docs')
  .example('$0 fix --dry-run', 'Preview AI-generated docs without writing')
  .example('$0 fix --auto-commit', 'Fix and commit changes automatically')
  .example('$0 fix --no-ai', 'Fix using placeholder content (no AI)')
  .example('$0 fix --verbose', 'Fix with detailed AI generation logs')

  .demandCommand(1, 'You must provide a command (check or fix)')
  .strict()
  .recommendCommands()
  .showHelpOnFail(true)
  .parse();
