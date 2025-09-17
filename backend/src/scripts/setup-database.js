const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')
require('dotenv').config()

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'learning_my_recipes',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
}

console.log('🛠️  Setting up Learning My Recipes database...')
console.log(`📍 Target database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`)

async function setupDatabase () {
  const pool = new Pool(dbConfig)
  
  try {
    console.log('\n1️⃣ Connecting to database...')
    const client = await pool.connect()
    console.log('✅ Connected successfully!')
    
    console.log('\n2️⃣ Reading schema file...')
    const schemaPath = path.join(__dirname, '../../../database/schema.sql')
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`)
    }
    
    const schemaSql = fs.readFileSync(schemaPath, 'utf8')
    console.log('📁 Schema file loaded successfully!')
    
    console.log('\n3️⃣ Executing database schema...')
    await client.query(schemaSql)
    console.log('✅ Database schema created successfully!')
    
    console.log('\n4️⃣ Verifying table creation...')
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    
    const tables = tablesResult.rows.map(row => row.table_name)
    console.log('📋 Created tables:', tables)
    
    // Verify expected tables
    const expectedTables = [
      'categories',
      'users',
      'ingredients', 
      'recipes',
      'recipe_ingredients',
      'recipe_instructions',
      'reviews',
      'user_favorites'
    ]
    
    const missingTables = expectedTables.filter(table => !tables.includes(table))
    if (missingTables.length === 0) {
      console.log('✅ All required tables created successfully!')
    } else {
      console.log('⚠️  Some tables may be missing:', missingTables)
    }
    
    console.log('\n5️⃣ Checking sample data...')
    const categoriesResult = await client.query('SELECT COUNT(*) as count FROM categories')
    const categoriesCount = parseInt(categoriesResult.rows[0].count)
    console.log(`📊 Categories inserted: ${categoriesCount}`)
    
    const ingredientsResult = await client.query('SELECT COUNT(*) as count FROM ingredients')
    const ingredientsCount = parseInt(ingredientsResult.rows[0].count)
    console.log(`🥕 Ingredients inserted: ${ingredientsCount}`)
    
    client.release()
    
    console.log('\n🎉 Database setup completed successfully!')
    console.log('🚀 Your Learning My Recipes database is ready to use!')
    console.log('\n📝 Next steps:')
    console.log('   • Copy .env.example to .env and configure your settings')
    console.log('   • Run "npm run test:db" to verify the connection')
    console.log('   • Start the development server with "npm run dev"')
    
  } catch (error) {
    console.error('\n❌ Database setup failed!')
    console.error('📝 Error details:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure PostgreSQL is running and accessible')
    } else if (error.code === '3D000') {
      console.log('\n💡 Create the database first:')
      console.log('   psql -U postgres -c "CREATE DATABASE learning_my_recipes;"')
    } else if (error.code === '28P01') {
      console.log('\n💡 Check your database credentials in the .env file')
    }
    
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Handle script execution
if (require.main === module) {
  setupDatabase()
} else {
  module.exports = { setupDatabase }
}