import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import winston from 'winston';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/rate-limit.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// Create Redis client if available, fallback to memory
let rateLimiter: RateLimiterRedis | RateLimiterMemory;

if (process.env.REDIS_URL) {
  const redisClient = new Redis(process.env.REDIS_URL);
  
  redisClient.on('error', (err) => {
    logger.error('Redis error:', err);
  });

  // Different rate limiters for different endpoints
  const rateLimiters = {
    // Strict limit for room creation
    createRoom: new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl:create',
      points: 5, // 5 requests
      duration: 3600, // per hour
      blockDuration: 3600, // block for 1 hour
    }),

    // Moderate limit for joining rooms
    joinRoom: new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl:join',
      points: 20, // 20 requests
      duration: 60, // per minute
      blockDuration: 300, // block for 5 minutes
    }),

    // Standard API limit
    api: new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl:api',
      points: 100, // 100 requests
      duration: 60, // per minute
      blockDuration: 60, // block for 1 minute
    }),

    // Lenient limit for votes (during active gameplay)
    vote: new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl:vote',
      points: 10, // 10 votes
      duration: 30, // per 30 seconds
      blockDuration: 30, // block for 30 seconds
    }),

    // Very strict limit for sensitive operations
    sensitive: new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl:sensitive',
      points: 3, // 3 requests
      duration: 60, // per minute
      blockDuration: 600, // block for 10 minutes
    }),
  };

  // Export specific rate limiters
  export const createRoomLimiter = createRateLimitMiddleware(rateLimiters.createRoom, 'create_room');
  export const joinRoomLimiter = createRateLimitMiddleware(rateLimiters.joinRoom, 'join_room');
  export const voteLimiter = createRateLimitMiddleware(rateLimiters.vote, 'vote');
  export const sensitiveLimiter = createRateLimitMiddleware(rateLimiters.sensitive, 'sensitive');
  
  // Default rate limiter
  rateLimiter = rateLimiters.api;
} else {
  logger.warn('Redis not configured, using in-memory rate limiter');
  
  // Fallback to memory-based rate limiter
  const rateLimiters = {
    createRoom: new RateLimiterMemory({
      keyPrefix: 'rl:create',
      points: 5,
      duration: 3600,
      blockDuration: 3600,
    }),

    joinRoom: new RateLimiterMemory({
      keyPrefix: 'rl:join',
      points: 20,
      duration: 60,
      blockDuration: 300,
    }),

    api: new RateLimiterMemory({
      keyPrefix: 'rl:api',
      points: 100,
      duration: 60,
      blockDuration: 60,
    }),

    vote: new RateLimiterMemory({
      keyPrefix: 'rl:vote',
      points: 10,
      duration: 30,
      blockDuration: 30,
    }),

    sensitive: new RateLimiterMemory({
      keyPrefix: 'rl:sensitive',
      points: 3,
      duration: 60,
      blockDuration: 600,
    }),
  };

  export const createRoomLimiter = createRateLimitMiddleware(rateLimiters.createRoom, 'create_room');
  export const joinRoomLimiter = createRateLimitMiddleware(rateLimiters.joinRoom, 'join_room');
  export const voteLimiter = createRateLimitMiddleware(rateLimiters.vote, 'vote');
  export const sensitiveLimiter = createRateLimitMiddleware(rateLimiters.sensitive, 'sensitive');
  
  rateLimiter = rateLimiters.api;
}

/**
 * Create rate limit middleware with custom error handling
 */
function createRateLimitMiddleware(
  limiter: RateLimiterRedis | RateLimiterMemory,
  limitType: string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Use IP address as key, with fingerprint as fallback
      const key = getClientIdentifier(req);
      
      await limiter.consume(key);
      
      // Add rate limit headers
      const rateLimitInfo = await limiter.get(key);
      if (rateLimitInfo) {
        res.setHeader('X-RateLimit-Limit', limiter.points);
        res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remainingPoints || 0);
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimitInfo.msBeforeNext).toISOString());
      }
      
      next();
    } catch (rejRes: any) {
      // Log rate limit violation
      logger.warn(`Rate limit exceeded for ${limitType}`, {
        ip: getClientIP(req),
        path: req.path,
        method: req.method,
      });

      // Set rate limit headers
      res.setHeader('Retry-After', Math.round(rejRes.msBeforeNext / 1000) || 60);
      res.setHeader('X-RateLimit-Limit', limiter.points);
      res.setHeader('X-RateLimit-Remaining', rejRes.remainingPoints || 0);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rejRes.msBeforeNext).toISOString());

      res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded for ${limitType}. Please try again later.`,
        retryAfter: Math.round(rejRes.msBeforeNext / 1000),
      });
    }
  };
}

/**
 * Get client IP address from request
 */
function getClientIP(req: Request): string {
  return (
    req.headers['x-forwarded-for']?.toString().split(',')[0] ||
    req.headers['x-real-ip']?.toString() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * Get client identifier for rate limiting (IP + fingerprint if available)
 */
function getClientIdentifier(req: Request): string {
  const ip = getClientIP(req);
  const fingerprint = req.body?.fingerprint || req.headers['x-fingerprint'];
  
  if (fingerprint) {
    return `${ip}:${fingerprint}`;
  }
  
  return ip;
}

/**
 * Default rate limit middleware for general API endpoints
 */
export const rateLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const key = getClientIdentifier(req);
    await rateLimiter.consume(key);
    
    // Add rate limit headers
    const rateLimitInfo = await rateLimiter.get(key);
    if (rateLimitInfo) {
      res.setHeader('X-RateLimit-Limit', rateLimiter.points);
      res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remainingPoints || 0);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimitInfo.msBeforeNext).toISOString());
    }
    
    next();
  } catch (rejRes: any) {
    logger.warn('Rate limit exceeded', {
      ip: getClientIP(req),
      path: req.path,
      method: req.method,
    });

    res.setHeader('Retry-After', Math.round(rejRes.msBeforeNext / 1000) || 60);
    res.setHeader('X-RateLimit-Limit', rateLimiter.points);
    res.setHeader('X-RateLimit-Remaining', rejRes.remainingPoints || 0);
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rejRes.msBeforeNext).toISOString());

    res.status(429).json({
      error: 'Too many requests',
      message: 'Please slow down and try again later.',
      retryAfter: Math.round(rejRes.msBeforeNext / 1000),
    });
  }
};

/**
 * Dynamic rate limiting based on user behavior
 */
export class DynamicRateLimiter {
  private suspiciousIPs: Set<string> = new Set();
  private ipViolations: Map<string, number> = new Map();

  constructor() {
    // Clean up violations map periodically
    setInterval(() => {
      this.ipViolations.clear();
    }, 3600000); // Every hour
  }

  /**
   * Track violations and apply stricter limits for repeat offenders
   */
  async trackViolation(ip: string): Promise<void> {
    const violations = (this.ipViolations.get(ip) || 0) + 1;
    this.ipViolations.set(ip, violations);

    if (violations >= 5) {
      this.suspiciousIPs.add(ip);
      logger.error(`IP ${ip} marked as suspicious after ${violations} violations`);
    }
  }

  /**
   * Check if IP should have stricter limits
   */
  isSuspicious(ip: string): boolean {
    return this.suspiciousIPs.has(ip);
  }

  /**
   * Apply dynamic rate limiting
   */
  async applyDynamicLimit(
    req: Request,
    res: Response,
    next: NextFunction,
    basePoints: number = 100
  ): Promise<void> {
    const ip = getClientIP(req);
    const points = this.isSuspicious(ip) ? Math.floor(basePoints / 4) : basePoints;

    try {
      const dynamicLimiter = new RateLimiterMemory({
        keyPrefix: 'rl:dynamic',
        points,
        duration: 60,
        blockDuration: this.isSuspicious(ip) ? 3600 : 60,
      });

      await dynamicLimiter.consume(ip);
      next();
    } catch (rejRes: any) {
      await this.trackViolation(ip);
      
      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Your limits may be reduced due to suspicious activity.',
        retryAfter: Math.round(rejRes.msBeforeNext / 1000),
      });
    }
  }
}

// Export dynamic rate limiter instance
export const dynamicRateLimiter = new DynamicRateLimiter();