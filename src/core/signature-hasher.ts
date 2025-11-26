import { createHash } from 'crypto';
import { CodeSignature, SignatureHash } from './types';

/**
 * Generates deterministic SHA256 hashes from code signatures
 */
export class SignatureHasher {
  /**
   * Generates a SHA256 hash from a code signature
   * @param signature The code signature to hash
   * @returns SignatureHash object containing the hash and metadata
   */
  public hash(signature: CodeSignature): SignatureHash {
    const hash = this.generateHash(signature);
    return {
      hash,
      signature,
      timestamp: Date.now(),
    };
  }

  /**
   * Generates SHA256 hash from multiple signatures (for batching)
   * @param signatures Array of code signatures
   * @returns Array of SignatureHash objects
   */
  public hashMany(signatures: CodeSignature[]): SignatureHash[] {
    return signatures.map((sig) => this.hash(sig));
  }

  /**
   * Compares two signatures and returns true if they match
   * @param hash1 First signature hash
   * @param hash2 Second signature hash
   * @returns True if hashes match, false otherwise
   */
  public compare(hash1: string, hash2: string): boolean {
    return hash1 === hash2;
  }

  /**
   * Generates a deterministic string representation of a signature
   * This ensures the same signature always produces the same hash
   * @param signature The code signature
   * @returns Deterministic string representation
   */
  private serializeSignature(signature: CodeSignature): string {
    // Create a deterministic representation
    // Order matters for hashing, so we use a fixed structure
    const parts = [
      `name:${signature.symbolName}`,
      `type:${signature.symbolType}`,
      `exported:${signature.isExported}`,
      `signature:${signature.signatureText}`,
    ];

    return parts.join('|');
  }

  /**
   * Generates SHA256 hash from a code signature
   * @param signature The code signature
   * @returns SHA256 hash string
   */
  private generateHash(signature: CodeSignature): string {
    const serialized = this.serializeSignature(signature);
    return createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Generates a hash directly from signature text (for quick comparison)
   * @param signatureText The signature text
   * @returns SHA256 hash string
   */
  public hashText(signatureText: string): string {
    return createHash('sha256').update(signatureText).digest('hex');
  }
}
