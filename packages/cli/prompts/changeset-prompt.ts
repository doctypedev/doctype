/**
 * Changeset Prompt Generator
 */

import { ChangesetAnalysis } from '../changeset-analyzer';

/**
 * Builder for changeset analysis prompts
 */
export class ChangesetPrompt {
    /**
     * Build prompt for AI analysis
     */
    static buildAnalysisPrompt(analysis: ChangesetAnalysis): string {
        const { gitDiff, symbolChanges } = analysis;

        let prompt = `You are analyzing code changes to determine the semantic versioning type and generate a changeset description.

**Semantic Versioning Rules:**
- **PATCH**: Bug fixes, documentation changes, refactoring (no API changes)
- **MINOR**: New features, backward-compatible API additions
- **MAJOR**: Breaking changes, incompatible API changes, removed functionality

**Code Changes Analysis:**

`;

        // Add symbol changes summary
        if (symbolChanges.length > 0) {
            prompt += `**Symbol Changes (${symbolChanges.length} total):**\n`;

            const added = symbolChanges.filter(c => c.changeType === 'added');
            const modified = symbolChanges.filter(c => c.changeType === 'modified');
            const deleted = symbolChanges.filter(c => c.changeType === 'deleted');

            if (added.length > 0) {
                prompt += `\nAdded (${added.length}):\n`;
                added.forEach(c => {
                    prompt += `- ${c.symbolName} in ${c.filePath}\n`;
                    if (c.newSignature?.signatureText) {
                        prompt += `  Signature: ${c.newSignature.signatureText.slice(0, 200)}\n`;
                    }
                });
            }

            if (modified.length > 0) {
                prompt += `\nModified (${modified.length}):\n`;
                modified.forEach(c => {
                    prompt += `- ${c.symbolName} in ${c.filePath}\n`;
                    if (c.oldSignature?.signatureText && c.newSignature?.signatureText) {
                        prompt += `  Old: ${c.oldSignature.signatureText.slice(0, 150)}\n`;
                        prompt += `  New: ${c.newSignature.signatureText.slice(0, 150)}\n`;
                    }
                });
            }

            if (deleted.length > 0) {
                prompt += `\nDeleted (${deleted.length}):\n`;
                deleted.forEach(c => {
                    prompt += `- ${c.symbolName} in ${c.filePath}\n`;
                });
            }

            prompt += '\n';
        }

        // Add git diff (truncated if too long)
        const maxDiffLength = 100000;
        const truncatedDiff = gitDiff.length > maxDiffLength
            ? gitDiff.slice(0, maxDiffLength) + '\n\n[... diff truncated ...]'
            : gitDiff;

        prompt += `**Git Diff:**\n\`\`\`diff\n${truncatedDiff}\n\`\`\`\n\n`;

        // Instructions
        prompt += `**Task:**
Analyze the changes and respond with a JSON object containing:
1. "versionType": "major" | "minor" | "patch"
2. "description": A detailed, professional changelog message that:
   - Clearly describes WHAT changed (be specific about features/fixes)
   - Uses bullet points for multiple changes (use "- " prefix)
   - Focuses on user-facing impact, not internal implementation
   - Should be 100-300 characters for good detail
   - Example good descriptions:
     * "- Add support for monorepo package detection\\n- Implement ignore patterns from changeset config\\n- Improve interactive package selection"
     * "- Fix critical bug in AST analyzer causing incorrect drift detection\\n- Resolve memory leak in file watcher"
     * "BREAKING: Remove deprecated init command options\\nBREAKING: Change config file format to JSON5"
3. "reasoning": Brief technical explanation of why you chose this version type

**Response Format (JSON only, no markdown):**
{
  "versionType": "minor",
  "description": "- Add new feature X with support for Y\\n- Improve performance of Z operation\\n- Enhance error messages for better debugging",
  "reasoning": "New exported functions added without breaking changes"
}

IMPORTANT: Respond with the raw JSON string only. Do not wrap it in markdown code fences (\`\`\`json). Do not add any text before or after the JSON.`;

        return prompt;
    }
}
