
import { Logger } from '../utils/logger';
import { AIAgents } from '../../../ai';

export class ReviewService {
    constructor(private logger: Logger) { }

    /**
     * Reviews and refines content using the Reviewer and Writer agents.
     * If the reviewer flags issues, the writer is asked to refine the content once.
     */
    async reviewAndRefine(
        content: string,
        itemPath: string,
        itemDescription: string,
        agents: AIAgents
    ): Promise<string> {
        if (!agents.reviewer) {
            return content;
        }

        this.logger.info(`> Reviewing ${itemPath}...`);

        const reviewPrompt = `
    You are a Senior Technical Reviewer.
    Your task is to review the following documentation file content.

    File: "${itemPath}"
    Purpose: ${itemDescription}

    ## Content to Review:
    \`\`\`markdown
    ${content}
    \`\`\`

    ## Evaluation Criteria:
    1. **Accuracy**: Does it hallucinate commands/flags not in source code?
    2. **Clarity**: Is it easy to read?
    3. **Consistency**: Does it follow the style guide?
    4. **Completeness**: Does it cover the purpose?

    ## Output
    Return ONLY a JSON object:
    {
      "score": number, // 1-5 (5 is perfect)
      "critique": string, // Detailed feedback if score < 5, or "LGTM" if score is 5
      "critical_issues": boolean // True if there are factual errors (hallucinations)
    }
    `;

        try {
            let reviewRaw = await agents.reviewer.generateText(reviewPrompt, { maxTokens: 1000, temperature: 0.1 });
            reviewRaw = reviewRaw.replace(/```json/g, '').replace(/```/g, '').trim();
            const review = JSON.parse(reviewRaw);

            if (review.score < 4 || review.critical_issues) {
                this.logger.warn(`⚠ Reviewer flagged ${itemPath} (Score: ${review.score}/5): ${review.critique.substring(0, 100)}... Refining...`);

                const refinePrompt = `
        The previous draft of "${itemPath}" received the following CRITIQUE from the Reviewer:
        "${review.critique}"

        ## Task
        Refine the content to address the critique.
        Fix factual errors and improve clarity.
        Return the FULLY rewritten Markdown file.

        ## Previous Content:
        \`\`\`markdown
        ${content}
        \`\`\`
        `;

                // Use Writer to refine
                let refinedContent = await agents.writer.generateText(refinePrompt, { maxTokens: 4000, temperature: 0.1 });

                // Clean content again
                refinedContent = refinedContent.trim();
                if (refinedContent.startsWith('```markdown')) refinedContent = refinedContent.replace(/^```markdown\s*/, '').replace(/```$/, '');
                else if (refinedContent.startsWith('```')) refinedContent = refinedContent.replace(/^```\s*/, '').replace(/```$/, '');

                this.logger.success(`✔ Refined ${itemPath} based on feedback.`);
                return refinedContent;
            } else {
                this.logger.success(`✔ Reviewer passed ${itemPath} (Score: ${review.score}/5)`);
                return content;
            }
        } catch (e) {
            this.logger.warn('Review failed (using unknown/custom JSON?), keeping original draft: ' + e);
            return content;
        }
    }
}
