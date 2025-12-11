/**
 * CLI command: documentation
 *
 * Generates a full documentation site structure based on the project context.
 */

import { Logger } from '../utils/logger';
import { createAgentFromEnv } from '../../../ai';
import { getProjectContext, ProjectContext } from '@sintesi/core';
import { resolve, join, dirname, relative } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { spinner } from '@clack/prompts';
import { ChangeAnalysisService } from '../services/analysis-service';
import { pMap } from '../utils/concurrency';

export interface DocumentationOptions {
  outputDir?: string;
  verbose?: boolean;
}

interface DocPlan {
  path: string;
  description: string;
  type: 'guide' | 'api' | 'config' | 'intro';
  relevantPaths?: string[]; // New field
}

/**
 * Safely list all files, ignoring node_modules, .git, and build artifacts.
 */
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  if (!existsSync(dirPath)) return arrayOfFiles;
  
  const files = readdirSync(dirPath);

  files.forEach(function(file) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.sintesi' || file === '.idea' || file === '.vscode') {
      return;
    }
    const fullPath = join(dirPath, file);
    if (statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

/**
 * Reads the content of relevant files to provide context to the LLM.
 * Implements "Usage by Testing" by also reading associated test files.
 */
function readRelevantContext(
  item: DocPlan, // Pass the entire item now
  contextFiles: { path: string }[]
): string {
  const MAX_CONTEXT_CHARS = 25000;
  let content = '';
  let chars = 0;

  let targetFiles: string[] = [];

  // Prioritize relevantPaths provided by the Architect
  if (item.relevantPaths && item.relevantPaths.length > 0) {
    targetFiles = item.relevantPaths.filter(rp => existsSync(rp)); // Ensure path exists
  } else {
    // Fallback to heuristic-based filtering if Architect didn't provide specific paths
    const lowerPath = item.path.toLowerCase();
    const lowerDesc = item.description.toLowerCase();

    if (lowerPath.includes('command') || lowerDesc.includes('cli')) {
      targetFiles = contextFiles
        .filter(f => f.path.includes('commands/') || f.path.includes('cli/') || f.path.includes('bin/'))
        .map(f => f.path);
    } else if (lowerPath.includes('routing') || lowerDesc.includes('architecture')) {
      targetFiles = contextFiles
        .filter(f => f.path.includes('routes') || f.path.includes('router') || f.path.includes('pages/'))
        .map(f => f.path);
    } else if (lowerPath.includes('api') || lowerDesc.includes('endpoints')) {
      targetFiles = contextFiles
        .filter(f => f.path.includes('api/') || f.path.includes('controllers/'))
        .map(f => f.path);
    } else {
      // Fallback: Use "interesting" files like main entry points
      targetFiles = contextFiles
        .filter(f => f.path.endsWith('index.ts') || f.path.endsWith('main.ts') || f.path.endsWith('app.ts'))
        .slice(0, 5)
        .map(f => f.path);
    }
  }

  // Read content
  for (const filePath of targetFiles) {
    if (chars >= MAX_CONTEXT_CHARS) break;
    
    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      content += `\n\n--- FILE: ${filePath} ---\n${fileContent.substring(0, 5000)}`;
      chars += Math.min(fileContent.length, 5000);

      // Usage by Testing: Look for adjacent test files
      const testCandidates = [
        filePath.replace(/\.ts$/, '.test.ts'),
        filePath.replace(/\.ts$/, '.spec.ts'),
        join(dirname(filePath), '__tests__', relative(dirname(filePath), filePath).replace(/\.ts$/, '.test.ts'))
      ];

      for (const testPath of testCandidates) {
        if (existsSync(testPath)) {
          const testContent = readFileSync(testPath, 'utf-8');
          content += `\n\n--- ASSOCIATED TEST (Usage Example): ${testPath} ---\n${testContent.substring(0, 3000)}`;
          chars += Math.min(testContent.length, 3000);
          break; // Found one test file, that's enough
        }
      }
    } catch (e) {
      // Ignore read errors
    }
  }

  return content;
}

export async function documentationCommand(options: DocumentationOptions): Promise<void> {
  const logger = new Logger(options.verbose);
  logger.header('📚 Sintesi Documentation - Intelligent Doc Generation');

  const cwd = process.cwd();
  const outputDir = resolve(cwd, options.outputDir || 'docs');
  
  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // 1. Initialize AI
  let aiAgent;
  try {
    aiAgent = createAgentFromEnv({ debug: options.verbose });
    const isConnected = await aiAgent.validateConnection();
    if (!isConnected) {
      logger.error('AI provider connection failed. Please check your API key.');
      return;
    }
    logger.info('Using AI provider: ' + aiAgent.getProvider());
  } catch (error) {
    logger.error('No valid AI API key found. Set OPENAI_API_KEY, GEMINI_API_KEY, etc.');
    return;
  }

  // 2. Get Project Context & Changes
  const s = spinner();
  s.start('Analyzing project structure...');

  let context: ProjectContext;
  let gitDiff = '';

  try {
    // Structural Context
    context = getProjectContext(cwd);
    
    // Recent Changes Context
    const analysisService = new ChangeAnalysisService(logger);
    const analysis = await analysisService.analyze({
      fallbackToLastCommit: true,
      includeSymbols: false,
      stagedOnly: false
    });

    // Optimization: Increased diff limit for better context
    gitDiff = analysis.gitDiff;
    if (gitDiff.length > 15000) {
      gitDiff = gitDiff.substring(0, 15000) + '\n... (truncated)';
    }

    s.stop('Analyzed ' + context.files.length + ' files');
  } catch (error) {
    s.stop('Analysis failed');
    logger.error('Failed to analyze project: ' + error);
    return;
  }

  // 3. PHASE 1: The Architect (Planning)
  s.start('Planning documentation structure...');
  
  const priorityPatterns = [
    'commands/', 'cli/', 'bin/',
    'pages/', 'app/', 'routes/', 'router/', 'components/', 'features/', 'store/', 'services/', 'hooks/', 'context/',
    'api/', 'controllers/', 'models/', 'schemas/',
    'lib/', 'src/index', 'main'
  ];

  const interestingFiles = context.files.filter(f => 
    priorityPatterns.some(p => f.path.toLowerCase().includes(p)) || !f.path.includes('/')
  );
  
  const fileSummary = interestingFiles
    .map(function (f) { return '- ' + f.path; }) 
    .join('\n');

  let specificContext = '';
  // 1. CLI Commands Detection
  const commandFiles = context.files.filter(f => f.path.includes('commands/') || f.path.includes('cli/'));
  if (commandFiles.length > 0) {
    specificContext += `\n## Detected CLI Commands:\n${commandFiles.map(f => `- ${f.path}`).join('\n')}\n`;
  }
  // 2. Web Routes Detection
  const routeFiles = context.files.filter(f => 
    f.path.includes('routes') || f.path.includes('routing') || f.path.match(/app\/.*page\.(tsx|vue|js)/)
  );
  if (routeFiles.length > 0) {
    specificContext += `\n## Detected Routes / Pages:\n${routeFiles.slice(0, 20).map(f => `- ${f.path}`).join('\n')}\n`;
  }

  const packageJsonSummary = context.packageJson
    ? JSON.stringify(context.packageJson, null, 2)
    : 'No package.json found';

  let existingDocsList: string[] = [];
  try {
    const allFiles = getAllFiles(outputDir);
    existingDocsList = allFiles.map(f => relative(outputDir, f));
  } catch (e) {
    // Ignore error if docs folder doesn't exist or is empty
  }

  const existingDocsSummary = existingDocsList.length > 0 
    ? existingDocsList.join('\n') 
    : 'No existing documentation found.';

  const planPrompt = `
You are an expert Product Manager and Technical Writer.
Your goal is to design a documentation structure for the End User / Developer who uses this software.

## Project Context
Package.json:
${packageJsonSummary}

File Structure (Filtered for relevance):
${fileSummary}
${specificContext}

## Existing Documentation (in ${options.outputDir || 'docs'}/)
${existingDocsSummary}

## Task
Analyze the project "DNA" to determine its TYPE.
Then, propose a list of 3-6 documentation files tailored SPECIFICALLY to that type.

### Strategy by Project Type (STRICTLY FOLLOW THIS):
1. **CLI Tool**: MUST have "commands.md", "installation.md". AVOID "components.md".
2. **Web Application**: MUST have "getting-started.md", "architecture.md". If Router found: "routing.md".
3. **Backend / API**: MUST have "endpoints.md", "authentication.md".
4. **Library / SDK**: MUST have "usage.md", "api-reference.md".

## Rules
- **User-Centric**: Document *how to use it*.
- **Smart Updates**: Reuse existing files if relevant.

## Output
Return ONLY a valid JSON array.
[
  { 
    "path": "commands.md", 
    "description": "Reference of all CLI commands.", 
    "type": "guide",
    "relevantPaths": ["packages/cli/src/commands/init.ts", "packages/cli/src/commands/check.ts"] 
  }
]
`;

  let plan: DocPlan[] = [];
  try {
    let response = await aiAgent.generateText(planPrompt, {
      maxTokens: 2000,
      temperature: 0.2
    });
    response = response.replace(/```json/g, '').replace(/```/g, '').trim();
    plan = JSON.parse(response);
    s.stop(`Plan generated: ${plan.length} files proposed`);
    plan.forEach(p => logger.info(`- ${p.path}: ${p.description}`));
  } catch (e) {
    s.stop('Planning failed');
    logger.error('Failed to generate documentation plan: ' + e);
    return;
  }

  // 4. PHASE 2: The Builder (Generation)
  logger.info('\nStarting content generation...');

  await pMap(plan, async (item) => {
    const fullPath = join(outputDir, item.path);
    const isUpdate = existsSync(fullPath);
    let existingContent = '';
    
    if (isUpdate) {
      existingContent = readFileSync(fullPath, 'utf-8');
    }

    logger.info(`> Processing ${item.path}...`);

    // KEY IMPROVEMENT: Fetch ACTUAL CONTENT of relevant files to prevent "Blind Generation"
    const detailedSourceContext = readRelevantContext(item, context.files);

    const genPrompt = `
You are writing technical documentation.
Project Name: ${context.packageJson?.name || 'Project'}

## Task
Write the content for the file: "${item.path}"
Purpose: ${item.description}

## Source Code Context (IMPORTANT)
The following is the ACTUAL source code relevant to this file. 
Use it to extract real flags, parameters, exports, and logic.
IF TESTS ARE INCLUDED, use them to write "Usage Examples".

${detailedSourceContext || '(No specific source files matched, rely on general context)'}

## General Context
Package.json:
${packageJsonSummary}

Recent Changes (Git Diff):
${gitDiff || 'None'}

${isUpdate ? `## Existing Content (UPDATE THIS)
${existingContent}

User Instruction: Update this content to reflect recent changes/source code, fixing obsolete info.` : 'User Instruction: Write this file from scratch. Be comprehensive and professional.'}

## Rules
- Return ONLY the Markdown content.
- **NO HALLUCINATIONS**: Only document commands/flags/props you see in the "Source Code Context" or Git Diff.
`;

    try {
      let content = await aiAgent.generateText(genPrompt, {
        maxTokens: 4000,
        temperature: 0.4
      });

      content = content.trim();
      if (content.startsWith('```markdown')) content = content.replace(/^```markdown\s*/, '').replace(/```$/, '');
      else if (content.startsWith('```')) content = content.replace(/^```\s*/, '').replace(/```$/, '');

      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content);
      logger.success(`✔ Wrote ${item.path}`);
    } catch (e) {
      logger.error(`✖ Failed ${item.path}: ${e}`);
    }
  }, 3);

  logger.success(`\nDocumentation successfully generated in ${outputDir}/`);
}
