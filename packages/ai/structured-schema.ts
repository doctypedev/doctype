/**
 * Structured schema for AI-generated documentation
 *
 * This schema enforces a strict structure that prevents JSON artifacts
 * and ensures consistent, deterministic Markdown output.
 */

import { z } from 'zod';

/**
 * Schema for a single parameter
 */
export const ParameterSchema = z.object({
  name: z.string().trim().min(1, 'Parameter name cannot be empty').describe('Parameter name'),
  type: z.string().trim().min(1, 'Parameter type cannot be empty').describe('TypeScript type of the parameter'),
  description: z.string().trim().min(1, 'Parameter description cannot be empty').describe('Brief description of what this parameter does'),
  optional: z.boolean().optional().describe('Whether this parameter is optional'),
  defaultValue: z.string().trim().optional().describe('Default value if any'),
});

export type Parameter = z.infer<typeof ParameterSchema>;

/**
 * Schema for return type information
 */
export const ReturnTypeSchema = z.object({
  type: z.string().trim().min(1, 'Return type cannot be empty').describe('TypeScript return type'),
  description: z.string().trim().min(1, 'Return type description cannot be empty').describe('Description of what is returned'),
});

export type ReturnTypeInfo = z.infer<typeof ReturnTypeSchema>;

/**
 * Schema for a single documentation entry
 */
export const DocumentationStructureSchema = z.object({
  symbolName: z.string().trim().min(1, 'Symbol name cannot be empty').describe('Name of the symbol being documented'),
  purpose: z.string().trim().min(1, 'Purpose cannot be empty').describe('Brief explanation of what this symbol does and why it exists'),
  parameters: z.array(ParameterSchema).optional().describe('List of parameters (for functions/methods)'),
  returnType: ReturnTypeSchema.optional().describe('Return type information (for functions/methods)'),
  usageExample: z.string().trim().optional().describe('TypeScript code example showing how to use this symbol'),
  notes: z.array(z.string().trim().min(1, 'Note cannot be empty')).optional().describe('Additional notes, caveats, or important information'),
});

export type DocumentationStructure = z.infer<typeof DocumentationStructureSchema>;

/**
 * Schema for batch documentation generation
 */
export const BatchDocumentationStructureSchema = z.object({
  documentations: z.array(DocumentationStructureSchema),
});

export type BatchDocumentationStructure = z.infer<typeof BatchDocumentationStructureSchema>;

/**
 * Schema for properties (interfaces, classes)
 */
export const PropertySchema = z.object({
  name: z.string().trim().min(1, 'Property name cannot be empty').describe('Property name'),
  type: z.string().trim().min(1, 'Property type cannot be empty').describe('TypeScript type'),
  description: z.string().trim().min(1, 'Property description cannot be empty').describe('What this property represents'),
  optional: z.boolean().optional().describe('Whether this property is optional'),
  readonly: z.boolean().optional().describe('Whether this property is readonly'),
});

export type Property = z.infer<typeof PropertySchema>;

/**
 * Extended schema for complex types (classes, interfaces)
 */
export const ExtendedDocumentationSchema = DocumentationStructureSchema.extend({
  properties: z.array(PropertySchema).optional().describe('Properties for classes/interfaces'),
  methods: z.array(DocumentationStructureSchema).optional().describe('Methods for classes'),
  extends: z.string().optional().describe('Parent class or extended interfaces'),
  implements: z.array(z.string()).optional().describe('Implemented interfaces'),
});

export type ExtendedDocumentation = z.infer<typeof ExtendedDocumentationSchema>;
