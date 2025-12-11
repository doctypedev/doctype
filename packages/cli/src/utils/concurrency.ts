/**
 * Helper function to limit concurrency (Worker Pool pattern)
 * 
 * Executes a list of tasks with a maximum concurrency limit.
 * Useful for AI generation tasks to avoid rate limits or system overload.
 */
export async function pMap<T, R>(
  items: T[],
  mapper: (item: T) => Promise<R>,
  concurrency: number,
  onProgress?: (completed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  let completed = 0;
  const total = items.length;

  const execThread = async (): Promise<void> => {
    while (index < items.length) {
      const curIndex = index++;
      results[curIndex] = await mapper(items[curIndex]);
      completed++;
      if (onProgress) {
        onProgress(completed, total);
      }
    }
  };
  
  const threads = [];
  for (let i = 0; i < concurrency; i++) {
    threads.push(execThread());
  }
  
  await Promise.all(threads);
  return results;
}
