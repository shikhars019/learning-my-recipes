// Database migration runner for Learning My Recipes
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'learning_my_recipes',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
}

console.log('🚀 Starting database migration process...')

async function runMigrations() {
  const client = new Client(dbConfig)
  
  try {
    await client.connect()
    console.log('✅ Connected to PostgreSQL database')
    
    // Read migration files
    const migrationsDir = path.join(__dirname, '../migrations')
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()
    
    console.log(`📄 Found ${migrationFiles.length} migration files`)
    
    for (const file of migrationFiles) {
      console.log(`🔄 Running migration: ${file}`)
      
      const migrationPath = path.join(migrationsDir, file)
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
      
      try {
        await client.query(migrationSQL)
        console.log(`✅ Completed migration: ${file}`)
      } catch (error) {
        console.error(`❌ Failed migration: ${file}`)
        console.error('Error:', error.message)
        throw error
      }
    }
    
    console.log('🎉 All migrations completed successfully!')
    
    // Verify tables were created
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `
    
    const result = await client.query(tablesQuery)
    console.log('\n📊 Created tables:')
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`)
    })
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 PostgreSQL server is not running. Try:')
      console.log('   - Start PostgreSQL service')
      console.log('   - Or use Docker: docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres')
    }
    
    throw error
  } finally {
    await client.end()
    console.log('📝 Database connection closed')
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('\n🎯 Database setup complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Database setup failed!')
      console.error(error.message)
      process.exit(1)
    })
}

module.exports = { runMigrations }