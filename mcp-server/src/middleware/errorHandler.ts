import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/Logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  details?: any;
}

export class ErrorHandler {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('ErrorHandler');
  }

  public handleNotFound(req: Request, res: Response): void {
    res.status(404).json({
      error: 'Endpoint not found',
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  public handleError(error: AppError, req: Request, res: Response, next: NextFunction): void {
    // Log the error
    this.logger.error('Request error occurred', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Determine status code
    const statusCode = error.statusCode || 500;
    
    // Prepare error response
    const errorResponse: any = {
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    };

    // Include details for development or specific error types
    if (process.env.NODE_ENV === 'development' || error.isOperational) {
      if (error.details) {
        errorResponse.details = error.details;
      }
      if (error.stack && process.env.NODE_ENV === 'development') {
        errorResponse.stack = error.stack;
      }
    }

    // Send error response
    res.status(statusCode).json(errorResponse);
  }

  public handleAsyncError(fn: Function) {
    return (req: Request, res: Response, next: NextFunction): void => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  public handleContractError(error: any): AppError {
    // Handle common contract errors
    if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      return {
        name: 'ContractError',
        message: 'Transaction may fail due to insufficient gas or contract revert',
        statusCode: 400,
        isOperational: true
      };
    }

    if (error.code === 'INSUFFICIENT_FUNDS') {
      return {
        name: 'ContractError',
        message: 'Insufficient funds for transaction',
        statusCode: 400,
        isOperational: true
      };
    }

    if (error.code === 'NETWORK_ERROR') {
      return {
        name: 'NetworkError',
        message: 'Network connection error. Please try again.',
        statusCode: 503,
        isOperational: true
      };
    }

    if (error.message?.includes('execution reverted')) {
      return {
        name: 'ContractError',
        message: 'Transaction reverted by smart contract',
        statusCode: 400,
        isOperational: true,
        details: { revertReason: error.message }
      };
    }

    if (error.message?.includes('gas required exceeds allowance')) {
      return {
        name: 'GasError',
        message: 'Insufficient gas provided for transaction',
        statusCode: 400,
        isOperational: true
      };
    }

    if (error.message?.includes('nonce too low')) {
      return {
        name: 'NonceError',
        message: 'Transaction nonce too low. Please wait for pending transactions.',
        statusCode: 400,
        isOperational: true
      };
    }

    if (error.message?.includes('nonce too high')) {
      return {
        name: 'NonceError',
        message: 'Transaction nonce too high. Please reset your wallet.',
        statusCode: 400,
        isOperational: true
      };
    }

    // Default error
    return {
      name: error.name || 'UnknownError',
      message: error.message || 'An unknown error occurred',
      statusCode: 500,
      isOperational: false
    };
  }

  public handleValidationError(error: any): AppError {
    return {
      name: 'ValidationError',
      message: 'Request validation failed',
      statusCode: 400,
      isOperational: true,
      details: error.details
    };
  }

  public handleAuthenticationError(error: any): AppError {
    return {
      name: 'AuthenticationError',
      message: 'Authentication failed',
      statusCode: 401,
      isOperational: true,
      details: error.message
    };
  }

  public handleAuthorizationError(error: any): AppError {
    return {
      name: 'AuthorizationError',
      message: 'Insufficient permissions',
      statusCode: 403,
      isOperational: true,
      details: error.message
    };
  }

  public handleRateLimitError(error: any): AppError {
    return {
      name: 'RateLimitError',
      message: 'Rate limit exceeded',
      statusCode: 429,
      isOperational: true,
      details: {
        limit: error.limit,
        windowMs: error.windowMs,
        retryAfter: error.retryAfter
      }
    };
  }
}

// Create global error handler instance
const errorHandler = new ErrorHandler();

// Global error handling middleware
export const globalErrorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  errorHandler.handleError(error, req, res, next);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response): void => {
  errorHandler.handleNotFound(req, res);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return errorHandler.handleAsyncError(fn);
};

// Error types for consistent error creation
export class ValidationError extends Error {
  public statusCode = 400;
  public isOperational = true;
  public details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class AuthenticationError extends Error {
  public statusCode = 401;
  public isOperational = true;

  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  public statusCode = 403;
  public isOperational = true;

  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ContractError extends Error {
  public statusCode = 400;
  public isOperational = true;
  public details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ContractError';
    this.details = details;
  }
}

export class NetworkError extends Error {
  public statusCode = 503;
  public isOperational = true;

  constructor(message: string = 'Network error occurred') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class RateLimitError extends Error {
  public statusCode = 429;
  public isOperational = true;
  public details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'RateLimitError';
    this.details = details;
  }
}
