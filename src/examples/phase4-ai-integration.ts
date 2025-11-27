/**
 * Phase 4 Integration Example - AI-Powered Documentation Generation
 *
 * This example demonstrates how to use the AI Agent to generate
 * documentation for code changes using OpenAI or Gemini APIs.
 */

import { createOpenAIAgent, createAgentFromEnv } from '../ai';
import { ASTAnalyzer } from '../core/ast-analyzer';
import { SignatureHasher } from '../core/signature-hasher';
import { CodeSignature } from '../core/types';

/**
 * Example 1: Create an AI Agent with explicit OpenAI configuration
 */
async function example1_createOpenAIAgent() {
  console.log('\n=== Example 1: Create OpenAI Agent ===\n');

  // Create an agent with OpenAI API key
  const agent = createOpenAIAgent(
    'your-openai-api-key', // Replace with actual API key or use environment variable
    'gpt-4', // Model ID
    {
      maxTokens: 1000,
      temperature: 0.3,
      timeout: 30000,
      debug: true,
    }
  );

  console.log('Agent created:', agent.getConfig());
}

/**
 * Example 2: Create an AI Agent from environment variables
 */
async function example2_createFromEnv() {
  console.log('\n=== Example 2: Create Agent from Environment ===\n');

  // This will use OPENAI_API_KEY or GEMINI_API_KEY from environment
  try {
    const agent = createAgentFromEnv({
      modelId: 'gpt-4',
      debug: true,
    });

    console.log('Agent created from env:', agent.getConfig());

    // Validate connection
    const isConnected = await agent.validateConnection();
    console.log('Connection valid:', isConnected);
  } catch (error) {
    console.error('Failed to create agent from env:', error);
  }
}

/**
 * Example 3: Generate documentation for a code change
 */
async function example3_generateDocumentation() {
  console.log('\n=== Example 3: Generate Documentation ===\n');

  const agent = createAgentFromEnv({ modelId: 'gpt-4' });

  // Old signature (before change)
  const oldSignature: CodeSignature = {
    symbolName: 'login',
    symbolType: 'function' as any,
    signatureText: 'export function login(email: string): Promise<string>',
    isExported: true,
  };

  // New signature (after change)
  const newSignature: CodeSignature = {
    symbolName: 'login',
    symbolType: 'function' as any,
    signatureText: 'export function login(email: string, password: string): Promise<string>',
    isExported: true,
  };

  // Old documentation
  const oldDocs = `
Authenticates a user with their email address.

**Parameters:**
- \`email\` (string): User's email address

**Returns:**
- \`Promise<string>\`: Authentication token
`;

  try {
    const newDocs = await agent.generateFromDrift(
      'login',
      oldSignature,
      newSignature,
      oldDocs,
      'src/auth/login.ts'
    );

    console.log('Generated documentation:');
    console.log('─'.repeat(60));
    console.log(newDocs);
    console.log('─'.repeat(60));
  } catch (error) {
    console.error('Failed to generate documentation:', error);
  }
}

/**
 * Example 4: Generate initial documentation (no previous docs)
 */
async function example4_generateInitial() {
  console.log('\n=== Example 4: Generate Initial Documentation ===\n');

  const agent = createAgentFromEnv({ modelId: 'gpt-4' });

  const signature: CodeSignature = {
    symbolName: 'calculateDiscount',
    symbolType: 'function' as any,
    signatureText: 'export function calculateDiscount(price: number, percentage: number): number',
    isExported: true,
  };

  try {
    const docs = await agent.generateInitial('calculateDiscount', signature);

    console.log('Generated documentation:');
    console.log('─'.repeat(60));
    console.log(docs);
    console.log('─'.repeat(60));
  } catch (error) {
    console.error('Failed to generate initial documentation:', error);
  }
}

/**
 * Example 5: Complete workflow with AST analysis
 */
async function example5_completeWorkflow() {
  console.log('\n=== Example 5: Complete Workflow ===\n');

  // Analyze a TypeScript file
  const analyzer = new ASTAnalyzer();
  const hasher = new SignatureHasher();

  const filePath = './src/examples/example-code.ts';
  console.log(`Analyzing ${filePath}...`);

  const signatures = analyzer.analyzeFile(filePath);
  console.log(`Found ${signatures.length} exported symbols`);

  if (signatures.length > 0) {
    const signature = signatures[0];
    console.log(`\nGenerating docs for: ${signature.symbolName}`);
    console.log(`Signature: ${signature.signatureText}`);

    // Generate hash
    const hash = hasher.hash(signature);
    console.log(`Hash: ${hash.hash}`);

    // Generate documentation with AI
    try {
      const agent = createAgentFromEnv({ modelId: 'gpt-4' });
      const docs = await agent.generateInitial(
        signature.symbolName,
        signature,
        {
          includeExamples: true,
          style: 'detailed',
        }
      );

      console.log('\nGenerated documentation:');
      console.log('─'.repeat(60));
      console.log(docs);
      console.log('─'.repeat(60));
    } catch (error) {
      console.error('AI generation failed:', error);
    }
  }
}

/**
 * Example 6: Error handling and retry logic
 */
async function example6_errorHandling() {
  console.log('\n=== Example 6: Error Handling ===\n');

  try {
    const agent = createOpenAIAgent(
      'invalid-api-key',
      'gpt-4',
      { debug: true }
    );

    const signature: CodeSignature = {
      symbolName: 'test',
      symbolType: 'function' as any,
      signatureText: 'export function test(): void',
      isExported: true,
    };

    // This will fail with invalid API key
    await agent.generateInitial('test', signature);
  } catch (error) {
    console.log('Caught error (expected):', error);
  }
}

// Main function to run all examples
async function main() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║  Phase 4: AI Integration Examples        ║');
  console.log('╚═══════════════════════════════════════════╝');

  // Note: Comment out examples that require API keys if not available
  await example1_createOpenAIAgent();
  // await example2_createFromEnv();
  // await example3_generateDocumentation();
  // await example4_generateInitial();
  // await example5_completeWorkflow();
  // await example6_errorHandling();

  console.log('\n✓ Examples completed');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  example1_createOpenAIAgent,
  example2_createFromEnv,
  example3_generateDocumentation,
  example4_generateInitial,
  example5_completeWorkflow,
  example6_errorHandling,
};
