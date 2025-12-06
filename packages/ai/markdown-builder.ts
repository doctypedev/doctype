/**
 * Deterministic Markdown builder from structured documentation
 *
 * This module takes structured JSON documentation and builds consistent,
 * well-formatted Markdown output using templates. This approach eliminates
 * JSON artifacts and ensures all documentation follows the same format.
 */

import type { DocumentationStructure, Parameter, ReturnTypeInfo } from './structured-schema';

/**
 * Build Markdown documentation from structured data
 *
 * This is the core function that converts JSON structure to Markdown.
 * The template is deterministic - the same input always produces the same output.
 */
export function buildMarkdownFromStructure(doc: DocumentationStructure): string {
  const parts: string[] = [];

  // 1. Purpose (always present)
  parts.push(`**Purpose:** ${doc.purpose}`);

  // 2. Parameters (if present)
  if (doc.parameters && doc.parameters.length > 0) {
    parts.push('');
    parts.push('**Parameters:**');
    doc.parameters.forEach(param => {
      parts.push(formatParameter(param));
    });
  }

  // 3. Return Type (if present)
  if (doc.returnType) {
    parts.push('');
    parts.push(formatReturnType(doc.returnType));
  }

  // 4. Usage Example (if present)
  if (doc.usageExample) {
    parts.push('');
    parts.push('**Usage Example:**');
    parts.push('```typescript');
    parts.push(doc.usageExample.trim());
    parts.push('```');
  }

  // 5. Notes (if present)
  if (doc.notes && doc.notes.length > 0) {
    parts.push('');
    parts.push('**Notes:**');
    doc.notes.forEach(note => {
      parts.push(`- ${note}`);
    });
  }

  return parts.join('\n');
}

/**
 * Format a single parameter
 */
function formatParameter(param: Parameter): string {
  const parts: string[] = [`- \`${param.name}\``];

  // Add optional marker
  if (param.optional) {
    parts.push('(optional)');
  }

  // Add type
  parts.push(`(\`${param.type}\`):`);

  // Add description
  parts.push(param.description);

  // Add default value if present
  if (param.defaultValue) {
    parts.push(`Default: \`${param.defaultValue}\``);
  }

  return parts.join(' ');
}

/**
 * Format return type information
 */
function formatReturnType(returnType: ReturnTypeInfo): string {
  return `**Returns:** \`${returnType.type}\` - ${returnType.description}`;
}

/**
 * Build markdown for multiple symbols (used in batch generation)
 */
export function buildBatchMarkdown(
  docs: DocumentationStructure[]
): Array<{ symbolName: string; content: string }> {
  return docs.map(doc => ({
    symbolName: doc.symbolName,
    content: buildMarkdownFromStructure(doc),
  }));
}
