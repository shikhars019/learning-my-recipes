const winston = require('winston')
const path = require('path')

// Custom format for log output
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`
    }
    
    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`
    }
    
    return log
  })
)

// Create logs directory if it doesn't exist
const fs = require('fs')
const logsDir = path.join(__dirname, '../../logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

// Configure logger based on environment
const isDevelopment = process.env.NODE_ENV === 'development'
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info')

const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { 
    service: 'learning-my-recipes-api',
    version: '1.0.0'
  },
  transports: [
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
})

// Add console transport for development
if (isDevelopment) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss'
      }),
      winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `${timestamp} ${level}: ${message}`
        
        // Add metadata for development
        if (Object.keys(meta).length > 0 && meta.service !== 'learning-my-recipes-api') {
          log += ` ${JSON.stringify(meta, null, 2)}`
        }
        
        // Add stack trace for errors
        if (stack) {
          log += `\n${stack}`
        }
        
        return log
      })
    )
  }))
}

// Create request logger middleware
const requestLogger = (req, res, next) => {
  const start = Date.now()
  
  // Log request
  logger.info(`➡️  ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length')
  })
  
  // Override res.end to log response
  const originalEnd = res.end
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start
    
    logger.info(`⬅️  ${req.method} ${req.originalUrl} ${res.statusCode}`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length')
    })
    
    originalEnd.call(res, chunk, encoding)
  }
  
  next()
}

// Database query logger
const dbLogger = {
  query: (query, params = []) => {
    logger.debug('📝 DB Query', {
      query: query.length > 100 ? query.substring(0, 100) + '...' : query,
      params: params.length > 0 ? '(with parameters)' : '(no parameters)'
    })
  },
  
  result: (query, rowCount, duration) => {
    logger.debug('✅ DB Result', {
      query: query.length > 50 ? query.substring(0, 50) + '...' : query,
      rowCount,
      duration: `${duration}ms`
    })
  },
  
  error: (query, error, duration) => {
    logger.error('❌ DB Error', {
      query: query.length > 50 ? query.substring(0, 50) + '...' : query,
      error: error.message,
      code: error.code,
      duration: `${duration}ms`
    })
  }
}

// Error logger with context
const logError = (error, context = {}) => {
  logger.error('💥 Application Error', {
    message: error.message,
    stack: error.stack,
    code: error.code,
    ...context
  })
}

// Success logger with context
const logSuccess = (message, context = {}) => {
  logger.info(`✅ ${message}`, context)
}

// Warning logger with context
const logWarning = (message, context = {}) => {
  logger.warn(`⚠️  ${message}`, context)
}

// Performance logger
const logPerformance = (operation, duration, context = {}) => {
  const level = duration > 1000 ? 'warn' : 'info'
  const emoji = duration > 1000 ? '🐌' : '⚡'
  
  logger.log(level, `${emoji} Performance: ${operation}`, {
    duration: `${duration}ms`,
    ...context
  })
}

// Startup logger
const logStartup = () => {
  logger.info('🚀 Learning My Recipes API Starting...')
  logger.info('📊 Configuration', {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3001,
    logLevel: logLevel,
    dbHost: process.env.DB_HOST || 'localhost',
    dbName: process.env.DB_NAME || 'learning_my_recipes'
  })
}

module.exports = logger

// Export additional logging utilities
module.exports.requestLogger = requestLogger
module.exports.dbLogger = dbLogger
module.exports.logError = logError
module.exports.logSuccess = logSuccess
module.exports.logWarning = logWarning
module.exports.logPerformance = logPerformance
module.exports.logStartup = logStartup