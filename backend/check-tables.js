// Check database tables
const { dbPool } = require('./src/config/database')

async function checkTables() {
  const client = await dbPool.connect()
  try {
    console.log('Checking database tables...')
    
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    console.log('Available tables:')
    result.rows.forEach(row => {
      console.log(`- ${row.table_name}`)
    })
    
    // Check if recipe_ingredients table exists
    const recipeIngredients = result.rows.find(row => row.table_name === 'recipe_ingredients')
    if (!recipeIngredients) {
      console.log('\n⚠️  recipe_ingredients table not found - this explains the autocomplete error')
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message)
  } finally {
    client.release()
  }
}

checkTables()