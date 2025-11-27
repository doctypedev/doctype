/**
 * Init Command - Interactive setup for Doctype configuration
 *
 * Creates a doctype.config.json file with user-provided settings:
 * - Project name
 * - Project root directory
 * - Documentation folder
 * - Map file name
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { InitOptions, InitResult, DoctypeConfig } from './types';
import { Logger } from './logger';

/**
 * Create readline interface for interactive prompts
 */
function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt the user for input with a default value
 */
function question(
  rl: readline.Interface,
  query: string,
  defaultValue?: string
): Promise<string> {
  return new Promise((resolve) => {
    const promptText = defaultValue
      ? `${query} (default: ${defaultValue}): `
      : `${query}: `;

    rl.question(promptText, (answer) => {
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

/**
 * Execute the init command
 */
export async function initCommand(
  options: InitOptions = {}
): Promise<InitResult> {
  const logger = new Logger(options.verbose || false);
  let rl: readline.Interface | undefined;

  try {
    rl = createInterface();

    // Display banner
    logger.banner('🚀 DOCTYPE INITIALIZATION 🚀');
    logger.info('This wizard will help you set up Doctype for your project.');
    logger.divider();

    // Check if config already exists
    const configPath = path.join(process.cwd(), 'doctype.config.json');
    if (fs.existsSync(configPath)) {
      logger.warn('⚠️  doctype.config.json already exists!');
      const overwrite = await question(
        rl,
        'Do you want to overwrite it? (yes/no)',
        'no'
      );

      if (overwrite.toLowerCase() !== 'yes' && overwrite.toLowerCase() !== 'y') {
        rl.close();
        logger.info('Initialization cancelled.');
        return {
          success: false,
          error: 'Configuration file already exists',
        };
      }
      logger.info('');
    }

    // Prompt 1: Project name
    logger.step(1, 5, 'Project Information', '📝');
    const projectName = await question(
      rl,
      `${Logger.color('What is your project name?', 'cyan')}`,
      path.basename(process.cwd())
    );

    // Prompt 2: Project root
    logger.step(2, 5, 'Project Structure', '📁');
    const projectRoot = await question(
      rl,
      `${Logger.color('Where is your project root directory?', 'cyan')}`,
      '.'
    );

    // Prompt 3: Documentation folder
    logger.step(3, 5, 'Documentation Location', '📚');
    const docsFolder = await question(
      rl,
      `${Logger.color('Where do you want to store documentation?', 'cyan')}`,
      './docs'
    );

    // Prompt 4: Map file name
    logger.step(4, 5, 'Map File Configuration', '🗺️');
    const mapFile = await question(
      rl,
      `${Logger.color('What should the map file be called?', 'cyan')}`,
      'doctype-map.json'
    );

    // Prompt 5: OpenAI API Key
    logger.step(5, 5, 'OpenAI API Key', '🔑');
    logger.info(`${Logger.color('💡', 'yellow')} Your API key will be saved securely in a local .env file`);

    // Check if OPENAI_API_KEY already exists in .env
    const envPath = path.join(process.cwd(), '.env');
    let existingApiKey: string | null = null;

    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(/OPENAI_API_KEY=(.+)/);
      if (match) {
        existingApiKey = match[1].trim();
      }
    }

    let apiKey = '';

    if (existingApiKey) {
      logger.warn(`An API key already exists: ${Logger.color(existingApiKey.substring(0, 10) + '...', 'gray')}`);
      const overwriteKey = await question(
        rl,
        `${Logger.color('Do you want to replace it?', 'cyan')} (yes/no)`,
        'no'
      );

      if (overwriteKey.toLowerCase() === 'yes' || overwriteKey.toLowerCase() === 'y') {
        apiKey = await question(
          rl,
          `${Logger.color('Enter your new OpenAI API key:', 'cyan')}`
        );
      } else {
        logger.success('Keeping existing API key.');
        apiKey = existingApiKey; // Keep the existing key
      }
    } else {
      apiKey = await question(
        rl,
        `${Logger.color('Enter your OpenAI API key', 'cyan')} ${Logger.color('(leave empty to skip)', 'gray')}`
      );
    }

    rl.close();

    // Create configuration object
    const config: DoctypeConfig = {
      projectName,
      projectRoot,
      docsFolder,
      mapFile,
    };

    // Validate paths
    const fullProjectRoot = path.resolve(process.cwd(), projectRoot);
    if (!fs.existsSync(fullProjectRoot)) {
      logger.warn(`⚠️  Project root does not exist: ${fullProjectRoot}`);
      logger.warn('Creating directory...');
      fs.mkdirSync(fullProjectRoot, { recursive: true });
    }

    // Save configuration
    fs.writeFileSync(
      configPath,
      JSON.stringify(config, null, 2) + '\n',
      'utf-8'
    );

    logger.success('✅ Configuration saved to doctype.config.json');

    // Save API key to .env file if provided
    if (apiKey) {
      let envContent = '';

      // Read existing .env file if it exists
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');

        // Check if OPENAI_API_KEY already exists
        if (envContent.includes('OPENAI_API_KEY=')) {
          // Replace existing key
          envContent = envContent.replace(
            /OPENAI_API_KEY=.*/,
            `OPENAI_API_KEY=${apiKey}`
          );
        } else {
          // Append new key
          if (!envContent.endsWith('\n')) {
            envContent += '\n';
          }
          envContent += `OPENAI_API_KEY=${apiKey}\n`;
        }
      } else {
        // Create new .env file
        envContent = `OPENAI_API_KEY=${apiKey}\n`;
      }

      fs.writeFileSync(envPath, envContent, 'utf-8');
      logger.success('✅ API key saved to .env file');
    }

    logger.newline();
    logger.divider();

    // Configuration Summary
    const summaryLines = [
      `${Logger.color('Project Name:', 'cyan')}  ${Logger.bold(projectName)}`,
      `${Logger.color('Project Root:', 'cyan')}  ${projectRoot}`,
      `${Logger.color('Docs Folder:', 'cyan')}   ${docsFolder}`,
      `${Logger.color('Map File:', 'cyan')}      ${mapFile}`,
    ];

    if (apiKey) {
      summaryLines.push(
        `${Logger.color('API Key:', 'cyan')}       ${Logger.color('*'.repeat(Math.min(apiKey.length, 20)), 'gray')}`
      );
    }

    logger.box('📋 Configuration Summary', summaryLines);

    logger.newline();
    logger.header('🎯 Next Steps');
    logger.listItem('Create your documentation in the docs folder');
    logger.listItem('Add doctype anchors to your markdown files');
    logger.listItem('Run "doctype check" to verify documentation');
    logger.newline();

    return {
      success: true,
      configPath,
    };
  } catch (error) {
    if (rl) {
      rl.close();
    }
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to initialize: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
    };
  }
}
