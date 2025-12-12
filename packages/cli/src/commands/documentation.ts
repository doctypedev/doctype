/**
 * CLI command: documentation
 *
 * Generates a full documentation site structure based on the project context.
 */

import { Logger } from '../utils/logger';
import { ProjectContext } from '@sintesi/core';
import { resolve, join, dirname, relative } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { spinner } from '@clack/prompts';
import { pMap } from '../utils/concurrency';
import { GenerationContextService } from '../services/generation-context';
import { ReviewService } from '../services/review-service';


export interface DocumentationOptions {
  outputDir?: string;
  verbose?: boolean;
  site?: boolean;
}

interface DocPlan {
  path: string;
  description: string;
  type: 'guide' | 'api' | 'config' | 'intro';
  relevantPaths?: string[]; // New field for Architect suggestions
  originalPath?: string; // New field to indicate if this doc is a refactored version of an existing file
}

/**
 * Safely list all files, ignoring node_modules, .git, and build artifacts.
 */
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  if (!existsSync(dirPath)) return arrayOfFiles;

  const files = readdirSync(dirPath);

  files.forEach(function (file) {
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
/**
 * Reads the content of relevant files to provide context to the LLM.
 * Uses the Project Context dependency graph to find related files (imports)
 * and includes associated tests.
 */
function readRelevantContext(
  item: DocPlan,
  context: ProjectContext
): string {
  const MAX_CONTEXT_CHARS = 30000;
  let content = '';
  let chars = 0;

  // 1. Identify Target Files (Seeds)
  let targetFiles: string[] = [];

  if (item.relevantPaths && item.relevantPaths.length > 0) {
    targetFiles = item.relevantPaths.filter(rp => existsSync(rp));
  } else {
    // Fallback Heuristics to find seeds if planner didn't provide paths
    const lowerPath = item.path.toLowerCase();
    const lowerDesc = item.description.toLowerCase();

    if (lowerPath.includes('command') || lowerDesc.includes('cli')) {
      targetFiles = context.files
        .filter(f => f.path.includes('commands/') || f.path.includes('cli/'))
        .map(f => f.path);
    } else if (lowerPath.includes('routing') || lowerDesc.includes('architecture')) {
      targetFiles = context.files
        .filter(f => f.path.includes('routes') || f.path.includes('router') || f.path.includes('pages/'))
        .map(f => f.path);
    } else {
      // General Fallback
      targetFiles = context.files
        .filter(f => f.path.endsWith('index.ts') || f.path.endsWith('main.ts'))
        .slice(0, 3)
        .map(f => f.path);
    }
  }

  // 2. Expand Context using Dependency Graph (1 level deep)
  const expandedFiles = new Set<string>(targetFiles);
  for (const seedPath of targetFiles) {
    const fileNode = context.files.find(f => f.path === seedPath);
    if (fileNode && fileNode.imports) {
      for (const importPath of fileNode.imports) {
        // Resolve import path to absolute path
        // Note: imports might be relative './foo' or aliases '@/'
        try {
          // Attempt simple relative resolution first
          if (importPath.startsWith('.')) {
            const absoluteImport = resolve(dirname(seedPath), importPath);
            // Try to find this file in our project context (ignoring extension mismatches)
            const resolvedNode = context.files.find(f => {
              const fNoExt = f.path.replace(/\.[^.]+$/, '');
              const impNoExt = absoluteImport.replace(/\.[^.]+$/, '');
              return fNoExt === impNoExt;
            });

            if (resolvedNode) {
              expandedFiles.add(resolvedNode.path);
            }
          }
        } catch (e) {
          // Ignore resolution errors
        }
      }
    }
  }

  // 3. Read Content
  const sortedFiles = Array.from(expandedFiles).sort(); // Sort for deterministic order

  for (const filePath of sortedFiles) {
    if (chars >= MAX_CONTEXT_CHARS) break;

    try {
      if (!existsSync(filePath)) continue;

      const fileContent = readFileSync(filePath, 'utf-8');
      const isSeed = targetFiles.includes(filePath);

      // If it's a seed file (direct relevance), read more. If it's an imported dependency, read less (signatures ideally, but text for now).
      const limit = isSeed ? 6000 : 2000;

      content += `\n\n--- FILE: ${filePath} ---\n${fileContent.substring(0, limit)}`;
      chars += Math.min(fileContent.length, limit);

      // 4. Associated Tests (Usage Examples)
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
          break;
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
  const contextService = new GenerationContextService(logger, cwd);
  const reviewService = new ReviewService(logger);

  // 0. Smart Check
  const hasChanges = await contextService.performSmartCheck();
  if (!hasChanges) return;

  const outputDir = resolve(cwd, options.outputDir || 'docs');

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // 1. Initialize AI Agents
  const aiAgents = await contextService.getAIAgents(options.verbose || false);
  if (!aiAgents) return;

  // 2. Get Project Context & Changes
  const s = spinner();
  s.start('Analyzing project structure...');

  let context: ProjectContext;
  let gitDiff = '';

  try {
    const analysis = await contextService.analyzeProject();
    context = analysis.context;
    gitDiff = analysis.gitDiff;
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
    .map(function (f) {
      const importInfo = f.importedBy.length > 0 ? ` (imported by ${f.importedBy.length} files)` : '';
      return '- ' + f.path + importInfo;
    })
    .join('\n');

  let specificContext = '';

  // Use Service to detect CLI config
  const cliConfig = contextService.detectCliConfig(context);

  if (cliConfig.relevantCommands && cliConfig.relevantCommands.length > 0) {
    specificContext += `\n## Detected CLI Commands:\n${cliConfig.relevantCommands.map(c => `- ${c}`).join('\n')}\n`;

    if (cliConfig.relevantCommands.length > 0) {
      specificContext += `\n> **VERIFIED AVAILABLE COMMANDS**: [${cliConfig.relevantCommands.join(', ')}]\n`;
      specificContext += `\n> **INSTRUCTION**: Strictly limit documentation to these verified commands. Ignore references to deleted commands (like 'fix') in changelogs.\n`;
    }

    if (cliConfig.binName) {
      specificContext += `\n> NOTE: This project exports a CLI binary named "${cliConfig.binName}".\n> The detected commands above are likely executed as: ${cliConfig.binName} <command>\n`;
    }
    if (cliConfig.packageName) {
      specificContext += `\n> NOTE: The official package name is "${cliConfig.packageName}".\n`;
    }
  }

  // 2. Web Routes Detection
  const routeFiles = context.files.filter(f =>
    f.path.includes('routes') || f.path.includes('routing') || f.path.match(/app\/.*page\.(tsx|vue|js)/)
  );
  if (routeFiles.length > 0) {
    specificContext += `\n## Detected Routes / Pages:\n${routeFiles.slice(0, 20).map(f => `- ${f.path}`).join('\n')}\n`;
  }

  // 3. Tech Stack Detection
  const techStack = contextService.detectTechStack(context);
  if (techStack.frameworks.length || techStack.libraries.length) {
    specificContext += `\n## Detected Tech Stack:\n`;
    if (techStack.frameworks.length) specificContext += `- Frameworks: ${techStack.frameworks.join(', ')}\n`;
    if (techStack.libraries.length) specificContext += `- Libraries: ${techStack.libraries.join(', ')}\n`;
    if (techStack.infrastructure.length) specificContext += `- Infrastructure: ${techStack.infrastructure.join(', ')}\n`;
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

${options.site ? `
## SITE MODE ENABLED (VitePress)
- **Structure**: Group files into folders for a better sidebar (e.g., 'guide/installation.md', 'reference/commands.md').
- **Index**: Ensure there is a 'index.md' or 'intro.md' as entry point.

## Existing Flat Documentation for Reorganization
${existingDocsList.map(p => `- ${p}`).join('\n')}

**Instruction for SITE MODE:**
When creating the 'Output' JSON, if a proposed file path (e.g., 'guide/installation.md') is conceptually similar or a direct migration of an existing flat file (e.g., 'installation.md'), include the 'originalPath' field in the JSON object like this:
\`\`\`json
{
  "path": "guide/installation.md",
  "description": "How to install the project",
  "type": "guide",
  "originalPath": "installation.md" // Path relative to outputDir
}
\`\`\`
This indicates that the content for 'guide/installation.md' should be sourced from 'installation.md' (if it exists) and then updated.
` : ''}

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
    "relevantPaths": ["packages/cli/src/commands/check.ts", "packages/cli/src/commands/readme.ts"]
  }
]
`;

  let plan: DocPlan[] = [];
  try {
    let response = await aiAgents.planner.generateText(planPrompt, {
      maxTokens: 2000,
      temperature: 0.1
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
    let currentContent = '';

    // Check if the target file already exists OR if there's an originalPath to migrate from
    if (existsSync(fullPath)) {
      currentContent = readFileSync(fullPath, 'utf-8');
    } else if (options.site && item.originalPath) {
      const originalFullPath = join(outputDir, item.originalPath);
      if (existsSync(originalFullPath)) {
        currentContent = readFileSync(originalFullPath, 'utf-8');
        logger.debug(`Migrating content from ${item.originalPath} to ${item.path}`);
      }
    }

    logger.info(`> Processing ${item.path}...`);

    // KEY IMPROVEMENT: Fetch ACTUAL CONTENT of relevant files to prevent "Blind Generation"
    const detailedSourceContext = readRelevantContext(item, context);

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

${currentContent ? `## Existing Content (UPDATE THIS)
${currentContent}

User Instruction: Update this content to reflect recent changes/source code.
IMPORTANT:
1. **PRESERVE STYLE**: Keep the same tone, language, and formatting as the existing content.
2. **MINIMAL DIFF**: Do NOT rephrase existing sentences unless they are factually incorrect. ONLY add new info or remove obsolete info. Ensure this content is integrated into the new structure.` : 'User Instruction: Write this file from scratch. Be comprehensive and professional.'}

## Rules
- Return ONLY the Markdown content.
- **NO HALLUCINATIONS**: Only document commands/flags/props you see in the "Source Code Context" or Git Diff.
- **NO DEAD LINKS**: Do NOT link to files like 'CODE_OF_CONDUCT.md' or 'CONTRIBUTING.md' unless you are absolutely sure they exist in the file list. Use absolute paths (starting with '/') for internal documentation links (e.g., '/guide/installation.md').
${options.site ? `
- **VITEPRESS MODE**:
  1. **Frontmatter**: Start with YAML frontmatter containing 'title', 'description', 'icon' (emoji), and 'order' (number, use a sensible default if not clear from context, e.g., 100 for general order, 10 for key items).
  2. **Mermaid**: If explaining a flow/process, use a \`\`\`mermaid\`\`\` block.
  3. **Components**: Use <Callout type="info"> text </Callout> for notes if appropriate.
` : ''}
`;

    try {
      let content = await aiAgents.writer.generateText(genPrompt, {
        maxTokens: 4000,
        temperature: 0.1
      });

      content = content.trim();
      if (content.startsWith('```markdown')) content = content.replace(/^```markdown\s*/, '').replace(/```$/, '');
      else if (content.startsWith('```')) content = content.replace(/^```\s*/, '').replace(/```$/, '');

      // 4b. PHASE 2.5: The Reviewer (Critique & Refine)
      if (aiAgents.reviewer) {
        // Use shared ReviewService
        content = await reviewService.reviewAndRefine(content, item.path, item.description, aiAgents);
      }

      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content);
      logger.success(`✔ Wrote ${item.path}`);
    } catch (e) {
      logger.error(`✖ Failed ${item.path}: ${e}`);
    }
  }, 3);

  // 5. PHASE 3: Post-processing (Site Generation)
  if (options.site) {
    logger.info('\n🏗️  Site Structure Guidance:');
    logger.info('Since you are using --site, ensure your VitePress config is set up to read from the generated docs/ folder.');
  }

  logger.success(`\nDocumentation successfully generated in ${outputDir}/
`);
}
