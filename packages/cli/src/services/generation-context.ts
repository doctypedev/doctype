
import { Logger } from '../utils/logger';
import { getProjectContext, ProjectContext } from '@sintesi/core';
import { resolve, relative } from 'path';
import { readFileSync } from 'fs';
import { SmartChecker } from './smart-checker';
import { ChangeAnalysisService } from './analysis-service';
import { createAIAgentsFromEnv, AIAgents, AIAgentRoleConfig } from '../../../ai';

export interface CliConfig {
    binName?: string;
    packageName?: string;
    relevantCommands?: string[];
}

export interface TechStack {
    frameworks: string[];
    languages: string[]; // e.g. TypeScript, Python
    libraries: string[]; // e.g. Tailwind, Zod
    infrastructure: string[]; // e.g. Vercel, Docker
}

export class GenerationContextService {
    constructor(private logger: Logger, private cwd: string) { }

    /**
     * Performs a smart check to see if generation is necessary based on code changes.
     */
    async performSmartCheck(force: boolean = false): Promise<boolean> {
        if (force) return true;

        this.logger.info('Performing smart check (Code Changes)...');
        const smartChecker = new SmartChecker(this.logger, this.cwd);
        const hasChanges = await smartChecker.hasRelevantCodeChanges();

        if (!hasChanges) {
            this.logger.success('No relevant code changes detected (heuristic check). Content is likely up to date.');
        }
        return hasChanges;
    }

    /**
     * Initializes AI Agents from environment variables.
     */
    async getAIAgents(verbose: boolean, plannerModelId?: string, writerModelId?: string): Promise<AIAgents | null> {
        try {
            const plannerConfig: AIAgentRoleConfig = {
                modelId: plannerModelId || process.env.SINTESI_PLANNER_MODEL_ID || '',
                provider: process.env.SINTESI_PLANNER_PROVIDER as any,
            };
            const writerConfig: AIAgentRoleConfig = {
                modelId: writerModelId || process.env.SINTESI_WRITER_MODEL_ID || '',
                provider: process.env.SINTESI_WRITER_PROVIDER as any,
            };

            const aiAgents = createAIAgentsFromEnv(
                { debug: verbose },
                { planner: plannerConfig, writer: writerConfig }
            );

            const writerConnected = await aiAgents.writer.validateConnection();

            // If planner is different from writer, check it too, otherwise we assume if writer works, planner likely works (or it's the same)
            // But let's be safe if they are distinct instances
            let plannerConnected = true;
            if (aiAgents.planner !== aiAgents.writer) {
                plannerConnected = await aiAgents.planner.validateConnection();
            }

            if (!writerConnected || !plannerConnected) {
                this.logger.error('AI provider connection failed. Please check your API key.');
                return null;
            }

            if (verbose) {
                this.logger.info(`Using AI Planner: ${aiAgents.planner.getModelId()} (${aiAgents.planner.getProvider()})`);
                this.logger.info(`Using AI Writer: ${aiAgents.writer.getModelId()} (${aiAgents.writer.getProvider()})`);
            }

            return aiAgents;

        } catch (error: any) {
            this.logger.error('No valid AI API key found or agent initialization failed: ' + error.message);
            return null;
        }
    }

    /**
     * Analyzes the project structure and retrieves the git diff.
     */
    async analyzeProject(): Promise<{ context: ProjectContext; gitDiff: string }> {
        // Structural Context
        const context = getProjectContext(this.cwd);

        // Recent Changes Context
        let gitDiff = '';
        try {
            const analysisService = new ChangeAnalysisService(this.logger);
            const analysis = await analysisService.analyze({
                fallbackToLastCommit: true,
                includeSymbols: false,
                stagedOnly: false
            });

            gitDiff = analysis.gitDiff;
            if (gitDiff.length > 15000) {
                gitDiff = gitDiff.substring(0, 15000) + '\n... (truncated)';
            }
        } catch (e: any) {
            this.logger.debug('Could not fetch git diff, skipping: ' + e);
        }

        return { context, gitDiff };
    }

    /**
     * Detects CLI configuration (binary name, package name, confirmed commands).
     */
    detectCliConfig(context: ProjectContext): CliConfig {
        let binName = '';
        let packageName = context.packageJson?.name || '';
        let relevantCommands: string[] = [];

        // 1. Detect Commands
        const commandFiles = context.files.filter(f => {
            const relativePath = relative(this.cwd, f.path);
            return (
                relativePath.includes('commands/') ||
                relativePath.includes('cli/') ||
                (relativePath.includes('bin/') && !relativePath.includes('node_modules'))
            );
        });

        // Extract command names from file paths (e.g. src/commands/foo.ts -> foo)
        // Filter out common non-command files
        relevantCommands = commandFiles
            // eslint-disable-next-line
            .filter(f => f.path.match(/[\/\\]commands[\/\\][a-zA-Z0-9-]+\.ts$/))
            .map(f => {
                const parts = f.path.split(/[\\/]/);
                return parts[parts.length - 1].replace(/\.ts$/, '');
            })
            .filter(name => !['index', 'main', 'types', 'cli'].includes(name));


        // 2. Detect Monorepo / Binary Name
        const pkg = context.packageJson as any;
        const isMonorepo = pkg?.private === true || !!pkg?.workspaces;

        if (isMonorepo) {
            const subPackageFiles = context.files.filter(f => f.path.endsWith('package.json') && f.path !== 'package.json');
            for (const pkgFile of subPackageFiles) {
                try {
                    const pkgContent = JSON.parse(readFileSync(resolve(this.cwd, pkgFile.path), 'utf-8'));
                    if (pkgContent.bin && pkgContent.name) {
                        // Prefer "cli" packages
                        if (!binName || pkgContent.name.includes('cli')) {
                            packageName = pkgContent.name;
                            if (typeof pkgContent.bin === 'string') {
                                const pName = pkgContent.name;
                                binName = pName.startsWith('@') ? pName.split('/')[1] : pName;
                            } else if (typeof pkgContent.bin === 'object') {
                                binName = Object.keys(pkgContent.bin)[0];
                            }
                        }
                    }
                } catch (e) { /* ignore */ }
            }
        }

        // Fallback if no binary found in monorepo, or it's a single repo
        if (!binName) {
            if (pkg?.bin) {
                if (typeof pkg.bin === 'string') {
                    const pkgName = pkg.name || '';
                    binName = pkgName.startsWith('@') ? pkgName.split('/')[1] : pkgName;
                } else if (typeof pkg.bin === 'object') {
                    binName = Object.keys(pkg.bin)[0];
                }
            }
        }

        return { binName, packageName, relevantCommands };
    }

    /**
     * Analyze package.json to detect the technology stack.
     */
    detectTechStack(context: ProjectContext): TechStack {
        const stack: TechStack = {
            frameworks: [],
            languages: [],
            libraries: [],
            infrastructure: []
        };

        const pkg = context.packageJson;
        if (!pkg) return stack;

        const allDeps = {
            ...pkg.dependencies,
            ...pkg.devDependencies,
            ...(pkg as any).peerDependencies
        };
        const depNames = Object.keys(allDeps);

        // Languages
        if (depNames.some(d => d.includes('typescript'))) stack.languages.push('TypeScript');
        if (depNames.some(d => d.includes('@types/node'))) stack.languages.push('Node.js');

        // Frameworks
        if (depNames.includes('react')) stack.frameworks.push('React');
        if (depNames.includes('vue')) stack.frameworks.push('Vue');
        if (depNames.includes('next')) stack.frameworks.push('Next.js');
        if (depNames.includes('nuxt')) stack.frameworks.push('Nuxt');
        if (depNames.includes('@angular/core')) stack.frameworks.push('Angular');
        if (depNames.includes('svelte')) stack.frameworks.push('Svelte');
        if (depNames.includes('express')) stack.frameworks.push('Express');
        if (depNames.includes('fastify')) stack.frameworks.push('Fastify');
        if (depNames.includes('@nestjs/core')) stack.frameworks.push('NestJS');

        // Libraries
        if (depNames.some(d => d.includes('tailwind'))) stack.libraries.push('TailwindCSS');
        if (depNames.includes('zod')) stack.libraries.push('Zod');
        if (depNames.includes('prisma')) stack.libraries.push('Prisma');
        if (depNames.includes('mongoose')) stack.libraries.push('Mongoose');
        if (depNames.includes('redux') || depNames.includes('@reduxjs/toolkit')) stack.libraries.push('Redux');
        if (depNames.includes('zustand')) stack.libraries.push('Zustand');
        if (depNames.includes('vitest') || depNames.includes('jest')) stack.libraries.push('Testing (Vitest/Jest)');

        // Infrastructure / Tools
        if (depNames.includes('vercel')) stack.infrastructure.push('Vercel');
        if (depNames.includes('vite')) stack.infrastructure.push('Vite');
        if (depNames.includes('webpack')) stack.infrastructure.push('Webpack');
        if (depNames.includes('turbo')) stack.infrastructure.push('Turborepo');

        return stack;
    }

    /**
     * Generates a shared context prompt string including package info, CLI details, and git diff.
     */
    generateContextPrompt(context: ProjectContext, gitDiff: string, cliConfig: CliConfig, techStack?: TechStack): string {
        const packageJsonSummary = context.packageJson
            ? JSON.stringify(context.packageJson, null, 2)
            : 'No package.json found';

        let prompt = `## Package.json\n\`\`\`json\n${packageJsonSummary}\n\`\`\`\n\n`;

        if (techStack) {
            prompt += `## Detected Tech Stack\n`;
            if (techStack.frameworks.length) prompt += `- **Frameworks**: ${techStack.frameworks.join(', ')}\n`;
            if (techStack.languages.length) prompt += `- **Languages**: ${techStack.languages.join(', ')}\n`;
            if (techStack.libraries.length) prompt += `- **Libraries**: ${techStack.libraries.join(', ')}\n`;
            if (techStack.infrastructure.length) prompt += `- **Tools/Infra**: ${techStack.infrastructure.join(', ')}\n`;
            prompt += `> **INSTRUCTION**: Strictly adhere to the detected stack. Do not suggest libraries not listed here (like React if this is Vue) unless explicitly asked.\n\n`;
        }

        if (cliConfig.relevantCommands && cliConfig.relevantCommands.length > 0) {
            prompt += `> **VERIFIED AVAILABLE COMMANDS**: [${cliConfig.relevantCommands.join(', ')}]\n`;
            prompt += `> **INSTRUCTION**: ONLY document the commands listed above. Do NOT document commands inferred from Changelogs or other text if they are not in this list.\n\n`;
        }

        if (cliConfig.packageName) {
            prompt += `> NOTE: The official package name is "${cliConfig.packageName}". Use this EXACT name for installation instructions. Do not hallucinate suffixes.\n\n`;
        }

        if (cliConfig.binName) {
            prompt += `> NOTE: The CLI binary command is "${cliConfig.binName}". Use this for usage examples (e.g. ${cliConfig.binName} <command>).\n\n`;
        }

        prompt += "## Recent Code Changes (Git Diff)\nUse this to understand what features were recently added or modified.\n```diff\n" + (gitDiff || 'No recent uncommitted changes detected.') + "\n```\n\n";

        return prompt;
    }
}
