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
import { InitOptions, InitResult, DoctypeConfig, OutputStrategy } from './types';
import { ASTAnalyzer } from '../core/ast-analyzer';
import { SignatureHasher } from '../core/signature-hasher';
import { DoctypeMapManager } from '../content/map-manager';
import { MarkdownAnchorInserter } from '../content/markdown-anchor-inserter';
import { DoctypeMapEntry, SymbolType } from '../core/types';

/**
 * Recursively find all TypeScript files in a directory
 */
function findTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, dist, and other build directories
      if (!['node_modules', 'dist', 'build', '.git', 'coverage', '.swc', '.idea', '.vscode', '.next'].includes(file)) {
        findTypeScriptFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.spec.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Determine the output file path based on strategy and symbol
 */
export function determineOutputFile(
  strategy: OutputStrategy,
  docsFolder: string,
  filePath: string,
  symbolType: SymbolType
): string {
  // Default to mirror if undefined
  const effectiveStrategy = strategy || 'mirror';

  if (effectiveStrategy === 'mirror') {
    // src/auth/login.ts -> docs/src/auth/login.md
    // We keep the full path structure to avoid collisions
    // If filePath is "src/auth/login.ts", we want "docs/src/auth/login.md"
    const parsed = path.parse(filePath);
    const dirPath = path.join(docsFolder, parsed.dir);
    return path.join(dirPath, `${parsed.name}.md`);
  }

  if (effectiveStrategy === 'module') {
    // src/auth/login.ts -> docs/src/auth.md
    // src/index.ts -> docs/src.md
    const dir = path.dirname(filePath);
    // If file is at root (e.g. index.ts), dir is "."
    if (dir === '.' || dir === '') {
      return path.join(docsFolder, 'index.md');
    }
    return path.join(docsFolder, `${dir}.md`);
  }

  if (effectiveStrategy === 'type') {
    switch (symbolType) {
      case SymbolType.CLASS:
        return path.join(docsFolder, 'classes.md');
      case SymbolType.FUNCTION:
        return path.join(docsFolder, 'functions.md');
      case SymbolType.INTERFACE:
        return path.join(docsFolder, 'interfaces.md');
      case SymbolType.TYPE_ALIAS:
      case SymbolType.ENUM:
        return path.join(docsFolder, 'types.md');
      case SymbolType.VARIABLE:
      case SymbolType.CONST:
        return path.join(docsFolder, 'variables.md');
      default:
        return path.join(docsFolder, 'api.md');
    }
  }

  return path.join(docsFolder, 'api.md');
}

/**
 * Scan code and create anchors in markdown files
 */
async function scanAndCreateAnchors(config: DoctypeConfig, spinner: { message: (msg: string) => void }): Promise<number> {
  const projectRoot = path.resolve(process.cwd(), config.projectRoot);
  const docsFolder = path.resolve(process.cwd(), config.docsFolder);
  const mapFilePath = path.resolve(process.cwd(), config.mapFile);

  // Ensure docs folder exists
  if (!fs.existsSync(docsFolder)) {
    fs.mkdirSync(docsFolder, { recursive: true });
  }

  // Initialize modules
  const analyzer = new ASTAnalyzer();
  const hasher = new SignatureHasher();
  const mapManager = new DoctypeMapManager(mapFilePath);
  const anchorInserter = new MarkdownAnchorInserter();

  // Find all TypeScript files
  spinner.message('Scanning TypeScript files...');
  const tsFiles = findTypeScriptFiles(projectRoot);

  if (tsFiles.length === 0) {
    spinner.message('No TypeScript files found.');
    return 0;
  }

  spinner.message(`Found ${tsFiles.length} TypeScript files. Analyzing...`);

  // Collect all symbols
  const symbolsToDocument: Array<{
    filePath: string;
    symbolName: string;
    symbolType: SymbolType;
    signatureText: string;
    hash: string;
    targetDocFile: string;
  }> = [];

  for (const tsFile of tsFiles) {
    try {
      const signatures = await analyzer.analyzeFile(tsFile);
      // Normalize path to use forward slashes on all platforms
      const relativePath = path.relative(projectRoot, tsFile).split(path.sep).join('/');

      for (const signature of signatures) {
        if (signature.isExported) {
          const hashResult = hasher.hash(signature);
          
          const targetDocFile = determineOutputFile(
             config.outputStrategy || 'mirror', 
             docsFolder,
             relativePath,
             signature.symbolType
          );

          symbolsToDocument.push({
            filePath: relativePath,
            symbolName: signature.symbolName,
            symbolType: signature.symbolType,
            signatureText: signature.signatureText,
            hash: hashResult.hash,
            targetDocFile
          });
        }
      }
    } catch (error) {
      spinner.message(`Warning: Could not analyze ${tsFile}`);
    }
  }

  if (symbolsToDocument.length === 0) {
    spinner.message('No exported symbols found.');
    return 0;
  }

  spinner.message(`Found ${symbolsToDocument.length} exported symbols. Grouping by file...`);

  // Group by target document
  const symbolsByDoc = new Map<string, typeof symbolsToDocument>();
  for (const sym of symbolsToDocument) {
    if (!symbolsByDoc.has(sym.targetDocFile)) {
      symbolsByDoc.set(sym.targetDocFile, []);
    }
    symbolsByDoc.get(sym.targetDocFile)!.push(sym);
  }

  let totalInserted = 0;

  // Process each document file
  for (const [docPath, symbols] of symbolsByDoc.entries()) {
    let docContent = '';
    let isNewFile = false;

    // Ensure directory exists for this doc file
    const docDir = path.dirname(docPath);
    if (!fs.existsSync(docDir)) {
        fs.mkdirSync(docDir, { recursive: true });
    }

    if (fs.existsSync(docPath)) {
      docContent = fs.readFileSync(docPath, 'utf-8');
    } else {
      const title = generateMarkdownTitle(docPath);
      docContent = `# ${title}\n\nAuto-generated documentation via Doctype.\n\n`;
      isNewFile = true;
    }

    const existingCodeRefs = anchorInserter.getExistingCodeRefs(docContent);
    const existingSet = new Set(existingCodeRefs);
    let hasChanges = false;

    for (const symbol of symbols) {
      const codeRef = `${symbol.filePath}#${symbol.symbolName}`;

      if (existingSet.has(codeRef)) {
        continue;
      }

      const result = anchorInserter.insertIntoContent(docContent, codeRef, {
        createSection: true,
        placeholder: 'TODO: Add documentation for this symbol',
      });

      if (result.success) {
        docContent = result.content;
        hasChanges = true;

        const mapEntry: DoctypeMapEntry = {
          id: result.anchorId,
          codeRef: {
            filePath: symbol.filePath,
            symbolName: symbol.symbolName,
          },
          codeSignatureHash: symbol.hash,
          codeSignatureText: symbol.signatureText,
          docRef: {
            filePath: path.relative(process.cwd(), docPath),
            startLine: result.location.startLine,
            endLine: result.location.endLine,
          },
          originalMarkdownContent: `<!-- TODO: Add documentation for this symbol -->`,
          lastUpdated: Date.now(),
        };

        mapManager.addEntry(mapEntry);
        totalInserted++;
      }
    }

    if (isNewFile || hasChanges) {
      fs.writeFileSync(docPath, docContent, 'utf-8');
    }
  }

  mapManager.save();
  return totalInserted;
}

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

/**
 * Generates a meaningful H1 title for a new Markdown documentation file based on its filename.
 * @param docPath The full path to the new documentation file.
 * @returns A capitalized title for the Markdown file.
 */
function generateMarkdownTitle(docPath: string): string {
  const basename = path.basename(docPath, '.md');

  if (basename === 'index' || basename === 'api') {
    return 'API Reference';
  }

  // Capitalize the first letter
  return basename.charAt(0).toUpperCase() + basename.slice(1);
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

    // Prompt 6: OpenAI API Key
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
      p.note(
        `Existing key: ${existingApiKey.substring(0, 10)}...`,
        '🔑 API Key detected'
      );

      const replaceKey = await p.confirm({
        message: 'Do you want to replace the existing API key?',
        initialValue: false,
      });

      if (p.isCancel(replaceKey)) {
        p.cancel('Initialization cancelled.');
        return { success: false, error: 'Cancelled by user' };
      }

      if (replaceKey) {
        const newApiKey = await p.password({
          message: 'Enter your new OpenAI API key:',
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
        'Your API key will be saved securely in a local .env file',
        '🔑 OpenAI API Key'
      );

      const newApiKey = await p.password({
        message: 'Enter your OpenAI API key (optional, press Enter to skip):',
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

    // Save API key to .env file if provided
    if (apiKey) {
      s.message('Saving API key to .env...');
      let envContent = '';

      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');

        if (envContent.includes('OPENAI_API_KEY=')) {
          envContent = envContent.replace(
            /OPENAI_API_KEY=.*/,
            `OPENAI_API_KEY=${apiKey}`
          );
        } else {
          if (!envContent.endsWith('\n')) {
            envContent += '\n';
          }
          envContent += `OPENAI_API_KEY=${apiKey}\n`;
        }
      } else {
        envContent = `OPENAI_API_KEY=${apiKey}\n`;
      }

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
      const insertedCount = await scanAndCreateAnchors(config, s2);

      if (insertedCount > 0) {
        s2.stop(`✅ Created ${insertedCount} documentation anchors in documentation files`);
      } else {
        s2.stop('ℹ️  No new symbols to document');
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
        apiKey ? `API Key:      ${'*'.repeat(20)}` : '',
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
