require('dotenv').config()
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const morgan = require('morgan')
const compression = require('compression')
const rateLimit = require('express-rate-limit')

// Import configuration and database
const { dbPool } = require('./config/database')
const logger = require('./config/logger')

// Import routes
const healthRoutes = require('./routes/health')
const recipeRoutes = require('./routes/recipes')
const ingredientRoutes = require('./routes/ingredients')
const categoryRoutes = require('./routes/categories')
const userRoutes = require('./routes/users')
const aiRoutes = require('./routes/ai')

// Import middleware
const { errorHandler } = require('./middleware/errorHandler')
const requestValidator = require('./middleware/requestValidator')

const app = express()
const PORT = process.env.PORT || 3001

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1)

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
})
app.use('/api/', limiter)

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
  credentials: process.env.CORS_CREDENTIALS === 'true' || true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}
app.use(cors(corsOptions))

// Compression middleware
app.use(compression())

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }))
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })
  next()
})

// API Routes
app.use('/api/health', healthRoutes)
app.use('/api/recipes', recipeRoutes)
app.use('/api/ingredients', ingredientRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/users', userRoutes)
app.use('/api/ai', aiRoutes)

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Learning My Recipes API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    documentation: '/api/health'
  })
})

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.method} ${req.originalUrl} does not exist.`,
    code: 'ROUTE_NOT_FOUND',
    timestamp: new Date().toISOString()
  })
})

// Global error handler (must be last)
app.use(errorHandler)

// Graceful shutdown handler
const gracefulShutdown = () => {
  logger.info('Received shutdown signal, shutting down gracefully...')
  
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed')
      
      // Close database connections
      dbPool.end(() => {
        logger.info('Database connections closed')
        process.exit(0)
      })
    })
  } else {
    // Close database connections directly
    dbPool.end(() => {
      logger.info('Database connections closed')
      process.exit(0)
    })
  }

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down')
    process.exit(1)
  }, 10000)
}

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

// Start server (only if not in test environment)
let server
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    logger.info(`🚀 Learning My Recipes API server started on port ${PORT}`)
    logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`)
    logger.info(`🔗 API URL: http://localhost:${PORT}`)
    logger.info(`💚 Health check: http://localhost:${PORT}/api/health`)
    
    // Test database connection on startup
    dbPool.query('SELECT NOW() as server_time', (err, result) => {
      if (err) {
        logger.error('❌ Database connection failed:', err.message)
      } else {
        logger.info('✅ Database connected successfully')
        logger.info(`🕐 Database server time: ${result.rows[0].server_time}`)
      }
    })
  })
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err)
  if (server) {
    server.close(() => {
      process.exit(1)
    })
  } else {
    process.exit(1)
  }
})

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err)
  process.exit(1)
})

module.exports = app