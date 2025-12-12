import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmartChecker } from '../src/services/smart-checker';
import { Logger } from '../src/utils/logger';
import { ChangeAnalysisService } from '../src/services/analysis-service';
import * as fs from 'fs';
import * as path from 'path';
import { createAIAgentsFromEnv } from '../../ai'; // Import here to get a reference to the mock

// Mock dependencies
vi.mock('../src/services/analysis-service');
vi.mock('fs');
vi.mock('path');

// Global mock for '../../ai' - just mock the function, implementation will be in beforeEach
vi.mock('../../ai', () => ({
    createAIAgentsFromEnv: vi.fn(), 
}));

describe('SmartChecker', () => {
    let logger: Logger;
    let smartChecker: SmartChecker;

    // Declare mocks that need to be reset
    let mockPlannerAgent: any;
    let mockWriterAgent: any;

    beforeEach(() => {
        // Reset all mocks, including call history
        vi.resetAllMocks();
        vi.clearAllMocks(); // Ensure all mocks are fresh

        // Define mock agents for each test run
        mockPlannerAgent = {
            validateConnection: vi.fn().mockResolvedValue(true),
            generateText: vi.fn(),
            getProvider: vi.fn().mockReturnValue('mock-provider'),
            getModelId: vi.fn().mockReturnValue('mock-planner-model'),
        };
        mockWriterAgent = {
            validateConnection: vi.fn().mockResolvedValue(true),
            generateText: vi.fn(),
            getProvider: vi.fn().mockReturnValue('mock-provider'),
            getModelId: vi.fn().mockReturnValue('mock-writer-model'),
        };
        const mockAiAgents = {
            planner: mockPlannerAgent,
            writer: mockWriterAgent,
        };

        // Mock createAIAgentsFromEnv to return our fresh mockAiAgents for each test
        vi.mocked(createAIAgentsFromEnv).mockReturnValue(mockAiAgents);

        // Setup generic mock implementations for other dependencies
        logger = new Logger(false);
        smartChecker = new SmartChecker(logger, '/mock/root');

        // Mock fs functions - default is no README
        vi.mocked(fs.existsSync).mockImplementation((p: string) => p.includes('README.md') ? true : false);
        vi.mocked(fs.readFileSync).mockReturnValue(''); // Default to empty content

        // Mock path.resolve
        vi.mocked(path).resolve.mockImplementation((...args: string[]) => {
            const joined = args.join('/');
            return joined.startsWith('/') ? joined : `/${joined}`;
        });
    });

    it('should return no drift if README does not exist', async () => {
        vi.mocked(fs.existsSync).mockImplementation((p: string) => p.includes('README.md') ? false : false); // Explicitly ensure README doesn't exist

        const result = await smartChecker.checkReadme();

        expect(result.hasDrift).toBe(false);
        expect(fs.existsSync).toHaveBeenCalledWith('/mock/root/README.md');
        expect(vi.mocked(createAIAgentsFromEnv)).not.toHaveBeenCalled(); // No AI needed
    });

    it('should return no drift if there are no code changes', async () => {
        // Mock AnalysisService to return empty diff
        const mockAnalysisService = {
            analyze: vi.fn().mockResolvedValue({
                gitDiff: '',
                changedFiles: [],
                symbolChanges: [],
                totalChanges: 0
            })
        };
        vi.mocked(ChangeAnalysisService).mockImplementation(() => mockAnalysisService);

        smartChecker = new SmartChecker(logger, '/mock/root'); // Re-instantiate to get fresh mocks for analysisService

        const result = await smartChecker.checkReadme();

        expect(result.hasDrift).toBe(false);
        expect(mockAnalysisService.analyze).toHaveBeenCalled();
        expect(vi.mocked(createAIAgentsFromEnv)).not.toHaveBeenCalled(); // AI not called due to no changes
    });

    it('should detect drift if AI says so', async () => {
        vi.mocked(fs.existsSync).mockImplementation((p: string) => p.includes('README.md') ? true : false); // README exists
        vi.mocked(fs.readFileSync).mockReturnValue('# Readme Content');

        // Mock AnalysisService
        const mockAnalysisService = {
            analyze: vi.fn().mockResolvedValue({
                gitDiff: '+export class NewFeature {}',
                changedFiles: ['src/code.ts'],
                symbolChanges: [],
                totalChanges: 1
            })
        };
        vi.mocked(ChangeAnalysisService).mockImplementation(() => mockAnalysisService);

        // Explicitly set the mock return value for generateText here, specific to this test
        vi.mocked(mockPlannerAgent.generateText).mockResolvedValue(JSON.stringify({
            hasDrift: true,
            reason: 'Missing docs',
            suggestion: 'Add docs'
        }));
        
        smartChecker = new SmartChecker(logger, '/mock/root'); // Re-instantiate to get fresh mocks for analysisService
        const result = await smartChecker.checkReadme();

        expect(result.hasDrift).toBe(true);
        expect(result.reason).toBe('Missing docs');
        expect(vi.mocked(createAIAgentsFromEnv)).toHaveBeenCalledTimes(1);
        expect(vi.mocked(mockPlannerAgent.validateConnection)).toHaveBeenCalledTimes(1);
        expect(vi.mocked(mockPlannerAgent.generateText)).toHaveBeenCalledTimes(1);
    });
});