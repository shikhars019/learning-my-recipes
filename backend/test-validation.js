// Test validation directly
const { validateCreateIngredient } = require('./src/validation/ingredientValidation')

async function testValidation() {
  try {
    console.log('Testing validation...')
    
    const testData = {
      name: 'Validation Test Tomato',
      category: 'Vegetables'
    }
    
    console.log('Validating:', testData)
    
    const { error, value } = validateCreateIngredient(testData)
    
    if (error) {
      console.error('❌ Validation Error:', error.details)
    } else {
      console.log('✅ Validation Success:', value)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testValidation()