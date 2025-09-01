import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import winston from 'winston';

// Configure logger
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/errors.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

/**
 * Custom error classes
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
    public code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, 'VALIDATION_ERROR');
    this.details = details;
  }
  details?: any;
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, true, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, true, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, true, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, true, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 429, true, 'RATE_LIMIT_EXCEEDED');
    this.retryAfter = retryAfter;
  }
  retryAfter?: number;
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, false, 'DATABASE_ERROR');
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string = 'External service unavailable') {
    super(message, 503, false, 'EXTERNAL_SERVICE_ERROR');
  }
}

/**
 * Error response formatter
 */
interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    statusCode: number;
    timestamp: string;
    path?: string;
    method?: string;
    details?: any;
    requestId?: string;
  };
}

/**
 * Format error response
 */
function formatErrorResponse(
  error: AppError | Error,
  req: Request,
  statusCode: number = 500
): ErrorResponse {
  const response: ErrorResponse = {
    error: {
      message: error.message || 'An unexpected error occurred',
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      requestId: req.headers['x-request-id'] as string,
    }
  };

  if (error instanceof AppError) {
    response.error.code = error.code;
    if (error instanceof ValidationError && error.details) {
      response.error.details = error.details;
    }
  }

  // In development, include stack trace
  if (process.env.NODE_ENV === 'development') {
    response.error.details = {
      ...response.error.details,
      stack: error.stack,
    };
  }

  return response;
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found error handler
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error
  logger.error('Error occurred:', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      headers: {
        'user-agent': req.headers['user-agent'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
      },
    },
  });

  // Send to Sentry if configured
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      contexts: {
        request: {
          method: req.method,
          url: req.url,
          query_string: JSON.stringify(req.query),
          data: req.body,
        },
      },
      user: {
        ip_address: req.ip,
      },
    });
  }

  // Determine status code
  let statusCode = 500;
  if (error instanceof AppError) {
    statusCode = error.statusCode;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
  } else if (error.name === 'CastError') {
    statusCode = 400;
  }

  // Set rate limit headers if applicable
  if (error instanceof RateLimitError && error.retryAfter) {
    res.setHeader('Retry-After', error.retryAfter);
  }

  // Send error response
  const errorResponse = formatErrorResponse(error, req, statusCode);
  res.status(statusCode).json(errorResponse);

  // For non-operational errors, we might want to restart the process
  if (error instanceof AppError && !error.isOperational) {
    logger.error('Non-operational error occurred, considering process restart:', error);
    // In production, you might want to gracefully shut down
    // process.exit(1);
  }
}

/**
 * Handle unhandled promise rejections
 */
export function handleUnhandledRejections() {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Promise Rejection:', {
      reason: reason?.message || reason,
      stack: reason?.stack,
    });

    if (process.env.SENTRY_DSN) {
      Sentry.captureException(reason);
    }

    // In production, you might want to exit the process
    if (process.env.NODE_ENV === 'production') {
      logger.error('Shutting down due to unhandled promise rejection...');
      process.exit(1);
    }
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', {
      message: error.message,
      stack: error.stack,
    });

    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error);
    }

    // Exit the process as the application is in an undefined state
    logger.error('Shutting down due to uncaught exception...');
    process.exit(1);
  });
}

/**
 * Validation error formatter for express-validator
 */
export function validationErrorFormatter(errors: any[]) {
  const formattedErrors = errors.map(error => ({
    field: error.param,
    message: error.msg,
    value: error.value,
  }));

  throw new ValidationError('Validation failed', formattedErrors);
}

/**
 * Database error handler
 */
export function handleDatabaseError(error: any): never {
  // PostgreSQL error codes
  const pgErrorCodes: { [key: string]: { status: number; message: string } } = {
    '23505': { status: 409, message: 'Duplicate entry' },
    '23503': { status: 400, message: 'Foreign key violation' },
    '23502': { status: 400, message: 'Required field missing' },
    '22P02': { status: 400, message: 'Invalid input syntax' },
    '42P01': { status: 500, message: 'Table does not exist' },
    '42703': { status: 500, message: 'Column does not exist' },
    '08006': { status: 503, message: 'Database connection lost' },
    '08003': { status: 503, message: 'Database connection does not exist' },
    '57014': { status: 503, message: 'Query cancelled due to timeout' },
  };

  const errorInfo = pgErrorCodes[error.code];
  
  if (errorInfo) {
    throw new AppError(
      `${errorInfo.message}: ${error.detail || error.message}`,
      errorInfo.status,
      errorInfo.status < 500,
      `DB_${error.code}`
    );
  }

  // Generic database error
  throw new DatabaseError(error.message);
}

/**
 * Socket.io error handler
 */
export function handleSocketError(socket: any, error: Error) {
  logger.error('Socket error:', {
    socketId: socket.id,
    error: {
      message: error.message,
      stack: error.stack,
    },
  });

  socket.emit('error', {
    message: 'An error occurred',
    code: error instanceof AppError ? error.code : 'SOCKET_ERROR',
  });

  // Disconnect socket on critical errors
  if (error instanceof AppError && !error.isOperational) {
    socket.disconnect(true);
  }
}