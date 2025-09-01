import CircuitBreaker from 'opossum';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/resilience.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  factor?: number;
  shouldRetry?: (error: any) => boolean;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  rollingCountTimeout?: number;
  rollingCountBuckets?: number;
  name?: string;
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    shouldRetry = () => true
  } = config;

  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry this error
      if (!shouldRetry(error)) {
        throw error;
      }
      
      // Don't delay after the last attempt
      if (attempt < maxRetries - 1) {
        const delay = Math.min(
          initialDelay * Math.pow(factor, attempt),
          maxDelay
        );
        
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.3 * delay;
        const totalDelay = delay + jitter;
        
        logger.info(`Retry attempt ${attempt + 1}/${maxRetries} after ${totalDelay}ms`, {
          error: error.message
        });
        
        await new Promise(resolve => setTimeout(resolve, totalDelay));
      }
    }
  }
  
  logger.error(`All ${maxRetries} retry attempts failed`, {
    error: lastError.message
  });
  
  throw lastError;
}

/**
 * Create a circuit breaker for a function
 */
export function createCircuitBreaker<T>(
  fn: (...args: any[]) => Promise<T>,
  config: CircuitBreakerConfig = {}
): CircuitBreaker<T> {
  const {
    timeout = 3000,
    errorThresholdPercentage = 50,
    resetTimeout = 30000,
    rollingCountTimeout = 10000,
    rollingCountBuckets = 10,
    name = 'circuit-breaker'
  } = config;

  const options = {
    timeout,
    errorThresholdPercentage,
    resetTimeout,
    rollingCountTimeout,
    rollingCountBuckets,
    name
  };

  const breaker = new CircuitBreaker(fn, options);

  // Set up event listeners
  breaker.on('open', () => {
    logger.error(`Circuit breaker ${name} opened`);
  });

  breaker.on('halfOpen', () => {
    logger.info(`Circuit breaker ${name} half-open, testing...`);
  });

  breaker.on('close', () => {
    logger.info(`Circuit breaker ${name} closed`);
  });

  breaker.on('timeout', () => {
    logger.warn(`Circuit breaker ${name} timeout`);
  });

  breaker.on('reject', () => {
    logger.warn(`Circuit breaker ${name} rejected request`);
  });

  breaker.on('failure', (error) => {
    logger.error(`Circuit breaker ${name} failure`, { error: error.message });
  });

  breaker.on('success', () => {
    logger.debug(`Circuit breaker ${name} success`);
  });

  return breaker;
}

/**
 * Resilient database query wrapper
 */
export class ResilientDatabase {
  private circuitBreakers: Map<string, CircuitBreaker<any>> = new Map();

  /**
   * Execute a database query with retry and circuit breaker
   */
  async query<T>(
    name: string,
    queryFn: () => Promise<T>,
    options: {
      retry?: RetryConfig;
      circuitBreaker?: CircuitBreakerConfig;
    } = {}
  ): Promise<T> {
    // Get or create circuit breaker for this query
    let breaker = this.circuitBreakers.get(name);
    if (!breaker) {
      const wrappedFn = async () => {
        return await retryWithBackoff(queryFn, {
          maxRetries: 3,
          initialDelay: 100,
          maxDelay: 1000,
          shouldRetry: (error) => {
            // Retry on connection errors or timeouts
            const message = error.message?.toLowerCase() || '';
            return message.includes('connection') ||
                   message.includes('timeout') ||
                   message.includes('econnrefused') ||
                   message.includes('enotfound');
          },
          ...options.retry
        });
      };

      breaker = createCircuitBreaker(wrappedFn, {
        name: `db-${name}`,
        timeout: 5000,
        errorThresholdPercentage: 30,
        resetTimeout: 60000,
        ...options.circuitBreaker
      });

      this.circuitBreakers.set(name, breaker);
    }

    try {
      return await breaker.fire();
    } catch (error) {
      // If circuit is open, try to provide a fallback
      if (breaker.opened) {
        logger.error(`Circuit open for query ${name}, using fallback`);
        throw new Error(`Database temporarily unavailable for ${name}`);
      }
      throw error;
    }
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(name?: string): any {
    if (name) {
      const breaker = this.circuitBreakers.get(name);
      return breaker ? breaker.stats : null;
    }

    const stats: any = {};
    this.circuitBreakers.forEach((breaker, key) => {
      stats[key] = breaker.stats;
    });
    return stats;
  }

  /**
   * Reset a circuit breaker
   */
  reset(name?: string): void {
    if (name) {
      const breaker = this.circuitBreakers.get(name);
      if (breaker) {
        breaker.close();
      }
    } else {
      this.circuitBreakers.forEach(breaker => {
        breaker.close();
      });
    }
  }
}

/**
 * Resilient API client with retry and circuit breaker
 */
export class ResilientApiClient {
  private circuitBreakers: Map<string, CircuitBreaker<any>> = new Map();

  /**
   * Make an API call with resilience patterns
   */
  async request<T>(
    name: string,
    requestFn: () => Promise<T>,
    options: {
      retry?: RetryConfig;
      circuitBreaker?: CircuitBreakerConfig;
      fallback?: () => T;
    } = {}
  ): Promise<T> {
    let breaker = this.circuitBreakers.get(name);
    
    if (!breaker) {
      const wrappedFn = async () => {
        return await retryWithBackoff(requestFn, {
          maxRetries: 3,
          initialDelay: 500,
          maxDelay: 5000,
          shouldRetry: (error) => {
            // Don't retry on client errors (4xx)
            if (error.response?.status >= 400 && error.response?.status < 500) {
              return false;
            }
            return true;
          },
          ...options.retry
        });
      };

      breaker = createCircuitBreaker(wrappedFn, {
        name: `api-${name}`,
        timeout: 10000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        ...options.circuitBreaker
      });

      // Set up fallback if provided
      if (options.fallback) {
        breaker.fallback(options.fallback);
      }

      this.circuitBreakers.set(name, breaker);
    }

    return await breaker.fire();
  }

  /**
   * Health check for all circuit breakers
   */
  isHealthy(): boolean {
    for (const [name, breaker] of this.circuitBreakers) {
      if (breaker.opened) {
        logger.warn(`Circuit breaker ${name} is open`);
        return false;
      }
    }
    return true;
  }
}

// Export singleton instances
export const resilientDatabase = new ResilientDatabase();
export const resilientApiClient = new ResilientApiClient();

/**
 * Timeout wrapper for promises
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

/**
 * Bulkhead pattern - limit concurrent executions
 */
export class Bulkhead {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private maxConcurrent: number) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    while (this.running >= this.maxConcurrent) {
      await new Promise<void>(resolve => {
        this.queue.push(resolve);
      });
    }

    this.running++;

    try {
      return await fn();
    } finally {
      this.running--;
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }

  get utilization(): number {
    return this.running / this.maxConcurrent;
  }

  get queueLength(): number {
    return this.queue.length;
  }
}