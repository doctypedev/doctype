/**
 * Prompt engineering for AI-generated documentation
 */

/**
 * Builds prompts for AI providers to generate documentation
 */
export class PromptBuilder {

  /**
   * Build a structured prompt for single documentation generation
   */
  static buildStructuredSinglePrompt(
    symbolName: string,
    signatureText: string,
    oldDocumentation?: string
  ): string {
    const sections: string[] = [];

    sections.push(`# Generate Structured Documentation`);
    sections.push('');
    sections.push(`Generate structured documentation for: **${symbolName}**`);
    sections.push('');

    sections.push(`## Code Signature`);
    sections.push('```typescript');
    sections.push(signatureText);
    sections.push('```');
    sections.push('');

    if (oldDocumentation && oldDocumentation.trim()) {
      sections.push(`## Previous Documentation`);
      sections.push(oldDocumentation);
      sections.push('');
      sections.push('Update the documentation based on the new signature above.');
      sections.push('');
    }

    sections.push(`## Instructions`);
    sections.push('');
    sections.push('Provide structured documentation with:');
    sections.push('');
    sections.push('1. **symbolName**: "${symbolName}"');
    sections.push('2. **purpose**: Clear explanation (1-2 sentences)');
    sections.push('3. **parameters** (if applicable): Extract from signature');
    sections.push('4. **returnType** (if applicable): Extract from signature');
    sections.push('5. **usageExample** (optional): Practical TypeScript code (2-5 lines, no fences)');
    sections.push('6. **notes** (optional): Important caveats only');
    sections.push('');
    sections.push('Output valid JSON matching the schema.');

    return sections.join('\n');
  }

  /**
   * Build a system prompt for structured documentation generation
   */
  static buildStructuredSystemPrompt(): string {
    return `You are a technical documentation expert specializing in TypeScript/JavaScript code documentation.

Your task is to generate structured, semantic documentation that will be formatted into Markdown.

You will receive code signatures and must output structured JSON following a strict schema.
The JSON will contain ONLY semantic information - no formatting, no Markdown syntax.

Guidelines:
- Fill all required fields accurately
- Be concise but comprehensive
- Focus on what the code does and why it matters
- Extract parameter information from the signature
- Extract return type information
- Provide clear, practical usage examples (TypeScript code only, no markdown)
- Add notes only for important caveats or special cases
- Use proper technical terminology
- Maintain a professional, neutral tone

CRITICAL - Output Structure:
- Your output is pure JSON following the provided schema
- Do NOT include Markdown formatting in your responses
- Do NOT include code fences in the usageExample field (just the TypeScript code)
- Do NOT include HTML comments
- The formatting will be applied automatically by the system

The structured data you provide will be transformed into consistent, well-formatted documentation.`;
  }

  /**
   * Build a prompt for structured batch documentation generation
   */
  static buildStructuredBatchPrompt(items: Array<{ symbolName: string; signatureText: string }>): string {
    const sections: string[] = [];

    sections.push(`# Structured Documentation Generation`);
    sections.push('');
    sections.push(`Generate structured documentation for the following ${items.length} TypeScript symbols.`);
    sections.push('');
    sections.push(`Your output must be valid JSON following the provided schema.`);
    sections.push('Each documentation entry should contain semantic information only - no Markdown formatting.');
    sections.push('');

    sections.push(`## Symbols to Document`);
    sections.push('');

    items.forEach((item, index) => {
      sections.push(`### Symbol ${index + 1}: ${item.symbolName}`);
      sections.push('```typescript');
      sections.push(item.signatureText);
      sections.push('```');
      sections.push('');
    });

    sections.push(`## Instructions`);
    sections.push('');
    sections.push('For EACH symbol, provide:');
    sections.push('');
    sections.push('1. **symbolName**: The exact name of the symbol');
    sections.push('2. **purpose**: A clear explanation of what this symbol does (1-2 sentences)');
    sections.push('3. **parameters** (if applicable): Array of parameter objects with:');
    sections.push('   - name: parameter name');
    sections.push('   - type: TypeScript type');
    sections.push('   - description: what this parameter does');
    sections.push('   - optional: true/false');
    sections.push('4. **returnType** (if applicable): Object with:');
    sections.push('   - type: TypeScript return type');
    sections.push('   - description: what is returned');
    sections.push('5. **usageExample** (optional): TypeScript code showing how to use this symbol');
    sections.push('   - Plain TypeScript code only, NO markdown code fences');
    sections.push('   - Keep it concise (2-5 lines)');
    sections.push('6. **notes** (optional): Array of important notes or caveats');
    sections.push('');
    sections.push('CRITICAL:');
    sections.push('- Output valid JSON matching the schema');
    sections.push('- Do NOT include Markdown syntax (**, ##, etc.) in text fields');
    sections.push('- Do NOT include code fences in usageExample (just the code)');
    sections.push('- Extract parameter info from the signature accurately');

    return sections.join('\n');
  }

  /**
   * Extract the main changes between two signatures
   */
  static summarizeChanges(oldSignature: string, newSignature: string): string {
    const changes: string[] = [];

    // Simple heuristic-based change detection
    if (oldSignature.includes('function') && newSignature.includes('function')) {
      // Check parameter changes
      const oldParams = this.extractParameters(oldSignature);
      const newParams = this.extractParameters(newSignature);

      if (oldParams !== newParams) {
        changes.push('Parameters have changed');
      }
    }

    // Check return type changes
    const oldReturn = this.extractReturnType(oldSignature);
    const newReturn = this.extractReturnType(newSignature);

    if (oldReturn !== newReturn) {
      changes.push('Return type has changed');
    }

    if (changes.length === 0) {
      changes.push('Signature has been modified');
    }

    return changes.join(', ');
  }

  /**
   * Extract parameters from a TypeScript signature (simple regex)
   */
  private static extractParameters(signature: string): string {
    const match = signature.match(/\((.*?)\)/);
    return match ? match[1] : '';
  }

  /**
   * Extract return type from a TypeScript signature (simple regex)
   */
  private static extractReturnType(signature: string): string {
    const match = signature.match(/:\s*([^{;]+)/);
    return match ? match[1].trim() : '';
  }
}
