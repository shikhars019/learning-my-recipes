const { describe, it, before, after } = require('mocha')
const { expect } = require('chai')
const path = require('path')

// Test configuration
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'error' // Reduce log noise during tests

// Ensure test database is configured
if (!process.env.DATABASE_URL && !process.env.DB_TEST_HOST) {
  console.warn('Warning: No test database configured. Tests may fail if database is unavailable.')
  console.warn('Set DATABASE_URL or DB_TEST_* environment variables for proper testing.')
}

// Global test setup
before(async function() {
  this.timeout(10000) // Allow time for database connections
  console.log('Starting test suite...')
})

after(async function() {
  console.log('Test suite completed.')
})

// Export test utilities
module.exports = {
  expect,
  // Helper function to generate unique test names
  generateTestName: (prefix = 'TEST') => {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    return `${prefix}_${timestamp}_${random}`
  },

  // Helper function to create test data
  createTestData: {
    ingredient: (overrides = {}) => ({
      name: module.exports.generateTestName('INGREDIENT'),
      category: 'Test Category',
      description: 'Test ingredient description',
      nutritional_info: {
        calories_per_100g: 100,
        protein_g: 5.0,
        carbs_g: 20.0,
        fat_g: 2.0
      },
      allergens: [],
      season: ['all'],
      is_organic: false,
      tags: ['test'],
      ...overrides
    }),

    category: (overrides = {}) => ({
      name: module.exports.generateTestName('CATEGORY'),
      description: 'Test category description',
      color: '#4CAF50',
      is_active: true,
      ...overrides
    }),

    recipe: (overrides = {}) => ({
      title: module.exports.generateTestName('RECIPE'),
      description: 'Test recipe description',
      instructions: ['Step 1: Test instruction'],
      prep_time: 15,
      cook_time: 30,
      servings: 4,
      difficulty: 'easy',
      cuisine: 'test',
      dietary_tags: [],
      ...overrides
    })
  },

  // Helper function to wait for async operations
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper function to validate UUID format
  isValidUUID: (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  },

  // Helper function to validate database responses
  validateDatabaseResponse: (response, shouldSucceed = true) => {
    if (response.status === 503) {
      console.log('Database unavailable during test - this is expected in some environments')
      return false // Indicates test should be skipped
    }
    
    if (shouldSucceed) {
      expect(response.status).to.be.within(200, 299)
      expect(response.body.success).to.be.true
    } else {
      expect(response.status).to.be.within(400, 499)
      expect(response.body.success).to.be.false
    }
    
    return true // Indicates test should continue
  }
}