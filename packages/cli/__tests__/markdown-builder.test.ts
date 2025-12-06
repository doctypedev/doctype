/**
 * Tests for Markdown Builder
 */

import { buildMarkdownFromStructure } from '../../ai/markdown-builder';
import type { DocumentationStructure } from '../../ai/structured-schema';

describe('Markdown Builder', () => {
  describe('buildMarkdownFromStructure', () => {
    it('should build markdown for a simple function with purpose only', () => {
      const doc: DocumentationStructure = {
        symbolName: 'simpleFunction',
        purpose: 'This function performs a simple operation',
      };

      const result = buildMarkdownFromStructure(doc);

      expect(result).toBe('**Purpose:** This function performs a simple operation');
    });

    it('should build markdown with parameters', () => {
      const doc: DocumentationStructure = {
        symbolName: 'addNumbers',
        purpose: 'Adds two numbers together',
        parameters: [
          {
            name: 'a',
            type: 'number',
            description: 'The first number',
          },
          {
            name: 'b',
            type: 'number',
            description: 'The second number',
          },
        ],
      };

      const result = buildMarkdownFromStructure(doc);

      expect(result).toContain('**Purpose:** Adds two numbers together');
      expect(result).toContain('**Parameters:**');
      expect(result).toContain('- `a` (`number`): The first number');
      expect(result).toContain('- `b` (`number`): The second number');
    });

    it('should build markdown with optional parameters', () => {
      const doc: DocumentationStructure = {
        symbolName: 'greet',
        purpose: 'Greets a user',
        parameters: [
          {
            name: 'name',
            type: 'string',
            description: 'The user name',
          },
          {
            name: 'greeting',
            type: 'string',
            description: 'Custom greeting message',
            optional: true,
            defaultValue: 'Hello',
          },
        ],
      };

      const result = buildMarkdownFromStructure(doc);

      expect(result).toContain('- `name` (`string`): The user name');
      expect(result).toContain('- `greeting` (optional) (`string`): Custom greeting message Default: `Hello`');
    });

    it('should build markdown with return type', () => {
      const doc: DocumentationStructure = {
        symbolName: 'calculate',
        purpose: 'Performs a calculation',
        returnType: {
          type: 'number',
          description: 'The calculation result',
        },
      };

      const result = buildMarkdownFromStructure(doc);

      expect(result).toContain('**Purpose:** Performs a calculation');
      expect(result).toContain('**Returns:** `number` - The calculation result');
    });

    it('should build markdown with usage example', () => {
      const doc: DocumentationStructure = {
        symbolName: 'fetchData',
        purpose: 'Fetches data from an API',
        usageExample: 'const data = await fetchData("/api/users");',
      };

      const result = buildMarkdownFromStructure(doc);

      expect(result).toContain('**Purpose:** Fetches data from an API');
      expect(result).toContain('**Usage Example:**');
      expect(result).toContain('```typescript');
      expect(result).toContain('const data = await fetchData("/api/users");');
      expect(result).toContain('```');
    });

    it('should build markdown with notes', () => {
      const doc: DocumentationStructure = {
        symbolName: 'dangerousFunction',
        purpose: 'Performs a potentially dangerous operation',
        notes: [
          'This function modifies global state',
          'Use with caution in production',
        ],
      };

      const result = buildMarkdownFromStructure(doc);

      expect(result).toContain('**Purpose:** Performs a potentially dangerous operation');
      expect(result).toContain('**Notes:**');
      expect(result).toContain('- This function modifies global state');
      expect(result).toContain('- Use with caution in production');
    });

    it('should build complete markdown with all fields', () => {
      const doc: DocumentationStructure = {
        symbolName: 'authenticateUser',
        purpose: 'Authenticates a user with email and password',
        parameters: [
          {
            name: 'email',
            type: 'string',
            description: 'User email address',
          },
          {
            name: 'password',
            type: 'string',
            description: 'User password',
          },
        ],
        returnType: {
          type: 'Promise<User>',
          description: 'A promise that resolves to the authenticated user',
        },
        usageExample: 'const user = await authenticateUser("user@example.com", "password123");',
        notes: ['Throws an error if credentials are invalid'],
      };

      const result = buildMarkdownFromStructure(doc);

      // Check all sections are present
      expect(result).toContain('**Purpose:** Authenticates a user with email and password');
      expect(result).toContain('**Parameters:**');
      expect(result).toContain('- `email` (`string`): User email address');
      expect(result).toContain('- `password` (`string`): User password');
      expect(result).toContain('**Returns:** `Promise<User>` - A promise that resolves to the authenticated user');
      expect(result).toContain('**Usage Example:**');
      expect(result).toContain('```typescript');
      expect(result).toContain('const user = await authenticateUser("user@example.com", "password123");');
      expect(result).toContain('```');
      expect(result).toContain('**Notes:**');
      expect(result).toContain('- Throws an error if credentials are invalid');
    });

    it('should handle multiline usage examples', () => {
      const doc: DocumentationStructure = {
        symbolName: 'complexFunction',
        purpose: 'A complex function with multiple steps',
        usageExample: `const result = complexFunction({
  option1: true,
  option2: "value"
});`,
      };

      const result = buildMarkdownFromStructure(doc);

      expect(result).toContain('```typescript');
      expect(result).toContain('const result = complexFunction({');
      expect(result).toContain('  option1: true,');
      expect(result).toContain('```');
    });

    it('should not include JSON artifacts', () => {
      const doc: DocumentationStructure = {
        symbolName: 'testFunction',
        purpose: 'Test function',
        parameters: [
          {
            name: 'param',
            type: 'string',
            description: 'A parameter',
          },
        ],
      };

      const result = buildMarkdownFromStructure(doc);

      // Ensure no JSON artifacts
      expect(result).not.toContain('},{');
      expect(result).not.toContain('{');
      expect(result).not.toContain('}');
      expect(result).not.toContain('<!--');
      expect(result).not.toContain('-->');
    });
  });
});
