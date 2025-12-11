import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmartChecker } from '../src/services/smart-checker';
import { Logger } from '../src/utils/logger';
import { ChangeAnalysisService } from '../src/services/analysis-service';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
vi.mock('../src/services/analysis-service');
vi.mock('../../ai', () => ({
    createAgentFromEnv: vi.fn(),
}));
vi.mock('fs');
vi.mock('path');

import { createAgentFromEnv } from '../../ai';

describe('SmartChecker', () => {
    let logger: Logger;
    let smartChecker: SmartChecker;

    beforeEach(() => {
        // Reset mocks
        vi.resetAllMocks();

        // Setup generic mock implementations
        logger = new Logger(false);
        smartChecker = new SmartChecker(logger, '/mock/root');

        // Mock resolve to just join paths
        vi.mocked(path.resolve).mockImplementation((...args) => args.join('/'));
    });

    it('should return no drift if README does not exist', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = await smartChecker.checkReadme();

        expect(result.hasDrift).toBe(false);
        expect(fs.existsSync).toHaveBeenCalledWith('/mock/root/README.md');
    });

    it('should return no drift if there are no code changes', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);

        // Mock AnalysisService to return empty diff
        const mockAnalysisService = {
            analyze: vi.fn().mockResolvedValue({
                gitDiff: '',
                changedFiles: [],
                symbolChanges: [],
                totalChanges: 0
            })
        };
        (ChangeAnalysisService as any).mockImplementation(() => mockAnalysisService);

        // Re-instantiate to use the mock
        smartChecker = new SmartChecker(logger, '/mock/root');

        const result = await smartChecker.checkReadme();

        expect(result.hasDrift).toBe(false);
    });

    it('should detect drift if AI says so', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue('# Readme');

        // Mock AnalysisService
        const mockAnalysisService = {
            analyze: vi.fn().mockResolvedValue({
                gitDiff: '+export class NewFeature {}',
                changedFiles: ['src/code.ts'],
                symbolChanges: [],
                totalChanges: 1
            })
        };
        (ChangeAnalysisService as any).mockImplementation(() => mockAnalysisService);

        // Mock AI Agent
        const mockAgent = {
            validateConnection: vi.fn().mockResolvedValue(true),
            generateText: vi.fn().mockResolvedValue(JSON.stringify({
                hasDrift: true,
                reason: 'Missing docs',
                suggestion: 'Add docs'
            }))
        };
        (createAgentFromEnv as any).mockReturnValue(mockAgent);

        smartChecker = new SmartChecker(logger, '/mock/root');
        const result = await smartChecker.checkReadme();

        expect(result.hasDrift).toBe(true);
        expect(result.reason).toBe('Missing docs');
    });
});
