// Test database connection and table structure
const { dbPool } = require('./src/config/database')

async function testDatabase() {
  const client = await dbPool.connect()
  try {
    console.log('Testing database connection...')
    
    // Check if ingredients table exists and its structure
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'ingredients'
      ORDER BY ordinal_position
    `)
    
    console.log('Ingredients table structure:')
    tableInfo.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`)
    })
    
    // Test a simple insert
    console.log('\nTesting simple insert...')
    const testQuery = `
      INSERT INTO ingredients (name, normalized_name) 
      VALUES ('Test Item', 'test-item') 
      RETURNING id, name, normalized_name
    `
    
    const result = await client.query(testQuery)
    console.log('✅ Insert successful:', result.rows[0])
    
    // Clean up
    await client.query('DELETE FROM ingredients WHERE name = $1', ['Test Item'])
    console.log('✅ Test cleanup completed')
    
  } catch (error) {
    console.error('❌ Database error:', error)
  } finally {
    client.release()
  }
}

testDatabase()