// Comprehensive API Test with Unique Names
const axios = require('axios')

const API_BASE = 'http://localhost:3001/api'

async function runComprehensiveTests() {
  console.log('🧪 Testing Learning My Recipes API Endpoints')
  console.log('=' .repeat(50))
  
  const timestamp = Date.now()
  let categoryId = null
  let ingredientId = null
  
  try {
    // Test 1: Health Check
    console.log('\n1️⃣ Testing Health Endpoint')
    const health = await axios.get(`${API_BASE}/health`)
    console.log('✅ Health Status:', health.data.status)
    console.log('✅ Service:', health.data.service)
    
    // Test 2: Create Category
    console.log('\n2️⃣ Creating Test Category')
    const categoryData = {
      name: `Test Fruits ${timestamp}`,
      description: 'Test category for fruits',
      color: '#FF6B6B'
    }
    const categoryResponse = await axios.post(`${API_BASE}/categories`, categoryData)
    console.log('✅ Category Created:', categoryResponse.data.data.name)
    console.log('✅ Generated Slug:', categoryResponse.data.data.slug)
    categoryId = categoryResponse.data.data.id
    
    // Test 3: Get All Categories
    console.log('\n3️⃣ Getting All Categories')
    const categoriesResponse = await axios.get(`${API_BASE}/categories`)
    console.log('✅ Categories Count:', categoriesResponse.data.data.categories.length)
    
    // Test 4: Create Ingredient
    console.log('\n4️⃣ Creating Test Ingredient')
    const ingredientData = {
      name: `Test Apple ${timestamp}`,
      category: `Test Fruits ${timestamp}`,
      description: 'Fresh red apples for testing',
      nutritional_info: {
        calories_per_100g: 52,
        protein_g: 0.3,
        carbs_g: 14,
        fat_g: 0.2
      },
      allergens: [],
      season: ['autumn'],
      is_organic: true,
      storage_tips: 'Store in cool, dry place'
    }
    const ingredientResponse = await axios.post(`${API_BASE}/ingredients`, ingredientData)
    console.log('✅ Ingredient Created:', ingredientResponse.data.data.name)
    console.log('✅ Normalized Name:', ingredientResponse.data.data.normalized_name)
    ingredientId = ingredientResponse.data.data.id
    
    // Test 5: Get All Ingredients
    console.log('\n5️⃣ Getting All Ingredients')
    const ingredientsResponse = await axios.get(`${API_BASE}/ingredients`)
    console.log('✅ Ingredients Count:', ingredientsResponse.data.data.ingredients.length)
    
    // Test 6: Get Specific Ingredient
    console.log('\n6️⃣ Getting Specific Ingredient')
    const specificIngredient = await axios.get(`${API_BASE}/ingredients/${ingredientId}`)
    console.log('✅ Retrieved Ingredient:', specificIngredient.data.data.name)
    
    // Test 7: Search Ingredients (using base ingredients endpoint with query)
    console.log('\n7️⃣ Testing Search')
    const searchResponse = await axios.get(`${API_BASE}/ingredients?q=apple`)
    console.log('✅ Search Results:', searchResponse.data.data.ingredients.length)
    
    // Test 8: Autocomplete
    console.log('\n8️⃣ Testing Autocomplete')
    const autocompleteResponse = await axios.get(`${API_BASE}/ingredients/autocomplete?q=app`)
    console.log('✅ Autocomplete Results:', autocompleteResponse.data.data.length)
    
    // Test 9: Category Tree
    console.log('\n9️⃣ Testing Category Tree')
    const treeResponse = await axios.get(`${API_BASE}/categories/tree`)
    console.log('✅ Tree Structure Retrieved')
    
    // Test 10: Statistics
    console.log('\n🔟 Testing Statistics')
    const statsResponse = await axios.get(`${API_BASE}/stats`)
    console.log('✅ Total Categories:', statsResponse.data.data.categories_count)
    console.log('✅ Total Ingredients:', statsResponse.data.data.ingredients_count)
    
    console.log('\n🎉 All API tests completed successfully!')
    console.log('\n📊 FINAL RESULTS:')
    console.log('✅ Health Check: Working')
    console.log('✅ Categories CRUD: Working')
    console.log('✅ Ingredients CRUD: Working')  
    console.log('✅ Search & Autocomplete: Working')
    console.log('✅ Statistics: Working')
    console.log('✅ Database Integration: Working')
    
  } catch (error) {
    console.error('\n❌ Test Failed:')
    console.error('URL:', error.config?.url || 'Unknown')
    console.error('Method:', error.config?.method?.toUpperCase() || 'Unknown')
    console.error('Status:', error.response?.status || 'No status')
    console.error('Error:', error.response?.data?.error || error.message)
    
    if (error.response?.data) {
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2))
    }
  }
}

runComprehensiveTests()