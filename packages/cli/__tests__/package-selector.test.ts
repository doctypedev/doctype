import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PackageSelector } from '../package-selector';
import { Logger } from '../logger';
import * as clack from '@clack/prompts';

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
    intro: vi.fn(),
    outro: vi.fn(),
    multiselect: vi.fn(),
    isCancel: vi.fn().mockReturnValue(false),
    cancel: vi.fn(),
    log: {
        info: vi.fn(),
    },
}));

describe('PackageSelector', () => {
    let logger: Logger;
    let selector: PackageSelector;

    beforeEach(() => {
        logger = new Logger(false);
        selector = new PackageSelector(logger);
        vi.clearAllMocks();
    });

    it('should use multiselect for interactive selection', async () => {
        const monorepoInfo = {
            isMonorepo: true,
            root: '/root',
            packages: [
                { name: 'pkg-a', path: '/root/pkg-a', relativePath: 'pkg-a', version: '1.0.0', hasChanges: false },
                { name: 'pkg-b', path: '/root/pkg-b', relativePath: 'pkg-b', version: '1.0.0', hasChanges: true },
            ],
            changedPackages: [
                { name: 'pkg-b', path: '/root/pkg-b', relativePath: 'pkg-b', version: '1.0.0', hasChanges: true },
            ],
        };

        // Mock multiselect return value
        (clack.multiselect as any).mockResolvedValue(['pkg-a', 'pkg-b']);

        // Force interactive to bypass auto-selection of single changed package
        const result = await selector.select(monorepoInfo, undefined, true);

        expect(clack.multiselect).toHaveBeenCalled();
        expect(result.packageNames).toEqual(['pkg-a', 'pkg-b']);
        expect(result.automatic).toBe(false);
    });

    it('should auto-select single changed package in monorepo', async () => {
        const monorepoInfo = {
            isMonorepo: true,
            root: '/root',
            packages: [
                { name: 'pkg-a', path: '/root/pkg-a', relativePath: 'pkg-a', version: '1.0.0', hasChanges: false },
                { name: 'pkg-b', path: '/root/pkg-b', relativePath: 'pkg-b', version: '1.0.0', hasChanges: true },
            ],
            changedPackages: [
                { name: 'pkg-b', path: '/root/pkg-b', relativePath: 'pkg-b', version: '1.0.0', hasChanges: true },
            ],
        };

        const result = await selector.select(monorepoInfo);

        expect(clack.multiselect).not.toHaveBeenCalled();
        expect(result.packageNames).toEqual(['pkg-b']);
        expect(result.automatic).toBe(true);
    });

    it('should allow manual override', async () => {
        const monorepoInfo = {
            isMonorepo: true,
            root: '/root',
            packages: [],
            changedPackages: [],
        };

        const result = await selector.select(monorepoInfo, 'pkg-manual');

        expect(result.packageNames).toEqual(['pkg-manual']);
        expect(result.automatic).toBe(false);
    });
});
