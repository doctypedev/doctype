/**
 * CLI command: readme
 *
 * Generates a README.md file based on the project context.
 */

import { Logger } from '../utils/logger';
import { ProjectContext } from '@sintesi/core';
import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { spinner } from '@clack/prompts';
import { GenerationContextService } from '../services/generation-context';
import { ReviewService } from '../services/review-service';

export interface ReadmeOptions {
  output?: string;
  force?: boolean; // Kept for backward compatibility but less strict now
  verbose?: boolean;
}

export async function readmeCommand(options: ReadmeOptions): Promise<void> {
  const logger = new Logger(options.verbose);
  logger.header('✨ Sintesi Readme - Project Context Generation');

  const cwd = process.cwd();
  const contextService = new GenerationContextService(logger, cwd);
  const reviewService = new ReviewService(logger);

  // 0. Smart Check
  const hasChanges = await contextService.performSmartCheck(options.force);
  if (!hasChanges) return;

  const outputPath = resolve(cwd, options.output || 'README.md');
  let existingContent = '';
  let isUpdate = false;

  // 1. Initialize AI Agents
  // Use writer agent for simple README generation
  const aiAgents = await contextService.getAIAgents(options.verbose || false);
  if (!aiAgents) return;

  // 2. Get Project Context & Chanegs
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

  if (gitDiff) {
    logger.info('Detected recent code changes, including in context.');
  }

  if (existsSync(outputPath)) {
    try {
      existingContent = readFileSync(outputPath, 'utf-8');
      isUpdate = true;
      logger.info('Found existing ' + (options.output || 'README.md') + ', checking for updates...');
    } catch (e: any) { // Catch as any
      logger.warn('Could not read existing ' + (options.output || 'README.md') + ': ' + e);
    }
  }

  // 2.5 Check for Smart Context (from check --smart)
  let smartSuggestion = '';
  try {
    const smartContextPath = resolve(cwd, '.sintesi/smart-context.json');
    if (existsSync(smartContextPath)) {
      const content = JSON.parse(readFileSync(smartContextPath, 'utf-8'));
      if (content.suggestion) {
        smartSuggestion = content.suggestion;
        logger.info('💡 Using suggestion from strict check: ' + smartSuggestion);
      }
      // Clean up
      unlinkSync(smartContextPath);
    }
  } catch (e: any) { // Catch as any
    logger.debug('Failed to load smart context: ' + e);
  }

  // 3. Prepare Prompt
  s.start(isUpdate ? 'Updating README...' : 'Generating README...');

  // Format context for AI
  const fileSummary = context.files
    .map(function (f) {
      const importInfo = f.importedBy.length > 0 ? ` (imported by ${f.importedBy.length} files)` : '';
      return '- ' + f.path + importInfo;
    })
    .join('\n');

  // Strict Command Whitelisting via Service
  const cliConfig = contextService.detectCliConfig(context);
  const techStack = contextService.detectTechStack(context);

  // Use Service to generate context prompt (centralized)
  const sharedContextPrompt = contextService.generateContextPrompt(context, gitDiff, cliConfig, techStack);

  let prompt = '';

  prompt += "You are an expert technical writer. Your task is to " + (isUpdate ? "update and improve the" : "write a comprehensive") + " README.md for a software project.\n\n";
  prompt += "Here is the context of the project:\n\n";

  prompt += sharedContextPrompt;

  if (smartSuggestion) {
    prompt += "## Specific Suggestion (IMPORTANT)\n" + "A previous analysis identified a specific issue to address:\n> " + smartSuggestion + "\n\nPlease ensure this suggestion is addressed in your update.\n\n";
  }

  prompt += "## File Structure & Dependencies\n" + fileSummary + "\n\n";

  let instructions = '';

  if (isUpdate) {
    instructions += "\n## Current README Content\n";
    instructions += "```markdown\n";
    instructions += existingContent;
    instructions += "\n```\n\n";

    instructions += "## Instructions for UPDATE\n";
    instructions += "1. **STRICTLY PRESERVE STYLE**: You MUST write in the EXACT same language, tone, and style as the 'Current README Content'.\n";
    instructions += "2. **MINIMAL CHANGES**: Only update sections that are factually incorrect or missing based on the **Recent Code Changes**.\n";
    instructions += "3. **NO REWRITING**: Do NOT rephrase existing sentences just to 'improve' them. If it's not broken, don't fix it. This is critical to avoid unnecessary git diffs.\n";
    instructions += "4. **Detect New Features**: Look closely at the Git Diff and File Structure. If new files were added to 'commands', 'routes', or 'scripts', implies new functionality.\n";
    instructions += "5. **Update Usage Section**: IF you detect new CLI commands (e.g. in `src/commands/`), scripts, or API endpoints, YOU MUST document them in the Usage section.\n";
    instructions += "   - *Example*: If you see `src/commands/readme.ts`, ensure `readme` command is listed.\n";
    instructions += "6. **Keep manual details**: Preserve specific configuration details, project philosophy, or manual instructions that cannot be inferred from code.\n";
    instructions += "7. **Delete Obsolete**: Remove commands or features that were deleted, but do not touch valid ones.\n";
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
    let readmeContent = await aiAgents.writer.generateText(prompt, {
      maxTokens: 4000,
      temperature: 0.1
    });

    // Cleanup: Remove markdown code blocks if present
    readmeContent = readmeContent.trim();
    if (readmeContent.startsWith('```markdown')) {
      readmeContent = readmeContent.replace(/^```markdown\s*/, '').replace(/```$/, '');
    } else if (readmeContent.startsWith('```')) {
      readmeContent = readmeContent.replace(/^```\s*/, '').replace(/```$/, '');
    }
    readmeContent = readmeContent.trim();

    // 3.5 Review Phase
    if (aiAgents.reviewer) {
      readmeContent = await reviewService.reviewAndRefine(readmeContent, outputPath, 'Project README', aiAgents);
    }

    s.stop('Generation complete');

    if (isUpdate && !options.force) {
      writeFileSync(outputPath, readmeContent);
      logger.success('README updated at ' + Logger.path(outputPath));
    } else {
      writeFileSync(outputPath, readmeContent);
      logger.success('README generated at ' + Logger.path(outputPath));
    }

  } catch (error: any) { // Catch as any
    s.stop('Generation failed');
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('AI generation failed: ' + msg);
  }
}
