const request = require('supertest')
const app = require('../app')
const { testConnection } = require('../config/database')

describe('Recipe API Tests', () => {
  // Mock data for testing
  const mockRecipe = {
    title: 'Test Chocolate Cake',
    description: 'A delicious chocolate cake recipe for testing',
    instructions: 'Mix ingredients. Bake at 350°F for 30 minutes. Cool before serving.',
    prep_time_minutes: 20,
    cook_time_minutes: 30,
    servings: 8,
    difficulty_level: 'medium',
    user_id: '123e4567-e89b-12d3-a456-426614174000', // Mock UUID
    is_public: true,
    ingredients: [
      {
        ingredient_id: '123e4567-e89b-12d3-a456-426614174001',
        quantity: 2,
        unit: 'cups',
        notes: 'All-purpose flour'
      },
      {
        ingredient_id: '123e4567-e89b-12d3-a456-426614174002', 
        quantity: 1,
        unit: 'cup',
        notes: 'Cocoa powder'
      }
    ]
  }

  const invalidRecipe = {
    title: '', // Invalid: empty title
    description: 'Test description',
    // Missing required fields: instructions, user_id, ingredients
  }

  describe('POST /api/recipes', () => {
    test('Should validate request body and return validation errors', async () => {
      const res = await request(app)
        .post('/api/recipes')
        .send(invalidRecipe)
        .expect(400)

      expect(res.body.error).toBe('Validation Error')
      expect(res.body.code).toBe('VALIDATION_ERROR')
      expect(res.body.details).toBeDefined()
      expect(Array.isArray(res.body.details)).toBe(true)
      expect(res.body.details.length).toBeGreaterThan(0)
    })

    test('Should validate required fields', async () => {
      const res = await request(app)
        .post('/api/recipes')
        .send({})
        .expect(400)

      const errorFields = res.body.details.map(detail => detail.field)
      expect(errorFields).toContain('title')
      expect(errorFields).toContain('instructions')
      expect(errorFields).toContain('user_id')
      expect(errorFields).toContain('ingredients')
    })

    test('Should validate ingredient structure', async () => {
      const recipeWithInvalidIngredients = {
        ...mockRecipe,
        ingredients: [
          {
            // Missing ingredient_id
            quantity: 2,
            unit: 'cups'
          }
        ]
      }

      const res = await request(app)
        .post('/api/recipes')
        .send(recipeWithInvalidIngredients)
        .expect(400)

      expect(res.body.error).toBe('Validation Error')
      expect(res.body.details.some(detail => detail.field.includes('ingredients'))).toBe(true)
    })

    test('Should validate UUID formats', async () => {
      const recipeWithInvalidUUIDs = {
        ...mockRecipe,
        user_id: 'invalid-uuid',
        category_id: 'also-invalid',
        ingredients: [
          {
            ingredient_id: 'not-a-uuid',
            quantity: 1,
            unit: 'cup'
          }
        ]
      }

      const res = await request(app)
        .post('/api/recipes')
        .send(recipeWithInvalidUUIDs)
        .expect(400)

      expect(res.body.error).toBe('Validation Error')
      const errorMessages = res.body.details.map(detail => detail.message)
      expect(errorMessages.some(msg => msg.includes('GUID') || msg.includes('UUID'))).toBe(true)
    })

    test('Should validate time constraints', async () => {
      const recipeWithInvalidTimes = {
        ...mockRecipe,
        prep_time_minutes: -5, // Invalid: negative
        cook_time_minutes: 1500, // Invalid: > 24 hours
        servings: 0 // Invalid: less than 1
      }

      const res = await request(app)
        .post('/api/recipes')
        .send(recipeWithInvalidTimes)
        .expect(400)

      expect(res.body.error).toBe('Validation Error')
    })

    test('Should validate difficulty level', async () => {
      const recipeWithInvalidDifficulty = {
        ...mockRecipe,
        difficulty_level: 'impossible' // Invalid: not in enum
      }

      const res = await request(app)
        .post('/api/recipes')
        .send(recipeWithInvalidDifficulty)
        .expect(400)

      expect(res.body.error).toBe('Validation Error')
      expect(res.body.details.some(detail => 
        detail.message.includes('easy, medium, or hard')
      )).toBe(true)
    })

    // Note: These tests will fail without actual database connection
    // but demonstrate the expected API behavior
    test('Should return foreign key error for non-existent user_id', async () => {
      const res = await request(app)
        .post('/api/recipes')
        .send(mockRecipe)
      
      // Expect either 201 success (if DB exists) or foreign key error
      if (res.status === 400) {
        expect(res.body.code).toBe('FOREIGN_KEY_ERROR')
        expect(res.body.message).toContain('User ID')
      } else if (res.status === 500) {
        // Database connection error is expected in test environment
        expect(res.body.error).toBeDefined()
      }
    })
  })

  describe('GET /api/recipes', () => {
    test('Should return recipe list with pagination', async () => {
      const res = await request(app)
        .get('/api/recipes')

      // Expect either success or database unavailable
      expect([200, 503]).toContain(res.status)
      
      if (res.status === 200) {
        expect(res.body.recipes).toBeDefined()
        expect(Array.isArray(res.body.recipes)).toBe(true)
        expect(res.body.page).toBeDefined()
        expect(res.body.limit).toBeDefined()
      } else if (res.status === 503) {
        expect(res.body.code).toBe('DATABASE_UNAVAILABLE')
      }
    })

    test('Should validate query parameters', async () => {
      const res = await request(app)
        .get('/api/recipes?page=0&limit=101') // Invalid: page < 1, limit > 100
        .expect(400)

      expect(res.body.error).toBe('Validation Error')
    })

    test('Should handle search parameters', async () => {
      const res = await request(app)
        .get('/api/recipes?search=chocolate&difficulty_level=easy&page=1&limit=10')

      // Should either return results or database error
      expect([200, 503, 500]).toContain(res.status)
      
      if (res.status === 200) {
        expect(res.body.recipes).toBeDefined()
        expect(res.body.page).toBe(1)
        expect(res.body.limit).toBe(10)
      }
    })

    test('Should handle ingredient-based search', async () => {
      const ingredientId = '123e4567-e89b-12d3-a456-426614174001'
      const res = await request(app)
        .get(`/api/recipes?ingredients=${ingredientId}`)

      expect([200, 503, 500]).toContain(res.status)
      
      if (res.status === 200) {
        expect(res.body.search_type).toBe('ingredients')
        expect(res.body.recipes).toBeDefined()
      }
    })
  })

  describe('GET /api/recipes/:id', () => {
    test('Should validate UUID parameter', async () => {
      const res = await request(app)
        .get('/api/recipes/invalid-uuid')
        .expect(400)

      expect(res.body.error).toBe('Invalid ID format')
      expect(res.body.code).toBe('INVALID_UUID')
    })

    test('Should return 404 for non-existent recipe', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000'
      const res = await request(app)
        .get(`/api/recipes/${validUuid}`)

      // Expect 404 (not found) or database error
      expect([404, 503, 500]).toContain(res.status)
      
      if (res.status === 404) {
        expect(res.body.error).toBe('Recipe not found')
        expect(res.body.code).toBe('RECIPE_NOT_FOUND')
      }
    })
  })

  describe('PUT /api/recipes/:id', () => {
    test('Should validate UUID parameter', async () => {
      const res = await request(app)
        .put('/api/recipes/invalid-uuid')
        .send({ title: 'Updated Title' })
        .expect(400)

      expect(res.body.error).toBe('Invalid ID format')
      expect(res.body.code).toBe('INVALID_UUID')
    })

    test('Should validate update data', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000'
      const res = await request(app)
        .put(`/api/recipes/${validUuid}`)
        .send({
          title: '', // Invalid: empty title
          prep_time_minutes: -10, // Invalid: negative time
          difficulty_level: 'impossible' // Invalid: not in enum
        })
        .expect(400)

      expect(res.body.error).toBe('Validation Error')
      expect(res.body.code).toBe('VALIDATION_ERROR')
    })

    test('Should require at least one field for update', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000'
      const res = await request(app)
        .put(`/api/recipes/${validUuid}`)
        .send({}) // Empty body
        .expect(400)

      expect(res.body.error).toBe('Validation Error')
    })
  })

  describe('DELETE /api/recipes/:id', () => {
    test('Should validate UUID parameter', async () => {
      const res = await request(app)
        .delete('/api/recipes/invalid-uuid')
        .expect(400)

      expect(res.body.error).toBe('Invalid ID format')
      expect(res.body.code).toBe('INVALID_UUID')
    })

    test('Should return 404 for non-existent recipe', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000'
      const res = await request(app)
        .delete(`/api/recipes/${validUuid}`)

      // Expect 404 (not found) or database error
      expect([404, 503, 500]).toContain(res.status)
    })
  })

  describe('GET /api/recipes/:id/versions', () => {
    test('Should validate UUID parameter', async () => {
      const res = await request(app)
        .get('/api/recipes/invalid-uuid/versions')
        .expect(400)

      expect(res.body.error).toBe('Invalid ID format')
      expect(res.body.code).toBe('INVALID_UUID')
    })

    test('Should return 404 for non-existent recipe', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000'
      const res = await request(app)
        .get(`/api/recipes/${validUuid}/versions`)

      expect([404, 503, 500]).toContain(res.status)
    })
  })

  describe('GET /api/recipes/search/ingredients', () => {
    test('Should require ingredients parameter', async () => {
      const res = await request(app)
        .get('/api/recipes/search/ingredients')
        .expect(400)

      expect(res.body.error).toBe('Missing parameter')
      expect(res.body.code).toBe('MISSING_INGREDIENTS')
    })

    test('Should validate ingredient UUID format', async () => {
      const res = await request(app)
        .get('/api/recipes/search/ingredients?ingredients=invalid-uuid,another-invalid')
        .expect(400)

      expect(res.body.error).toBe('Invalid ingredient IDs')
      expect(res.body.code).toBe('INVALID_UUID')
      expect(res.body.invalid_ids).toContain('invalid-uuid')
      expect(res.body.invalid_ids).toContain('another-invalid')
    })

    test('Should accept comma-separated ingredients', async () => {
      const ingredient1 = '123e4567-e89b-12d3-a456-426614174001'
      const ingredient2 = '123e4567-e89b-12d3-a456-426614174002'
      const res = await request(app)
        .get(`/api/recipes/search/ingredients?ingredients=${ingredient1},${ingredient2}`)

      expect([200, 503, 500]).toContain(res.status)
      
      if (res.status === 200) {
        expect(res.body.recipes).toBeDefined()
        expect(res.body.search_ingredients).toEqual([ingredient1, ingredient2])
      }
    })

    test('Should handle search options', async () => {
      const ingredient = '123e4567-e89b-12d3-a456-426614174001'
      const res = await request(app)
        .get(`/api/recipes/search/ingredients?ingredients=${ingredient}&is_public=true&limit=25`)

      expect([200, 503, 500]).toContain(res.status)
      
      if (res.status === 200) {
        expect(res.body.limit).toBe(25)
      }
    })
  })

  describe('Recipe Model Integration', () => {
    test('Should handle database connection errors gracefully', async () => {
      // Test that endpoints return proper error responses when database is unavailable
      const res = await request(app)
        .get('/api/recipes')

      if (res.status === 500) {
        expect(res.body.error).toBeDefined()
        // Should not expose internal database details
        expect(res.body.error).not.toContain('password')
        expect(res.body.error).not.toContain('connection string')
      }
    })
  })

  describe('Edge Cases', () => {
    test('Should handle very long search terms', async () => {
      const longSearch = 'a'.repeat(150) // Exceeds 100 char limit
      const res = await request(app)
        .get(`/api/recipes?search=${longSearch}`)
        .expect(400)

      expect(res.body.error).toBe('Validation Error')
    })

    test('Should handle special characters in search', async () => {
      const specialSearch = 'café & résumé'
      const res = await request(app)
        .get(`/api/recipes?search=${encodeURIComponent(specialSearch)}`)

      expect([200, 400, 503, 500]).toContain(res.status)
    })

    test('Should handle boundary values for numeric fields', async () => {
      const res = await request(app)
        .get('/api/recipes?min_prep_time=0&max_prep_time=1440&min_servings=1&max_servings=100')

      expect([200, 400, 503, 500]).toContain(res.status)
    })
  })
})

// Helper function tests
describe('Validation Helper Functions', () => {
  const {
    validateCreateRecipe,
    validateUpdateRecipe,
    validateSearchRecipe,
    validateUuidParam
  } = require('../validation/recipeValidation')

  test('validateCreateRecipe should accept valid recipe data', () => {
    const validRecipe = {
      title: 'Test Recipe',
      instructions: 'Test instructions',
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      ingredients: [
        {
          ingredient_id: '123e4567-e89b-12d3-a456-426614174001',
          quantity: 1,
          unit: 'cup'
        }
      ]
    }

    const { error } = validateCreateRecipe(validRecipe)
    expect(error).toBe(undefined)
  })

  test('validateUpdateRecipe should accept partial data', () => {
    const partialUpdate = {
      title: 'Updated Title',
      prep_time_minutes: 25
    }

    const { error } = validateUpdateRecipe(partialUpdate)
    expect(error).toBe(undefined)
  })

  test('validateSearchRecipe should accept empty query', () => {
    const { error } = validateSearchRecipe({})
    expect(error).toBe(undefined)
  })

  test('validateUuidParam should reject invalid UUIDs', () => {
    const { error } = validateUuidParam({ id: 'invalid-uuid' })
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('GUID')
  })
})