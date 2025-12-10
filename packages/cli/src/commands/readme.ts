/**
 * CLI command: readme
 *
 * Generates a README.md file based on the project context.
 */

import { Logger } from '../utils/logger';
import { createAgentFromEnv } from '../../../ai';
import { getProjectContext, ProjectContext } from '@doctypedev/core';
import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { spinner } from '@clack/prompts';
import { GitHelper } from '../utils/git-helper';
import { execSync } from 'child_process';

export interface ReadmeOptions {
  output?: string;
  force?: boolean; // Kept for backward compatibility but less strict now
  verbose?: boolean;
}

export async function readmeCommand(options: ReadmeOptions): Promise<void> {
  const logger = new Logger(options.verbose);
  logger.header('✨ Doctype Readme - Project Context Generation');

  const cwd = process.cwd();
  const outputPath = resolve(cwd, options.output || 'README.md');
  let existingContent = '';
  let isUpdate = false;
  let gitDiff = '';

  // 0. Get Git Diff (Context about recent changes)
  try {
    const gitHelper = new GitHelper(logger);
    // Try to get diff from main/master or HEAD~1 if simpler
    // We want broad context. Let's try to get staged + unstaged changes first
    const staged = await gitHelper.getDiff(true);
    const unstaged = await gitHelper.getDiff(false);
    gitDiff = (staged + '\n' + unstaged).trim();

    // If no active changes, check the last commit to understand recent context
    if (!gitDiff) {
       try {
         // Get stats and message of last commit
         const lastCommit = execSync('git show HEAD --stat -n 1', { encoding: 'utf-8' });
         gitDiff = "No uncommitted changes. Last commit:\n" + lastCommit;
       } catch (e) {
         // Ignore if no commits yet
       }
    }

    if (gitDiff.length > 5000) {
      gitDiff = gitDiff.substring(0, 5000) + '\n... (truncated)';
    }

    if (gitDiff) {
      logger.info('Detected recent code changes, including in context.');
    }
  } catch (e) {
    logger.debug('Could not fetch git diff, skipping.');
  }

  if (existsSync(outputPath)) {
    try {
      existingContent = readFileSync(outputPath, 'utf-8');
      isUpdate = true;
      logger.info('Found existing ' + (options.output || 'README.md') + ', checking for updates...');
    } catch (e) {
      logger.warn('Could not read existing ' + (options.output || 'README.md') + ': ' + e);
    }
  }

  // 1. Initialize AI
  let aiAgent;
  try {
    aiAgent = createAgentFromEnv({ debug: options.verbose });
    const isConnected = await aiAgent.validateConnection();
    if (!isConnected) {
      logger.error('AI provider connection failed. Please checks your API key.');
      return;
    }
    logger.info('Using AI provider: ' + aiAgent.getProvider());
  } catch (error) {
    logger.error('No valid AI API key found. Set OPENAI_API_KEY, GEMINI_API_KEY, etc.');
    return;
  }

  // 2. Get Project Context
  const s = spinner();
  s.start('Analyzing project structure...');
  
  let context: ProjectContext;
  try {
    context = getProjectContext(cwd);
    s.stop('Analyzed ' + context.files.length + ' files');
  } catch (error) {
    s.stop('Analysis failed');
    logger.error('Failed to analyze project: ' + error);
    return;
  }

  // 3. Prepare Prompt
  s.start(isUpdate ? 'Updating README...' : 'Generating README...');
  
  // Format context for AI
  const fileSummary = context.files
    .map(function(f) { return '- ' + f.path + ' (imports: ' + f.imports.length + ', imported by: ' + f.importedBy.length + ')'; })
    .join('\n');
  
  const packageJsonSummary = context.packageJson 
    ? JSON.stringify(context.packageJson, null, 2) 
    : 'No package.json found';

  let prompt = '';
  
  prompt += "You are an expert technical writer. Your task is to " + (isUpdate ? "update and improve the" : "write a comprehensive") + " README.md for a software project.\n\n";
  prompt += "Here is the context of the project:\n\n";
  
  prompt += "## Package.json\n```json\n" + packageJsonSummary + "\n```\n\n";
  
  prompt += "## Recent Code Changes (Git Diff)\nUse this to understand what features were recently added or modified.\n```diff\n" + (gitDiff || 'No recent uncommitted changes detected.') + "\n```\n\n";
  
  prompt += "## File Structure & Dependencies\n" + fileSummary + "\n\n";
  
  let instructions = '';

  if (isUpdate) {
    instructions += "\n## Current README Content\n";
    instructions += "```markdown\n";
    instructions += existingContent;
    instructions += "\n```\n\n";
    
    instructions += "## Instructions for UPDATE\n";
    instructions += "1. **LANGUAGE CONSISTENCY**: STRICTLY write in the same language as the 'Current README Content'. If it is Italian, write in Italian. Do not switch languages.\n";
    instructions += "2. Analyze the 'Current README Content' and compare it with the detected project structure, package.json, and **Recent Code Changes**.\n";
    instructions += "3. **Detect New Features**: Look closely at the Git Diff and File Structure. If new files were added to 'commands', 'routes', or 'scripts', implies new functionality.\n";
    instructions += "4. **Update Usage Section**: IF you detect new CLI commands (e.g. in `src/commands/`), scripts, or API endpoints, YOU MUST document them in the Usage section.\n";
    instructions += "   - *Example*: If you see `src/commands/readme.ts`, ensure `readme` command is listed.\n";
    instructions += "5. **Keep manual details**: Preserve specific configuration details, project philosophy, or manual instructions that cannot be inferred from code.\n";
    instructions += "6. **Update obsolete parts**: Remove commands or features that were deleted.\n";
    instructions += "7. **Improve clarity**: Rephrase sections to be more professional and concise if needed.\n";
  } else {
    instructions += "\n## Instructions for NEW CREATION\n";
    instructions += "1. Analyze the file structure, package.json, and **Recent Code Changes**.\n";
    instructions += "2. **Identify Project Type**: Is it a CLI? A Web App? A Library? Adjust the 'Usage' section accordingly.\n";
    instructions += "   - *CLI*: List available commands (inferred from 'bin', 'commands' folder, or library structure). Look for files like `src/commands/foo.ts` -> command `foo`.\n";
    instructions += "   - *Web*: How to start dev server, build, test.\n";
    instructions += "   - *Library*: How to import and use main functions.\n";
    instructions += "3. Write a professional README.md that includes:\n";
    instructions += "   - **Project Title & Description**\n";
    instructions += "   - **Features**: Deduce key features from the file names, dependencies, and git diff.\n";
    instructions += "   - **Installation**\n";
    instructions += "   - **Usage**: Detailed instructions on how to run/use the project.\n";
    instructions += "   - **Project Structure**\n";
  }
  
  prompt += instructions;

  prompt += "\nGeneral Rules:\n";
  prompt += "- Use Markdown formatting.\n";
  prompt += "- Be concise but informative.\n";
  prompt += "- Do not include placeholder text like '[Insert description here]'. Infer the best possible description.\n";
  prompt += "- Return ONLY the Markdown content.\n";

  try {
    let readmeContent = await aiAgent.generateText(prompt, {
      maxTokens: 4000,
      temperature: 0.5
    });

    // Cleanup: Remove markdown code blocks if present
    readmeContent = readmeContent.trim();
    if (readmeContent.startsWith('```markdown')) {
      readmeContent = readmeContent.replace(/^```markdown\s*/, '').replace(/```$/, '');
    } else if (readmeContent.startsWith('```')) {
      readmeContent = readmeContent.replace(/^```\s*/, '').replace(/```$/, '');
    }
    readmeContent = readmeContent.trim();

    s.stop('Generation complete');
    
    if (isUpdate && !options.force) {
        writeFileSync(outputPath, readmeContent);
        logger.success('README updated at ' + Logger.path(outputPath));
    } else {
        writeFileSync(outputPath, readmeContent);
        logger.success('README generated at ' + Logger.path(outputPath));
    }
    
  } catch (error) {
    s.stop('Generation failed');
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('AI generation failed: ' + msg);
  }
}