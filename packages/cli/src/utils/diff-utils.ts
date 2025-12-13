
/**
 * Filters out noisy files from the git diff to save tokens and improve focus.
 * 
 * @param fullDiff The raw git diff string
 * @param excludePatterns Optional list of patterns (strings or regex) to exclude if matched in the filename
 */
export function filterGitDiff(fullDiff: string, excludePatterns: string[] = []): string {
    if (!fullDiff) return '';

    // Standard noise patterns
    const noisePatterns = [
        'package-lock.json',
        'pnpm-lock.yaml',
        'yarn.lock',
        '.map',
        '.snap',
        '.DS_Store'
    ];

    const chunks = fullDiff.split('diff --git ');
    const keptChunks: string[] = [];

    for (const chunk of chunks) {
        if (!chunk.trim()) continue;

        // Check the first line for filename
        // diff --git a/src/foo.ts b/src/foo.ts
        const firstLine = chunk.split('\n')[0];

        // 1. Filter standard noise
        if (noisePatterns.some(pattern => firstLine.includes(pattern))) {
            continue;
        }

        // 2. Filter custom patterns (e.g. self-trigger prevention)
        if (excludePatterns.some(pattern => firstLine.toLowerCase().includes(pattern.toLowerCase()))) {
            continue;
        }

        keptChunks.push('diff --git ' + chunk);
    }

    return keptChunks.join('\n');
}
