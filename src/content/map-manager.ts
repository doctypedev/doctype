import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname } from 'path';
import { mkdirSync } from 'fs';
import { DoctypeMap, DoctypeMapEntry } from '../core/types';

/**
 * Manages the doctype-map.json file
 *
 * This is the single source of truth for all documentation anchors
 * and their associated code signatures
 */
export class DoctypeMapManager {
  private mapFilePath: string;
  private map: DoctypeMap;

  constructor(mapFilePath: string = './doctype-map.json') {
    this.mapFilePath = mapFilePath;
    this.map = this.load();
  }

  /**
   * Load the doctype-map.json file from disk
   * If file doesn't exist, creates a new empty map
   * @returns The loaded DoctypeMap
   */
  private load(): DoctypeMap {
    if (!existsSync(this.mapFilePath)) {
      return {
        version: '1.0.0',
        entries: [],
      };
    }

    try {
      const content = readFileSync(this.mapFilePath, 'utf-8');
      const map = JSON.parse(content) as DoctypeMap;

      // Validate structure
      if (!map.version || !Array.isArray(map.entries)) {
        throw new Error('Invalid doctype-map.json structure');
      }

      return map;
    } catch (error) {
      throw new Error(`Failed to load doctype-map.json: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save the current map to disk
   */
  public save(): void {
    try {
      // Ensure directory exists
      const dir = dirname(this.mapFilePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      // Write with pretty formatting for human readability
      const content = JSON.stringify(this.map, null, 2);
      writeFileSync(this.mapFilePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save doctype-map.json: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all entries in the map
   * @returns Array of all DoctypeMapEntry objects
   */
  public getEntries(): DoctypeMapEntry[] {
    return [...this.map.entries];
  }

  /**
   * Get a specific entry by ID
   * @param id The unique identifier for the anchor
   * @returns The entry if found, undefined otherwise
   */
  public getEntryById(id: string): DoctypeMapEntry | undefined {
    return this.map.entries.find((entry) => entry.id === id);
  }

  /**
   * Get entries by code reference (file path and symbol name)
   * @param filePath Path to the source code file
   * @param symbolName Name of the symbol
   * @returns Array of entries matching the code reference
   */
  public getEntriesByCodeRef(filePath: string, symbolName: string): DoctypeMapEntry[] {
    return this.map.entries.filter(
      (entry) => entry.codeRef.filePath === filePath && entry.codeRef.symbolName === symbolName
    );
  }

  /**
   * Get entries by documentation file
   * @param filePath Path to the markdown file
   * @returns Array of entries in the specified markdown file
   */
  public getEntriesByDocFile(filePath: string): DoctypeMapEntry[] {
    return this.map.entries.filter((entry) => entry.docRef.filePath === filePath);
  }

  /**
   * Add a new entry to the map
   * @param entry The entry to add
   * @throws Error if an entry with the same ID already exists
   */
  public addEntry(entry: DoctypeMapEntry): void {
    // Check for duplicate ID
    if (this.getEntryById(entry.id)) {
      throw new Error(`Entry with id="${entry.id}" already exists in doctype-map.json`);
    }

    this.map.entries.push(entry);
  }

  /**
   * Update an existing entry in the map
   * @param id The ID of the entry to update
   * @param updates Partial entry with fields to update
   * @throws Error if entry not found
   */
  public updateEntry(id: string, updates: Partial<DoctypeMapEntry>): void {
    const index = this.map.entries.findIndex((entry) => entry.id === id);

    if (index === -1) {
      throw new Error(`Entry with id="${id}" not found in doctype-map.json`);
    }

    // Merge updates with existing entry
    this.map.entries[index] = {
      ...this.map.entries[index],
      ...updates,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Remove an entry from the map
   * @param id The ID of the entry to remove
   * @returns True if removed, false if not found
   */
  public removeEntry(id: string): boolean {
    const index = this.map.entries.findIndex((entry) => entry.id === id);

    if (index === -1) {
      return false;
    }

    this.map.entries.splice(index, 1);
    return true;
  }

  /**
   * Check if a code signature has drifted (hash doesn't match)
   * @param id The ID of the entry to check
   * @param currentHash The current hash of the code signature
   * @returns True if drift detected (hashes don't match), false otherwise
   */
  public hasDrift(id: string, currentHash: string): boolean {
    const entry = this.getEntryById(id);

    if (!entry) {
      throw new Error(`Entry with id="${id}" not found in doctype-map.json`);
    }

    return entry.codeSignatureHash !== currentHash;
  }

  /**
   * Get all entries that have drifted
   * @param currentHashes Map of entry IDs to their current hashes
   * @returns Array of entries that have drifted
   */
  public getDriftedEntries(currentHashes: Map<string, string>): DoctypeMapEntry[] {
    const drifted: DoctypeMapEntry[] = [];

    for (const entry of this.map.entries) {
      const currentHash = currentHashes.get(entry.id);

      if (currentHash && currentHash !== entry.codeSignatureHash) {
        drifted.push(entry);
      }
    }

    return drifted;
  }

  /**
   * Get the total number of entries
   * @returns Count of entries in the map
   */
  public getEntryCount(): number {
    return this.map.entries.length;
  }

  /**
   * Clear all entries (useful for testing)
   */
  public clear(): void {
    this.map.entries = [];
  }

  /**
   * Get the map version
   * @returns Version string
   */
  public getVersion(): string {
    return this.map.version;
  }

  /**
   * Export the entire map (for inspection or backup)
   * @returns A copy of the entire DoctypeMap
   */
  public export(): DoctypeMap {
    return {
      version: this.map.version,
      entries: [...this.map.entries],
    };
  }
}
