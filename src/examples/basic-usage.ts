/**
 * Example: Basic usage of Doctype core modules
 *
 * This example demonstrates how to:
 * 1. Analyze TypeScript code with ASTAnalyzer
 * 2. Generate hashes with SignatureHasher
 * 3. Detect code signature changes
 */

import { ASTAnalyzer } from '../core/ast-analyzer';
import { SignatureHasher } from '../core/signature-hasher';

// Example 1: Analyzing TypeScript code
function example1_analyzeCode() {
  console.log('=== Example 1: Analyzing TypeScript Code ===\n');

  const analyzer = new ASTAnalyzer();

  const code = `
    export function calculateTotal(items: number[]): number {
      return items.reduce((sum, item) => sum + item, 0);
    }

    export interface User {
      id: string;
      name: string;
      email: string;
    }
  `;

  const signatures = analyzer.analyzeCode(code);

  console.log(`Found ${signatures.length} exported symbols:\n`);
  signatures.forEach(sig => {
    console.log(`- ${sig.symbolName} (${sig.symbolType})`);
    console.log(`  Signature: ${sig.signatureText}\n`);
  });
}

// Example 2: Generating and comparing hashes
function example2_hashSignatures() {
  console.log('=== Example 2: Hash Generation ===\n');

  const analyzer = new ASTAnalyzer();
  const hasher = new SignatureHasher();

  const codeV1 = `
    export function processData(input: string): void {
      console.log(input);
    }
  `;

  const codeV2 = `
    export function processData(input: number): void {
      console.log(input);
    }
  `;

  const signaturesV1 = analyzer.analyzeCode(codeV1);
  const signaturesV2 = analyzer.analyzeCode(codeV2);

  const hashV1 = hasher.hash(signaturesV1[0]);
  const hashV2 = hasher.hash(signaturesV2[0]);

  console.log('Version 1 (string parameter):');
  console.log(`  Hash: ${hashV1.hash}\n`);

  console.log('Version 2 (number parameter):');
  console.log(`  Hash: ${hashV2.hash}\n`);

  if (!hasher.compare(hashV1.hash, hashV2.hash)) {
    console.log('⚠️  DRIFT DETECTED: Function signature changed!\n');
  }
}

// Example 3: Detecting drift in a file
function example3_detectDrift() {
  console.log('=== Example 3: Drift Detection ===\n');

  const analyzer = new ASTAnalyzer();
  const hasher = new SignatureHasher();

  // Simulate original code
  const originalCode = `
    export class UserService {
      public getUser(id: string): User {
        return { id, name: 'John', email: 'john@example.com' };
      }
    }
  `;

  // Simulate modified code (return type changed)
  const modifiedCode = `
    export class UserService {
      public async getUser(id: string): Promise<User> {
        return { id, name: 'John', email: 'john@example.com' };
      }
    }
  `;

  const originalSignatures = analyzer.analyzeCode(originalCode);
  const modifiedSignatures = analyzer.analyzeCode(modifiedCode);

  const originalHashes = hasher.hashMany(originalSignatures);
  const modifiedHashes = hasher.hashMany(modifiedSignatures);

  console.log('Checking for changes...\n');

  let driftDetected = false;
  for (let i = 0; i < originalHashes.length; i++) {
    const original = originalHashes[i];
    const modified = modifiedHashes[i];

    if (!hasher.compare(original.hash, modified.hash)) {
      driftDetected = true;
      console.log(`⚠️  DRIFT DETECTED in ${original.signature.symbolName}:`);
      console.log(`  Before: ${original.signature.signatureText}`);
      console.log(`  After:  ${modified.signature.signatureText}\n`);
    }
  }

  if (!driftDetected) {
    console.log('✅ No drift detected. Documentation is in sync!\n');
  }
}

// Run examples
if (require.main === module) {
  example1_analyzeCode();
  example2_hashSignatures();
  example3_detectDrift();
}
