/**
 * Retry utility for async operations
 */

export interface RetryOptions {
  /** Maximum number of retries (default: 3) */
  retries?: number;
  /** Initial delay in ms (default: 1000) */
  minTimeout?: number;
  /** Factor to multiply delay by (default: 2) */
  factor?: number;
  /** Callback on retry attempt */
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Execute a function with retries and exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    minTimeout = 1000,
    factor = 2,
    onRetry,
  } = options;

  let attempt = 0;
  let timeout = minTimeout;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      
      if (attempt > retries) {
        throw error;
      }

      const err = error instanceof Error ? error : new Error(String(error));
      
      if (onRetry) {
        onRetry(err, attempt);
      }

      await new Promise(resolve => setTimeout(resolve, timeout));
      timeout *= factor;
    }
  }
}
