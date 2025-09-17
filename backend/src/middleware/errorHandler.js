const logger = require('../config/logger')
const multer = require('multer')

/**
 * Global Error Handler Middleware
 * Must be used as the last middleware in the application
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err }
  error.message = err.message

  // Log error details
  logger.logError(err, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found'
    error = createError(404, message)
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered'
    error = createError(400, message)
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message)
    error = createError(400, message.join(', '))
  }

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        error = createError(409, 'Duplicate entry - resource already exists')
        break
      case '23503': // Foreign key violation
        error = createError(400, 'Referenced resource does not exist')
        break
      case '23514': // Check constraint violation
        error = createError(400, 'Data validation failed')
        break
      case '42P01': // Undefined table
        error = createError(500, 'Database configuration error')
        break
      case 'ECONNREFUSED':
        error = createError(503, 'Database connection failed')
        break
      default:
        if (err.code.startsWith('23')) {
          error = createError(400, 'Database constraint violation')
        } else if (err.code.startsWith('42')) {
          error = createError(500, 'Database schema error')
        }
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token'
    error = createError(401, message)
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired'
    error = createError(401, message)
  }

  // Joi validation errors
  if (err.isJoi) {
    const message = err.details.map(detail => detail.message).join(', ')
    error = createError(400, message)
  }

  // Multer errors (file upload)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error = createError(400, 'File too large')
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      error = createError(400, 'Unexpected file field')
    } else {
      error = createError(400, `File upload error: ${err.message}`)
    }
  }

  // Default to 500 server error
  const statusCode = error.statusCode || 500
  const message = error.message || 'Internal Server Error'

  // Create error response
  const errorResponse = {
    success: false,
    error: {
      message,
      code: error.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method
    }
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack
    errorResponse.error.details = err
  }

  // Add request ID if available
  if (req.id) {
    errorResponse.error.requestId = req.id
  }

  res.status(statusCode).json(errorResponse)
}

/**
 * Create standardized error object
 */
const createError = (statusCode, message, code = null) => {
  const error = new Error(message)
  error.statusCode = statusCode
  if (code) error.code = code
  return error
}

/**
 * Async error handler wrapper
 * Wraps async route handlers to catch rejected promises
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

/**
 * Not Found Error Handler
 * Handles 404 errors for undefined routes
 */
const notFound = (req, res, next) => {
  const message = `Route not found - ${req.method} ${req.originalUrl}`
  const error = createError(404, message, 'ROUTE_NOT_FOUND')
  next(error)
}

/**
 * Validation Error Handler
 * Creates consistent validation error responses
 */
const validationError = (message, field = null) => {
  const error = new Error(message)
  error.statusCode = 400
  error.code = 'VALIDATION_ERROR'
  error.field = field
  return error
}

/**
 * Database Error Handler
 * Handles specific database errors
 */
const databaseError = (err) => {
  logger.logError(err, { type: 'database_error' })
  
  if (err.code === 'ECONNREFUSED') {
    return createError(503, 'Database connection failed', 'DB_CONNECTION_ERROR')
  }
  
  if (err.code === 'ETIMEDOUT') {
    return createError(504, 'Database query timeout', 'DB_TIMEOUT_ERROR')
  }
  
  // Default database error
  return createError(500, 'Database operation failed', 'DB_ERROR')
}

/**
 * Authentication Error Handler
 */
const authError = (message = 'Authentication required') => {
  return createError(401, message, 'AUTH_ERROR')
}

/**
 * Authorization Error Handler
 */
const authzError = (message = 'Insufficient permissions') => {
  return createError(403, message, 'AUTHZ_ERROR')
}

/**
 * Rate Limit Error Handler
 */
const rateLimitError = (message = 'Too many requests') => {
  return createError(429, message, 'RATE_LIMIT_ERROR')
}

module.exports = {
  errorHandler,
  createError,
  asyncHandler,
  notFound,
  validationError,
  databaseError,
  authError,
  authzError,
  rateLimitError
}