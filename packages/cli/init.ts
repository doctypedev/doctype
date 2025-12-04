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
import { InitOptions, InitResult, DoctypeConfig, AIProvider } from './types';

const AI_PROVIDERS: { value: AIProvider; label: string; hint?: string }[] = [
  { value: 'openai', label: 'OpenAI', hint: 'OPENAI_API_KEY' },
  { value: 'gemini', label: 'Google Gemini', hint: 'GEMINI_API_KEY' },
  { value: 'anthropic', label: 'Anthropic', hint: 'ANTHROPIC_API_KEY' },
  { value: 'mistral', label: 'Mistral AI', hint: 'MISTRAL_API_KEY' },
];
import { scanAndCreateAnchors, OutputStrategy } from './init-orchestrator';


/**
 * Add a line to .gitignore if not already present
 */
function addToGitignore(line: string): void {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  let gitignoreContent = '';

  // Read existing .gitignore if it exists
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
  }

  // Check if line already exists
  if (gitignoreContent.split('\n').includes(line)) {
    return; // Already present
  }

  // Add the line
  if (gitignoreContent && !gitignoreContent.endsWith('\n')) {
    gitignoreContent += '\n';
  }
  gitignoreContent += `${line}\n`;

  // Write back
  fs.writeFileSync(gitignorePath, gitignoreContent, 'utf-8');
}


function getApiKeyEnvVarName(provider: AIProvider): string {
  switch (provider) {
    case 'openai':
      return 'OPENAI_API_KEY';
    case 'gemini':
      return 'GEMINI_API_KEY';
    case 'anthropic':
      return 'ANTHROPIC_API_KEY';
    case 'mistral':
      return 'MISTRAL_API_KEY';
    default:
      return 'OPENAI_API_KEY'; // Default to OpenAI
  }
}

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

    // Prompt for AI Provider
    const aiProviderSelection = await p.select({
      message: 'Which AI provider would you like to use?',
      options: AI_PROVIDERS,
      initialValue: 'openai',
    });

    if (p.isCancel(aiProviderSelection)) {
      p.cancel('Initialization cancelled.');
      return { success: false, error: 'Cancelled by user' };
    }

    const aiProvider: AIProvider = aiProviderSelection as AIProvider;

    const envPath = path.join(process.cwd(), '.env');
    const apiKeyEnvVarName = getApiKeyEnvVarName(aiProvider);
    let existingApiKey: string | null = null;
    let apiKey = '';

    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(new RegExp(`${apiKeyEnvVarName}=(.+)`));
      if (match) {
        existingApiKey = match[1].trim();
      }
    }

    if (existingApiKey) {
      p.note(
        `Existing key: ${existingApiKey.substring(0, 10)}...`,
        '🔑 API Key detected'
      );

      const replaceKey = await p.confirm({
        message: `Do you want to replace the existing ${apiKeyEnvVarName} in your .env file?`,
        initialValue: false,
      });

      if (p.isCancel(replaceKey)) {
        p.cancel('Initialization cancelled.');
        return { success: false, error: 'Cancelled by user' };
      }

      if (replaceKey) {
        const newApiKey = await p.password({
          message: `Enter your new ${aiProvider} API key (for ${apiKeyEnvVarName}):`,
        });

        if (p.isCancel(newApiKey)) {
          p.cancel('Initialization cancelled.');
          return { success: false, error: 'Cancelled by user' };
        }

        apiKey = newApiKey as string;
      } else {
        apiKey = existingApiKey;
      }
    } else {
      p.note(
        `Your ${aiProvider} API key will be saved securely in a local .env file as ${apiKeyEnvVarName}`,
        `🔑 ${aiProvider} API Key`
      );

      const newApiKey = await p.password({
        message: `Enter your ${aiProvider} API key (for ${apiKeyEnvVarName}, optional, press Enter to skip):`,
      });

      if (p.isCancel(newApiKey)) {
        p.cancel('Initialization cancelled.');
        return { success: false, error: 'Cancelled by user' };
      }

      apiKey = (newApiKey as string) || '';
    }

    // Create configuration object
    const config: DoctypeConfig = {
      projectName: projectName as string,
      projectRoot: projectRoot as string,
      docsFolder: docsFolder as string,
      mapFile: mapFile as string,
      outputStrategy: outputStrategy as OutputStrategy,
      aiProvider: aiProvider as AIProvider,
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

    if (apiKey) {
      s.message(`Saving ${apiKeyEnvVarName} to .env...`);
      let envContent = '';

      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');

        // Remove old entry for this API key if it exists
        envContent = envContent.replace(new RegExp(`^${apiKeyEnvVarName}=.*\\n?`, 'gm'), '');
        // Ensure there's a newline if content isn't empty and doesn't end with one
        if (envContent && !envContent.endsWith('\n')) {
          envContent += '\n';
        }
      }

      // Add the new API key entry
      envContent += `${apiKeyEnvVarName}=${apiKey}\n`;

      fs.writeFileSync(envPath, envContent, 'utf-8');

      // Add .env to .gitignore for security
      s.message('Protecting .env in .gitignore...');
      addToGitignore('.env');
    }

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
        `AI Provider:  ${config.aiProvider}`,
        apiKey ? `API Key Env Var: ${apiKeyEnvVarName}` : '',
        apiKey ? `API Key Value: ${'*'.repeat(20)}` : '',
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
        `• Make sure your ${aiProvider} API key is set in your .env file as ${apiKeyEnvVarName} if not already provided.`,
        '• Review and edit generated documentation files to add documentation',
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
