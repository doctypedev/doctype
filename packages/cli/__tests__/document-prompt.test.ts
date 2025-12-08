import { describe, it, expect } from 'vitest';
import { PromptBuilder } from '../prompts/document-prompt';

describe('PromptBuilder', () => {
    it('should build structured single prompt', () => {
        const prompt = PromptBuilder.buildStructuredSinglePrompt(
            'myFunc',
            'function myFunc(): void',
            'Old docs'
        );
        expect(prompt).toContain('Generate structured documentation for: **myFunc**');
        expect(prompt).toContain('function myFunc(): void');
        expect(prompt).toContain('Old docs');
    });

    it('should build system prompt', () => {
        const prompt = PromptBuilder.buildStructuredSystemPrompt();
        expect(prompt).toContain('You are a technical documentation expert');
    });
});
