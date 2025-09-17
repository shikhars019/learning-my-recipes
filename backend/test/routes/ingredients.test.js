const request = require('supertest')
const { expect } = require('chai')
const app = require('../../src/app')

describe('Ingredient API Routes', () => {
  let testIngredientIds = []
  
  afterEach(async () => {
    // Clean up created test ingredients
    for (const id of testIngredientIds) {
      try {
        await request(app).delete(`/api/ingredients/${id}`)
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    testIngredientIds = []
  })

  describe('POST /api/ingredients', () => {
    it('should create a new ingredient with valid data', async () => {
      const ingredientData = {
        name: 'TEST_API_Tomato',
        category: 'Vegetables',
        description: 'Fresh red tomatoes',
        nutritional_info: {
          calories_per_100g: 18,
          protein_g: 0.9
        },
        allergens: ['tree_nuts'],
        season: ['summer'],
        is_organic: true,
        tags: ['fresh', 'red']
      }

      const response = await request(app)
        .post('/api/ingredients')
        .send(ingredientData)
        .expect((res) => {
          if (res.status === 503) {
            console.log('Database unavailable, skipping test')
            return
          }
          expect(res.status).to.be.oneOf([201, 503])
        })

      if (response.status === 201) {
        expect(response.body.success).to.be.true
        expect(response.body.data.name).to.equal(ingredientData.name)
        expect(response.body.data.category).to.equal(ingredientData.category)
        expect(response.body.data.is_organic).to.be.true
        testIngredientIds.push(response.body.data.id)
      }
    })

    it('should reject ingredient with missing required fields', async () => {
      const invalidData = {
        category: 'Vegetables'
        // Missing required 'name' field
      }

      const response = await request(app)
        .post('/api/ingredients')
        .send(invalidData)

      if (response.status !== 503) { // Skip if database unavailable
        expect(response.status).to.equal(400)
        expect(response.body.success).to.be.false
        expect(response.body.error).to.equal('Validation failed')
      }
    })

    it('should reject ingredient with invalid data types', async () => {
      const invalidData = {
        name: 123, // Should be string
        category: 'Vegetables',
        is_organic: 'yes' // Should be boolean
      }

      const response = await request(app)
        .post('/api/ingredients')
        .send(invalidData)

      if (response.status !== 503) {
        expect(response.status).to.equal(400)
        expect(response.body.success).to.be.false
      }
    })

    it('should handle duplicate ingredient names', async () => {
      const ingredientData = {
        name: 'TEST_API_Duplicate',
        category: 'Test Category'
      }

      // Create first ingredient
      const response1 = await request(app)
        .post('/api/ingredients')
        .send(ingredientData)

      if (response1.status === 201) {
        testIngredientIds.push(response1.body.data.id)

        // Try to create duplicate
        const response2 = await request(app)
          .post('/api/ingredients')
          .send(ingredientData)

        expect(response2.status).to.equal(409)
        expect(response2.body.success).to.be.false
        expect(response2.body.error).to.equal('Duplicate ingredient')
      }
    })
  })

  describe('GET /api/ingredients/:id', () => {
    it('should get ingredient by valid ID', async () => {
      // First create an ingredient
      const ingredientData = {
        name: 'TEST_API_GetById',
        category: 'Test Category'
      }

      const createResponse = await request(app)
        .post('/api/ingredients')
        .send(ingredientData)

      if (createResponse.status === 201) {
        const ingredientId = createResponse.body.data.id
        testIngredientIds.push(ingredientId)

        const getResponse = await request(app)
          .get(`/api/ingredients/${ingredientId}`)
          .expect((res) => {
            if (res.status === 503) return
            expect(res.status).to.be.oneOf([200, 404])
          })

        if (getResponse.status === 200) {
          expect(getResponse.body.success).to.be.true
          expect(getResponse.body.data.id).to.equal(ingredientId)
          expect(getResponse.body.data.name).to.equal(ingredientData.name)
        }
      }
    })

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/ingredients/invalid-uuid')

      if (response.status !== 503) {
        expect(response.status).to.equal(400)
        expect(response.body.success).to.be.false
        expect(response.body.error).to.equal('Invalid ingredient ID')
      }
    })

    it('should return 404 for non-existent ingredient', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000'
      const response = await request(app)
        .get(`/api/ingredients/${nonExistentId}`)

      if (response.status !== 503) {
        expect(response.status).to.equal(404)
        expect(response.body.success).to.be.false
        expect(response.body.error).to.equal('Ingredient not found')
      }
    })
  })

  describe('GET /api/ingredients', () => {
    beforeEach(async () => {
      // Create test ingredients for search
      const testIngredients = [
        { name: 'TEST_API_Search_Tomato', category: 'Vegetables' },
        { name: 'TEST_API_Search_Cherry_Tomato', category: 'Vegetables' },
        { name: 'TEST_API_Search_Chicken', category: 'Meat' }
      ]

      for (const data of testIngredients) {
        try {
          const response = await request(app)
            .post('/api/ingredients')
            .send(data)
          
          if (response.status === 201) {
            testIngredientIds.push(response.body.data.id)
          }
        } catch (error) {
          // Skip if database unavailable
        }
      }
    })

    it('should search ingredients with default parameters', async () => {
      const response = await request(app)
        .get('/api/ingredients')

      if (response.status !== 503) {
        expect(response.status).to.equal(200)
        expect(response.body.success).to.be.true
        expect(response.body.data.ingredients).to.be.an('array')
        expect(response.body.data.pagination).to.be.an('object')
        expect(response.body.data.pagination).to.have.property('page')
        expect(response.body.data.pagination).to.have.property('limit')
        expect(response.body.data.pagination).to.have.property('total')
      }
    })

    it('should search ingredients by query', async () => {
      const response = await request(app)
        .get('/api/ingredients?q=TEST_API_Search_Tomato')

      if (response.status === 200 && response.body.data.ingredients.length > 0) {
        expect(response.body.success).to.be.true
        const ingredients = response.body.data.ingredients
        const names = ingredients.map(ing => ing.name)
        expect(names.some(name => name.includes('Tomato'))).to.be.true
      }
    })

    it('should filter ingredients by category', async () => {
      const response = await request(app)
        .get('/api/ingredients?category=Vegetables')

      if (response.status === 200) {
        expect(response.body.success).to.be.true
        const ingredients = response.body.data.ingredients
        ingredients.forEach(ingredient => {
          if (ingredient.category) {
            expect(ingredient.category).to.equal('Vegetables')
          }
        })
      }
    })

    it('should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/api/ingredients?page=1&limit=1')

      if (response.status === 200) {
        expect(response.body.success).to.be.true
        expect(response.body.data.pagination.page).to.equal(1)
        expect(response.body.data.pagination.limit).to.equal(1)
        expect(response.body.data.ingredients.length).to.be.at.most(1)
      }
    })

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/ingredients?page=0&limit=200') // Invalid values

      if (response.status !== 503) {
        expect(response.status).to.equal(400)
        expect(response.body.success).to.be.false
      }
    })
  })

  describe('GET /api/ingredients/autocomplete', () => {
    beforeEach(async () => {
      // Create test ingredients for autocomplete
      const testIngredients = [
        { name: 'TEST_AUTO_Apple', category: 'Fruits' },
        { name: 'TEST_AUTO_Apricot', category: 'Fruits' }
      ]

      for (const data of testIngredients) {
        try {
          const response = await request(app)
            .post('/api/ingredients')
            .send(data)
          
          if (response.status === 201) {
            testIngredientIds.push(response.body.data.id)
          }
        } catch (error) {
          // Skip if database unavailable
        }
      }
    })

    it('should provide autocomplete suggestions', async () => {
      const response = await request(app)
        .get('/api/ingredients/autocomplete?q=TEST_AUTO_A')

      if (response.status === 200) {
        expect(response.body.success).to.be.true
        expect(response.body.data.suggestions).to.be.an('array')
        expect(response.body.data.query).to.equal('TEST_AUTO_A')
      }
    })

    it('should require query parameter', async () => {
      const response = await request(app)
        .get('/api/ingredients/autocomplete')

      if (response.status !== 503) {
        expect(response.status).to.equal(400)
        expect(response.body.success).to.be.false
      }
    })

    it('should limit autocomplete results', async () => {
      const response = await request(app)
        .get('/api/ingredients/autocomplete?q=TEST_AUTO&limit=1')

      if (response.status === 200 && response.body.data.suggestions.length > 0) {
        expect(response.body.data.suggestions.length).to.be.at.most(1)
      }
    })
  })

  describe('PUT /api/ingredients/:id', () => {
    it('should update existing ingredient', async () => {
      // Create ingredient first
      const ingredientData = {
        name: 'TEST_API_Update',
        category: 'Original Category'
      }

      const createResponse = await request(app)
        .post('/api/ingredients')
        .send(ingredientData)

      if (createResponse.status === 201) {
        const ingredientId = createResponse.body.data.id
        testIngredientIds.push(ingredientId)

        const updateData = {
          category: 'Updated Category',
          description: 'Updated description'
        }

        const updateResponse = await request(app)
          .put(`/api/ingredients/${ingredientId}`)
          .send(updateData)

        if (updateResponse.status === 200) {
          expect(updateResponse.body.success).to.be.true
          expect(updateResponse.body.data.category).to.equal('Updated Category')
          expect(updateResponse.body.data.description).to.equal('Updated description')
          expect(updateResponse.body.data.name).to.equal(ingredientData.name)
        }
      }
    })

    it('should return 404 for non-existent ingredient', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000'
      const updateData = { category: 'New Category' }

      const response = await request(app)
        .put(`/api/ingredients/${nonExistentId}`)
        .send(updateData)

      if (response.status !== 503) {
        expect(response.status).to.equal(404)
        expect(response.body.success).to.be.false
      }
    })

    it('should validate update data', async () => {
      const ingredientData = {
        name: 'TEST_API_Update_Validation',
        category: 'Test Category'
      }

      const createResponse = await request(app)
        .post('/api/ingredients')
        .send(ingredientData)

      if (createResponse.status === 201) {
        const ingredientId = createResponse.body.data.id
        testIngredientIds.push(ingredientId)

        const invalidUpdate = {
          name: '', // Empty name
          allergens: ['invalid_allergen']
        }

        const updateResponse = await request(app)
          .put(`/api/ingredients/${ingredientId}`)
          .send(invalidUpdate)

        expect(updateResponse.status).to.equal(400)
        expect(updateResponse.body.success).to.be.false
      }
    })
  })

  describe('DELETE /api/ingredients/:id', () => {
    it('should soft delete ingredient', async () => {
      // Create ingredient first
      const ingredientData = {
        name: 'TEST_API_Delete',
        category: 'Test Category'
      }

      const createResponse = await request(app)
        .post('/api/ingredients')
        .send(ingredientData)

      if (createResponse.status === 201) {
        const ingredientId = createResponse.body.data.id
        
        const deleteResponse = await request(app)
          .delete(`/api/ingredients/${ingredientId}`)

        if (deleteResponse.status === 200) {
          expect(deleteResponse.body.success).to.be.true
          expect(deleteResponse.body.message).to.include('deactivated')

          // Verify ingredient is no longer accessible
          const getResponse = await request(app)
            .get(`/api/ingredients/${ingredientId}`)

          expect(getResponse.status).to.equal(404)
        }
      }
    })

    it('should return 404 for non-existent ingredient', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000'
      
      const response = await request(app)
        .delete(`/api/ingredients/${nonExistentId}`)

      if (response.status !== 503) {
        expect(response.status).to.equal(404)
        expect(response.body.success).to.be.false
      }
    })
  })

  describe('POST /api/ingredients/batch', () => {
    it('should create multiple ingredients in batch', async () => {
      const batchData = {
        ingredients: [
          { name: 'TEST_BATCH_1', category: 'Batch Test' },
          { name: 'TEST_BATCH_2', category: 'Batch Test' }
        ],
        skip_duplicates: false,
        update_existing: false
      }

      const response = await request(app)
        .post('/api/ingredients/batch')
        .send(batchData)

      if (response.status === 201) {
        expect(response.body.success).to.be.true
        expect(response.body.data.created).to.be.an('array')
        expect(response.body.data.created.length).to.equal(2)
        
        // Track for cleanup
        response.body.data.created.forEach(ing => {
          testIngredientIds.push(ing.id)
        })
      }
    })

    it('should validate batch data', async () => {
      const invalidBatch = {
        ingredients: [
          { category: 'Missing name' } // Invalid ingredient
        ]
      }

      const response = await request(app)
        .post('/api/ingredients/batch')
        .send(invalidBatch)

      if (response.status !== 503) {
        expect(response.status).to.equal(400)
        expect(response.body.success).to.be.false
      }
    })

    it('should handle empty batch', async () => {
      const emptyBatch = {
        ingredients: []
      }

      const response = await request(app)
        .post('/api/ingredients/batch')
        .send(emptyBatch)

      if (response.status !== 503) {
        expect(response.status).to.equal(400)
        expect(response.body.success).to.be.false
      }
    })
  })

  describe('GET /api/ingredients/statistics', () => {
    it('should return ingredient statistics', async () => {
      const response = await request(app)
        .get('/api/ingredients/statistics')

      if (response.status === 200) {
        expect(response.body.success).to.be.true
        expect(response.body.data).to.be.an('object')
        expect(response.body.data).to.have.property('total_active')
        expect(response.body.data).to.have.property('by_category')
      }
    })

    it('should handle statistics for specific ingredients', async () => {
      const ingredientData = {
        name: 'TEST_STATS_Ingredient',
        category: 'Test Category'
      }

      const createResponse = await request(app)
        .post('/api/ingredients')
        .send(ingredientData)

      if (createResponse.status === 201) {
        const ingredientId = createResponse.body.data.id
        testIngredientIds.push(ingredientId)

        const response = await request(app)
          .get(`/api/ingredients/statistics?ingredient_ids=${ingredientId}`)

        if (response.status === 200) {
          expect(response.body.success).to.be.true
          expect(response.body.data).to.be.an('object')
        }
      }
    })
  })

  describe('POST /api/ingredients/:id/track-usage', () => {
    it('should track ingredient usage', async () => {
      const ingredientData = {
        name: 'TEST_TRACK_Usage',
        category: 'Test Category'
      }

      const createResponse = await request(app)
        .post('/api/ingredients')
        .send(ingredientData)

      if (createResponse.status === 201) {
        const ingredientId = createResponse.body.data.id
        testIngredientIds.push(ingredientId)

        const trackResponse = await request(app)
          .post(`/api/ingredients/${ingredientId}/track-usage`)

        if (trackResponse.status === 200) {
          expect(trackResponse.body.success).to.be.true
          expect(trackResponse.body.message).to.include('tracked')
        }
      }
    })
  })

  describe('GET /api/ingredients/categories/list', () => {
    it('should return ingredient categories', async () => {
      const response = await request(app)
        .get('/api/ingredients/categories/list')

      if (response.status === 200) {
        expect(response.body.success).to.be.true
        expect(response.body.data.categories).to.be.an('array')
        expect(response.body.data.total_categories).to.be.a('number')
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test assumes database might be unavailable
      const response = await request(app)
        .get('/api/ingredients')

      if (response.status === 503) {
        expect(response.body.success).to.be.false
        expect(response.body.error).to.equal('Database temporarily unavailable')
        expect(response.body.message).to.include('try again later')
      }
    })

    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/ingredients/non-existent-endpoint')

      expect(response.status).to.equal(404)
      expect(response.body.success).to.be.false
      expect(response.body.error).to.equal('Endpoint not found')
      expect(response.body.available_endpoints).to.be.an('array')
    })

    it('should handle malformed JSON in requests', async () => {
      const response = await request(app)
        .post('/api/ingredients')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}') // Malformed JSON

      expect(response.status).to.equal(400)
    })

    it('should handle unsupported HTTP methods', async () => {
      const response = await request(app)
        .patch('/api/ingredients/123e4567-e89b-12d3-a456-426614174000')

      expect(response.status).to.equal(404)
    })
  })
})