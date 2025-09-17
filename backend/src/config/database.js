const { Pool } = require('pg')
const logger = require('./logger')

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'learning_my_recipes',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  
  // Connection pool settings
  max: parseInt(process.env.DB_POOL_MAX) || 20, // Maximum number of clients in pool
  min: parseInt(process.env.DB_POOL_MIN) || 5,  // Minimum number of clients in pool
  idle: parseInt(process.env.DB_POOL_IDLE) || 10000, // Close & remove clients which have been idle > 10 seconds
  acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 60000, // Return error after 60 seconds if unable to get connection
  evict: parseInt(process.env.DB_POOL_EVICT) || 1000, // How often to run eviction
  
  // Additional PostgreSQL settings
  connectionTimeoutMillis: 10000, // Wait 10 seconds for connection
  idleTimeoutMillis: 30000, // Close connections after 30 seconds of inactivity
  query_timeout: 60000, // Query timeout 60 seconds
  statement_timeout: 60000, // Statement timeout 60 seconds
  
  // Application name for PostgreSQL logs
  application_name: `learning_my_recipes_${process.env.NODE_ENV || 'development'}`
}

// Create connection pool
const dbPool = new Pool(dbConfig)

// Pool event handlers
dbPool.on('connect', (client) => {
  logger.info(`📡 New database client connected (Total: ${dbPool.totalCount}, Idle: ${dbPool.idleCount}, Waiting: ${dbPool.waitingCount})`)
})

dbPool.on('acquire', (client) => {
  logger.debug('🔒 Database client acquired from pool')
})

dbPool.on('release', (client) => {
  logger.debug('🔓 Database client released back to pool')
})

dbPool.on('remove', (client) => {
  logger.info('🗑️  Database client removed from pool')
})

dbPool.on('error', (err) => {
  logger.error('💥 Unexpected database pool error:', {
    error: err.message,
    stack: err.stack,
    code: err.code
  })
})

// Connection test function
async function testConnection() {
  let client
  try {
    logger.info('🧪 Testing database connection...')
    
    client = await dbPool.connect()
    
    // Test basic connectivity
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version')
    const { current_time, pg_version } = result.rows[0]
    
    logger.info('✅ Database connection successful', {
      current_time,
      pg_version: pg_version.split(' ')[0] + ' ' + pg_version.split(' ')[1],
      database: dbConfig.database,
      host: dbConfig.host,
      port: dbConfig.port
    })
    
    // Test table existence
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    const tables = tablesResult.rows.map(row => row.table_name)
    logger.info(`📊 Found ${tables.length} tables:`, tables)
    
    return { success: true, tables, current_time, pg_version }
    
  } catch (error) {
    logger.error('❌ Database connection failed:', {
      error: error.message,
      code: error.code,
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database
    })
    
    return { success: false, error: error.message, code: error.code }
    
  } finally {
    if (client) {
      client.release()
    }
  }
}

// Query helper with error handling and logging
async function query(text, params = []) {
  const start = Date.now()
  let client
  
  try {
    client = await dbPool.connect()
    const result = await client.query(text, params)
    const duration = Date.now() - start
    
    logger.debug('📝 Database query executed', {
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      params: params.length > 0 ? '(with parameters)' : '(no parameters)',
      rows: result.rowCount,
      duration: `${duration}ms`
    })
    
    return result
    
  } catch (error) {
    const duration = Date.now() - start
    
    logger.error('💥 Database query failed', {
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      params: params.length > 0 ? '(with parameters)' : '(no parameters)',
      error: error.message,
      code: error.code,
      duration: `${duration}ms`
    })
    
    throw error
    
  } finally {
    if (client) {
      client.release()
    }
  }
}

// Transaction helper
async function transaction(callback) {
  let client
  
  try {
    client = await dbPool.connect()
    await client.query('BEGIN')
    
    logger.debug('🔄 Database transaction started')
    
    const result = await callback(client)
    
    await client.query('COMMIT')
    logger.debug('✅ Database transaction committed')
    
    return result
    
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK')
      logger.debug('🔄 Database transaction rolled back')
    }
    
    logger.error('💥 Database transaction failed:', {
      error: error.message,
      code: error.code
    })
    
    throw error
    
  } finally {
    if (client) {
      client.release()
    }
  }
}

// Graceful pool shutdown
async function closePool() {
  try {
    logger.info('🛑 Closing database connection pool...')
    await dbPool.end()
    logger.info('✅ Database connection pool closed')
  } catch (error) {
    logger.error('❌ Error closing database pool:', error.message)
    throw error
  }
}

// Pool health check
function getPoolStats() {
  return {
    totalCount: dbPool.totalCount,
    idleCount: dbPool.idleCount,
    waitingCount: dbPool.waitingCount,
    config: {
      max: dbConfig.max,
      min: dbConfig.min,
      host: dbConfig.host,
      database: dbConfig.database
    }
  }
}

module.exports = {
  dbPool,
  dbConfig,
  query,
  transaction,
  testConnection,
  closePool,
  getPoolStats
}