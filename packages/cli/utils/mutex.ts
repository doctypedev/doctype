/**
 * Simple Mutex (Lock) implementation for managing concurrent file access
 * Uses a FIFO Promise chain to ensure fair scheduling and avoid "thundering herd".
 */
export class FileMutex {
  private queues: Map<string, Promise<void>> = new Map();

  /**
   * Execute a task exclusively for a given file path.
   * Tasks are executed in FIFO order.
   */
  async run<T>(filePath: string, task: () => Promise<T>): Promise<T> {
    // Get existing queue or start a new chain
    const previousTask = this.queues.get(filePath) || Promise.resolve();

    // Create the next link in the chain
    // We catch errors from previousTask to ensure the chain continues even if a task fails
    const nextTask = previousTask.catch(() => {}).then(async () => {
       return task();
    });

    // Create a wrapper promise for the queue map that resolves regardless of success/failure
    // This is what the NEXT task will wait on
    const completionPromise = nextTask.then(() => {}).catch(() => {});
    
    // Update the queue
    this.queues.set(filePath, completionPromise);

    // Cleanup: if we are the last task in the queue, remove the entry
    completionPromise.finally(() => {
      // Check if the current tail of the queue is still our promise
      if (this.queues.get(filePath) === completionPromise) {
        this.queues.delete(filePath);
      }
    });

    // Return the result of the task (or propagate its error)
    return nextTask;
  }
}
