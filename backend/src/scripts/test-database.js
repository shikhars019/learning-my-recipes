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

console.log('🔍 Testing database connection...')
console.log(`📍 Connecting to: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`)

const pool = new Pool(dbConfig)

async function testDatabaseConnection () {
  try {
    // Test basic connection
    console.log('\n1️⃣ Testing basic connection...')
    const client = await pool.connect()
    console.log('✅ Successfully connected to PostgreSQL!')
    
    // Test database version
    console.log('\n2️⃣ Checking PostgreSQL version...')
    const versionResult = await client.query('SELECT version()')
    console.log('📊 PostgreSQL Version:', versionResult.rows[0].version.split(' ')[0] + ' ' + versionResult.rows[0].version.split(' ')[1])
    
    // Test if tables exist
    console.log('\n3️⃣ Checking if schema tables exist...')
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    
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
    
    const existingTables = tablesResult.rows.map(row => row.table_name)
    console.log('📋 Existing tables:', existingTables.length > 0 ? existingTables : 'No tables found')
    
    // Check if all expected tables exist
    const missingTables = expectedTables.filter(table => !existingTables.includes(table))
    if (missingTables.length === 0) {
      console.log('✅ All required tables are present!')
    } else {
      console.log('⚠️  Missing tables:', missingTables)
      console.log('💡 Run the schema.sql file to create missing tables')
    }
    
    // Test sample data
    if (existingTables.includes('categories')) {
      console.log('\n4️⃣ Checking sample data...')
      const categoriesResult = await client.query('SELECT COUNT(*) as count FROM categories')
      const categoriesCount = parseInt(categoriesResult.rows[0].count)
      console.log(`📊 Categories count: ${categoriesCount}`)
      
      if (categoriesCount > 0) {
        const sampleCategories = await client.query('SELECT name FROM categories LIMIT 3')
        console.log('🏷️  Sample categories:', sampleCategories.rows.map(row => row.name).join(', '))
      }
    }
    
    if (existingTables.includes('ingredients')) {
      const ingredientsResult = await client.query('SELECT COUNT(*) as count FROM ingredients')
      const ingredientsCount = parseInt(ingredientsResult.rows[0].count)
      console.log(`🥕 Ingredients count: ${ingredientsCount}`)
      
      if (ingredientsCount > 0) {
        const sampleIngredients = await client.query('SELECT name FROM ingredients LIMIT 5')
        console.log('🧄 Sample ingredients:', sampleIngredients.rows.map(row => row.name).join(', '))
      }
    }
    
    // Test UUID extension
    console.log('\n5️⃣ Testing UUID extension...')
    const uuidResult = await client.query('SELECT uuid_generate_v4() as test_uuid')
    console.log('🆔 UUID generation test:', uuidResult.rows[0].test_uuid)
    console.log('✅ UUID extension is working!')
    
    // Test database permissions
    console.log('\n6️⃣ Testing database permissions...')
    await client.query('CREATE TEMP TABLE test_permissions (id SERIAL PRIMARY KEY, name VARCHAR(50))')
    await client.query("INSERT INTO test_permissions (name) VALUES ('test')")
    await client.query('SELECT * FROM test_permissions')
    await client.query('DROP TABLE test_permissions')
    console.log('✅ Database permissions are correct!')
    
    client.release()
    
    console.log('\n🎉 Database connection test completed successfully!')
    console.log('🚀 Your database is ready for the Learning My Recipes application!')
    
  } catch (error) {
    console.error('\n❌ Database connection test failed!')
    console.error('📝 Error details:', error.message)
    
    // Provide helpful troubleshooting tips
    console.log('\n🔧 Troubleshooting tips:')
    
    if (error.code === 'ECONNREFUSED') {
      console.log('   • Make sure PostgreSQL is running')
      console.log('   • Check if the database server is accessible')
      console.log('   • Verify the host and port in your .env file')
    } else if (error.code === '28P01') {
      console.log('   • Check your database username and password')
      console.log('   • Ensure the user has proper permissions')
    } else if (error.code === '3D000') {
      console.log('   • The database does not exist')
      console.log('   • Create the database: CREATE DATABASE learning_my_recipes;')
    } else if (error.message.includes('schema')) {
      console.log('   • Run the database schema: psql -U username -d learning_my_recipes -f database/schema.sql')
    }
    
    console.log('   • Double-check your .env configuration')
    console.log('   • Ensure PostgreSQL service is running')
    
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Handle script execution
if (require.main === module) {
  testDatabaseConnection()
} else {
  module.exports = { testDatabaseConnection, dbConfig }
}