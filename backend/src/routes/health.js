const express = require('express')
const router = express.Router()
const { testConnection, getPoolStats } = require('../config/database')
const logger = require('../config/logger')

/**
 * @route   GET /api/health
 * @desc    Basic health check endpoint
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      service: 'learning-my-recipes-api'
    }

    res.status(200).json(healthCheck)
  } catch (error) {
    logger.logError(error, { endpoint: '/api/health' })
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Health check failed'
    })
  }
})

/**
 * @route   GET /api/health/detailed
 * @desc    Detailed health check with database connectivity
 * @access  Public
 */
router.get('/detailed', async (req, res) => {
  try {
    const startTime = Date.now()
    
    // Test database connection
    const dbTest = await testConnection()
    const poolStats = getPoolStats()
    
    const healthCheck = {
      status: dbTest.success ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      service: 'learning-my-recipes-api',
      checks: {
        database: {
          status: dbTest.success ? 'ok' : 'error',
          responseTime: Date.now() - startTime,
          details: dbTest.success ? {
            tables: dbTest.tables?.length || 0,
            serverTime: dbTest.current_time,
            version: dbTest.pg_version
          } : {
            error: dbTest.error,
            code: dbTest.code
          }
        },
        connectionPool: {
          status: 'ok',
          totalConnections: poolStats.totalCount,
          idleConnections: poolStats.idleCount,
          waitingConnections: poolStats.waitingCount,
          maxConnections: poolStats.config.max
        },
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          unit: 'MB'
        }
      }
    }

    const statusCode = dbTest.success ? 200 : 503
    res.status(statusCode).json(healthCheck)
    
  } catch (error) {
    logger.logError(error, { endpoint: '/api/health/detailed' })
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Detailed health check failed',
      error: error.message
    })
  }
})

/**
 * @route   GET /api/health/ready
 * @desc    Readiness probe for Kubernetes/Docker deployments
 * @access  Public
 */
router.get('/ready', async (req, res) => {
  try {
    // Quick database connectivity test
    const dbTest = await testConnection()
    
    if (dbTest.success) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      })
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: 'database connection failed'
      })
    }
  } catch (error) {
    logger.logError(error, { endpoint: '/api/health/ready' })
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      reason: 'health check error'
    })
  }
})

/**
 * @route   GET /api/health/live
 * @desc    Liveness probe for Kubernetes/Docker deployments
 * @access  Public
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

module.exports = router