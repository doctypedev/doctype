import { Logger } from '../utils/logger';
import { AIAgents } from '../../../ai';

export class ImpactAnalyzer {
    constructor(private logger: Logger) { }

    /**
     * Analyzes the git diff and determines if the documentation needs to be updated.
     * Returns a reason if NO update is needed.
     */
    async shouldUpdateDocs(
        gitDiff: string,
        docType: 'readme' | 'documentation',
        aiAgents: AIAgents
    ): Promise<{ update: boolean; reason: string }> {
        if (!gitDiff || gitDiff.trim().length === 0) {
            return { update: false, reason: 'No git diff provided.' };
        }

        // Heuristics: if git diff is tiny and only affects ignored files (like .gitignore, .github), skip.
        // However, the caller usually passes a relevant diff. 
        // We'll rely on the AI for semantic analysis.

        this.logger.info(`🔍 Performing Semantic Impact Analysis on ${docType}...`);

        const prompt = `
You are a Senior Technical Editor.
Your job is to act as a GATEKEEPER to prevent unnecessary documentation updates.
You will evaluate the provided "Git Diff" and decide if the "${docType}" needs to be updated.

## Git Diff
\`\`\`diff
${gitDiff.substring(0, 10000)}
${gitDiff.length > 10000 ? '...(truncated)' : ''}
\`\`\`

## Rules
1. **IGNORE** Trivial Changes:
   - Formatting/Linting fixes.
   - Version bumps in package.json.
   - Internal refactors that don't change behavior or APIs.
   - Changes to CI/CD workflows (.github, etc).
   - Changes to ignored files (.gitignore, etc).
   - Typos in comments.

2. **FLAG** Important Changes:
   - New CLI commands or flags.
   - New API endpoints.
   - Changes to configuration options.
   - New features visible to the end-user.
   - Breaking changes.

## Output
Return a JSON object:
{
  "update": boolean, // true if docs MUST be updated, false otherwise
  "reason": "String explaining why. If false, explain why changes are trivial. If true, list the key feature that changed."
}
`;

        try {
            // Use the Planner or Reviewer (usually stronger models) for this logic
            const agent = aiAgents.reviewer || aiAgents.planner;
            let response = await agent.generateText(prompt, {
                maxTokens: 500,
                temperature: 0.1
            });

            response = response.trim();
            // Clean up markdown code blocks
            if (response.startsWith('```json')) response = response.replace(/^```json\s*/, '').replace(/```$/, '');
            else if (response.startsWith('```')) response = response.replace(/^```\s*/, '').replace(/```$/, '');

            const result = JSON.parse(response);
            return {
                update: result.update === true,
                reason: result.reason || 'No reason provided.'
            };

        } catch (e) {
            this.logger.warn(`Impact analysis failed (JSON parse error or AI error): ${e}. Defaulting to TRUE (safe mode).`);
            return { update: true, reason: 'Analysis failed, falling back to safe update.' };
        }
    }
}
