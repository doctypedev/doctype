/**
 * Init Command - Interactive setup for Doctype configuration
 *
 * Creates a doctype.config.json file with user-provided settings:
 * - Project name
 * - Project root directory
 * - Documentation folder
 * - Map file name
 *
 * After creating the configuration, automatically:
 * - Scans all TypeScript files in the project root
 * - Extracts exported symbols (functions, classes, interfaces, etc.)
 * - Creates documentation anchors in api.md
 * - Generates doctype-map.json with code signatures and hash tracking
 */

import * as fs from 'fs';
import * as path from 'path';
import * as p from '@clack/prompts';
import { InitOptions, InitResult, DoctypeConfig } from './types';
import { scanAndCreateAnchors, OutputStrategy } from './init-orchestrator';

/**
 * Execute the init command
 */
export async function initCommand(
  _options: InitOptions = {}
): Promise<InitResult> {
  try {
    // Display intro
    p.intro('🚀 DOCTYPE INITIALIZATION');

    // Check if config already exists
    const configPath = path.join(process.cwd(), 'doctype.config.json');
    if (fs.existsSync(configPath)) {
      const overwrite = await p.confirm({
        message: '⚠️  doctype.config.json already exists. Do you want to overwrite it?',
        initialValue: false,
      });

      if (p.isCancel(overwrite) || !overwrite) {
        p.cancel('Initialization cancelled.');
        return {
          success: false,
          error: 'Configuration file already exists',
        };
      }
    }

    // Prompt 1: Project name
    const projectName = await p.text({
      message: 'What is your project name?',
      placeholder: path.basename(process.cwd()),
      defaultValue: path.basename(process.cwd()),
    });

    if (p.isCancel(projectName)) {
      p.cancel('Initialization cancelled.');
      return { success: false, error: 'Cancelled by user' };
    }

    // Prompt 2: Project root
    const projectRoot = await p.text({
      message: 'Where is your project root directory?',
      placeholder: '.',
      defaultValue: '.',
    });

    if (p.isCancel(projectRoot)) {
      p.cancel('Initialization cancelled.');
      return { success: false, error: 'Cancelled by user' };
    }

    // Prompt 3: Documentation folder
    const docsFolder = await p.text({
      message: 'Where do you want to store documentation?',
      placeholder: './docs',
      defaultValue: './docs',
    });

    if (p.isCancel(docsFolder)) {
      p.cancel('Initialization cancelled.');
      return { success: false, error: 'Cancelled by user' };
    }

    // Prompt 4: Map file name
    const mapFile = await p.text({
      message: 'What should the map file be called?',
      placeholder: 'doctype-map.json',
      defaultValue: 'doctype-map.json',
    });

    if (p.isCancel(mapFile)) {
      p.cancel('Initialization cancelled.');
      return { success: false, error: 'Cancelled by user' };
    }

    // Prompt 5: Output Strategy
    const outputStrategy = await p.select({
      message: 'How should documentation files be structured?',
      options: [
        { value: 'mirror', label: 'Mirror Source Structure (e.g. src/auth/login.ts → docs/src/auth/login.md)' },
        { value: 'module', label: 'Module/Folder Based (e.g. src/auth/* → docs/src/auth.md)' },
        { value: 'type', label: 'Symbol Type Based (e.g. All Functions → docs/functions.md)' },
      ],
      initialValue: 'mirror',
    });

    if (p.isCancel(outputStrategy)) {
      p.cancel('Initialization cancelled.');
      return { success: false, error: 'Cancelled by user' };
    }

    // Create configuration object
    const config: DoctypeConfig = {
      projectName: projectName as string,
      projectRoot: projectRoot as string,
      docsFolder: docsFolder as string,
      mapFile: mapFile as string,
      outputStrategy: outputStrategy as OutputStrategy,
    };

    // Create spinner for file operations
    const s = p.spinner();

    // Validate and create project root
    s.start('Validating project structure...');
    const fullProjectRoot = path.resolve(process.cwd(), config.projectRoot);
    if (!fs.existsSync(fullProjectRoot)) {
      fs.mkdirSync(fullProjectRoot, { recursive: true });
      s.message(`Created directory: ${fullProjectRoot}`);
    }

    // Save configuration
    s.message('Saving configuration...');
    fs.writeFileSync(
      configPath,
      JSON.stringify(config, null, 2) + '\n',
      'utf-8'
    );

    s.stop('✅ Configuration complete!');

    // Scan code and create anchors
    const s2 = p.spinner();
    s2.start('Scanning codebase and creating documentation anchors...');

    try {
      const result = await scanAndCreateAnchors(
        {
          projectRoot: config.projectRoot,
          docsFolder: config.docsFolder,
          mapFile: config.mapFile,
          outputStrategy: config.outputStrategy,
        },
        (message) => s2.message(message)
      );

      if (result.anchorsCreated > 0) {
        s2.stop(`✅ Created ${result.anchorsCreated} documentation anchors in ${result.filesCreated} files`);
      } else {
        s2.stop('ℹ️  No new symbols to document');
      }

      if (result.errors.length > 0) {
        p.note(result.errors.join('\n'), '⚠️  Warnings');
      }
    } catch (error) {
      s2.stop('⚠️  Failed to scan codebase');
      p.note(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
        '⚠️  Warning'
      );
    }

    // Display summary
    p.note(
      [
        `Project Name: ${config.projectName}`,
        `Project Root: ${config.projectRoot}`,
        `Docs Folder:  ${config.docsFolder}`,
        `Map File:     ${config.mapFile}`,
      ]
        .filter(Boolean)
        .join('\n'),
      '📋 Configuration Summary'
    );

    // Next steps
    p.note(
      [
        '✓ Configuration saved',
        '✓ Documentation anchors created',
        '✓ Map file initialized',
        '',
        'Next steps:',
        '• Run "doctype generate" to generate documentation content using AI',
        '• Run "doctype check" to verify documentation is in sync',
      ].join('\n'),
      '🎯 Status'
    );

    p.outro('🎉 Doctype has been successfully initialized!');

    return {
      success: true,
      configPath,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    p.cancel(`Failed to initialize: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}