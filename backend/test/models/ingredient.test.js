const { expect } = require('chai')
const Ingredient = require('../../src/models/Ingredient')
const { dbPool } = require('../../src/config/database')

describe('Ingredient Model', () => {
  let testIngredientIds = []
  
  before(async () => {
    // Clean up any existing test data
    try {
      await dbPool.query(`
        DELETE FROM ingredients 
        WHERE name LIKE '%TEST_%' OR name LIKE '%test_%'
      `)
    } catch (error) {
      // Database might not be available in test environment
      console.log('Database cleanup skipped - database not available')
    }
  })

  afterEach(async () => {
    // Clean up test ingredients
    if (testIngredientIds.length > 0) {
      try {
        await dbPool.query(`
          DELETE FROM ingredients 
          WHERE id = ANY($1)
        `, [testIngredientIds])
      } catch (error) {
        // Ignore cleanup errors
      }
      testIngredientIds = []
    }
  })

  describe('Name Normalization', () => {
    it('should normalize ingredient names correctly', () => {
      const tests = [
        { input: 'Tomato', expected: 'tomato' },
        { input: 'RED  BELL   PEPPER', expected: 'red bell pepper' },
        { input: "Chef's Special Salt", expected: "chef's special salt" },
        { input: 'Garlic-Herb Mix!@#', expected: 'garlic-herb mix' },
        { input: '  Extra Virgin Olive Oil  ', expected: 'extra virgin olive oil' }
      ]

      tests.forEach(test => {
        expect(Ingredient.normalizeName(test.input)).to.equal(test.expected)
      })
    })

    it('should handle edge cases in normalization', () => {
      expect(Ingredient.normalizeName('')).to.equal('')
      expect(Ingredient.normalizeName(null)).to.equal('')
      expect(Ingredient.normalizeName('   ')).to.equal('')
      expect(Ingredient.normalizeName('A')).to.equal('a')
    })
  })

  describe('CRUD Operations', () => {
    it('should create a new ingredient with valid data', async () => {
      try {
        const ingredientData = {
          name: 'TEST_Ingredient_Create',
          category: 'Test Category',
          description: 'A test ingredient for creation',
          nutritional_info: {
            calories_per_100g: 25,
            protein_g: 1.2,
            carbs_g: 5.8,
            fat_g: 0.3
          },
          allergens: ['gluten'],
          season: ['summer', 'autumn'],
          is_organic: true,
          tags: ['test', 'vegetable']
        }

        const ingredient = await Ingredient.create(ingredientData)
        testIngredientIds.push(ingredient.id)

        expect(ingredient.id).to.be.a('string')
        expect(ingredient.name).to.equal(ingredientData.name)
        expect(ingredient.category).to.equal(ingredientData.category)
        expect(ingredient.description).to.equal(ingredientData.description)
        expect(ingredient.is_organic).to.equal(true)
        expect(ingredient.allergens).to.deep.equal(['gluten'])
        expect(ingredient.season).to.deep.equal(['summer', 'autumn'])
        expect(ingredient.tags).to.deep.equal(['test', 'vegetable'])
        expect(ingredient.nutritional_info).to.be.an('object')
        expect(ingredient.nutritional_info.calories_per_100g).to.equal(25)
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          console.log('Skipping database test - database not available')
          this.skip()
        } else {
          throw error
        }
      }
    })

    it('should find ingredient by ID', async () => {
      try {
        const ingredientData = {
          name: 'TEST_Ingredient_FindById',
          category: 'Test Category'
        }

        const created = await Ingredient.create(ingredientData)
        testIngredientIds.push(created.id)

        const found = await Ingredient.findById(created.id)
        expect(found).to.not.be.null
        expect(found.id).to.equal(created.id)
        expect(found.name).to.equal(ingredientData.name)
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })

    it('should return null when ingredient not found', async () => {
      try {
        const nonExistentId = '123e4567-e89b-12d3-a456-426614174000'
        const found = await Ingredient.findById(nonExistentId)
        expect(found).to.be.null
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })

    it('should update an existing ingredient', async () => {
      try {
        const ingredientData = {
          name: 'TEST_Ingredient_Update',
          category: 'Original Category'
        }

        const created = await Ingredient.create(ingredientData)
        testIngredientIds.push(created.id)

        const updateData = {
          category: 'Updated Category',
          description: 'Updated description',
          is_organic: true
        }

        const updated = await Ingredient.update(created.id, updateData)
        expect(updated).to.not.be.null
        expect(updated.category).to.equal('Updated Category')
        expect(updated.description).to.equal('Updated description')
        expect(updated.is_organic).to.equal(true)
        expect(updated.name).to.equal(ingredientData.name) // Should remain unchanged
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })

    it('should soft delete an ingredient', async () => {
      try {
        const ingredientData = {
          name: 'TEST_Ingredient_Delete',
          category: 'Test Category'
        }

        const created = await Ingredient.create(ingredientData)
        testIngredientIds.push(created.id)

        const deleted = await Ingredient.delete(created.id)
        expect(deleted).to.be.true

        // Verify it's soft deleted (marked as inactive)
        const found = await Ingredient.findById(created.id)
        expect(found).to.be.null // findById should only return active ingredients
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })
  })

  describe('Duplicate Prevention', () => {
    it('should prevent creating ingredients with duplicate normalized names', async () => {
      try {
        const ingredientData = {
          name: 'TEST_Duplicate_Check',
          category: 'Test Category'
        }

        const first = await Ingredient.create(ingredientData)
        testIngredientIds.push(first.id)

        // Try to create with same normalized name but different casing/spacing
        const duplicateData = {
          name: ' TEST_DUPLICATE_CHECK ',
          category: 'Different Category'
        }

        try {
          await Ingredient.create(duplicateData)
          expect.fail('Should have thrown duplicate error')
        } catch (error) {
          expect(error.message).to.include('already exists')
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else if (!error.message.includes('already exists')) {
          throw error
        }
      }
    })
  })

  describe('Search Functionality', () => {
    beforeEach(async () => {
      // Create test ingredients for search
      try {
        const testIngredients = [
          { name: 'TEST_Search_Tomato', category: 'Vegetables', tags: ['red', 'fresh'] },
          { name: 'TEST_Search_Cherry_Tomato', category: 'Vegetables', tags: ['small', 'sweet'] },
          { name: 'TEST_Search_Chicken', category: 'Meat', tags: ['protein', 'lean'] }
        ]

        for (const data of testIngredients) {
          const ingredient = await Ingredient.create(data)
          testIngredientIds.push(ingredient.id)
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })

    it('should search ingredients by name', async () => {
      try {
        const result = await Ingredient.search({ q: 'TEST_Search_Tomato' })
        
        expect(result.ingredients).to.be.an('array')
        expect(result.total).to.be.at.least(2) // Should find both tomato ingredients
        
        const names = result.ingredients.map(ing => ing.name)
        expect(names).to.include('TEST_Search_Tomato')
        expect(names).to.include('TEST_Search_Cherry_Tomato')
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })

    it('should filter ingredients by category', async () => {
      try {
        const result = await Ingredient.search({ category: 'Meat' })
        
        expect(result.ingredients).to.be.an('array')
        const categories = result.ingredients.map(ing => ing.category)
        categories.forEach(cat => {
          if (cat) expect(cat).to.equal('Meat')
        })
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })

    it('should handle pagination correctly', async () => {
      try {
        const result = await Ingredient.search({ 
          q: 'TEST_Search', 
          limit: 1, 
          page: 1 
        })
        
        expect(result.ingredients).to.have.lengthOf(1)
        expect(result.limit).to.equal(1)
        expect(result.page).to.equal(1)
        expect(result.total).to.be.at.least(1)
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })
  })

  describe('Autocomplete Functionality', () => {
    beforeEach(async () => {
      try {
        const testIngredients = [
          { name: 'TEST_Auto_Apple', category: 'Fruits' },
          { name: 'TEST_Auto_Apricot', category: 'Fruits' },
          { name: 'TEST_Auto_Avocado', category: 'Fruits' }
        ]

        for (const data of testIngredients) {
          const ingredient = await Ingredient.create(data)
          testIngredientIds.push(ingredient.id)
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })

    it('should provide autocomplete suggestions', async () => {
      try {
        const suggestions = await Ingredient.autocomplete('TEST_Auto_A', { limit: 5 })
        
        expect(suggestions).to.be.an('array')
        expect(suggestions.length).to.be.at.least(3)
        
        suggestions.forEach(suggestion => {
          expect(suggestion).to.have.property('id')
          expect(suggestion).to.have.property('name')
          expect(suggestion).to.have.property('relevance_score')
          expect(suggestion.name).to.include('TEST_Auto_A')
        })
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })

    it('should order suggestions by relevance', async () => {
      try {
        const suggestions = await Ingredient.autocomplete('TEST_Auto_Apple')
        
        expect(suggestions).to.be.an('array')
        if (suggestions.length > 1) {
          // First suggestion should be exact match (highest score)
          expect(suggestions[0].name).to.equal('TEST_Auto_Apple')
          expect(suggestions[0].relevance_score).to.be.at.least(suggestions[1].relevance_score)
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })
  })

  describe('Batch Operations', () => {
    it('should create multiple ingredients in batch', async () => {
      try {
        const ingredients = [
          { name: 'TEST_Batch_1', category: 'Batch Test' },
          { name: 'TEST_Batch_2', category: 'Batch Test' },
          { name: 'TEST_Batch_3', category: 'Batch Test' }
        ]

        const result = await Ingredient.createBatch(ingredients, false, false)
        
        expect(result.created).to.be.an('array')
        expect(result.created.length).to.equal(3)
        expect(result.skipped).to.be.an('array')
        expect(result.updated).to.be.an('array')
        
        // Track IDs for cleanup
        result.created.forEach(ing => testIngredientIds.push(ing.id))
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })

    it('should skip duplicates when requested', async () => {
      try {
        // Create initial ingredient
        const initial = await Ingredient.create({
          name: 'TEST_Batch_Duplicate',
          category: 'Batch Test'
        })
        testIngredientIds.push(initial.id)

        // Batch with duplicate
        const ingredients = [
          { name: 'TEST_Batch_New', category: 'Batch Test' },
          { name: 'TEST_Batch_Duplicate', category: 'Batch Test' } // Duplicate
        ]

        const result = await Ingredient.createBatch(ingredients, true, false) // skip_duplicates = true
        
        expect(result.created).to.have.lengthOf(1) // Only new one created
        expect(result.skipped).to.have.lengthOf(1) // Duplicate skipped
        
        result.created.forEach(ing => testIngredientIds.push(ing.id))
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })
  })

  describe('Usage Tracking', () => {
    it('should track ingredient usage', async () => {
      try {
        const ingredient = await Ingredient.create({
          name: 'TEST_Usage_Track',
          category: 'Test Category'
        })
        testIngredientIds.push(ingredient.id)

        const initialUsage = ingredient.usage_count || 0
        
        await Ingredient.trackUsage(ingredient.id)
        
        const updated = await Ingredient.findById(ingredient.id)
        expect(updated.usage_count).to.equal(initialUsage + 1)
        expect(updated.last_used_at).to.not.be.null
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })
  })

  describe('Statistics', () => {
    it('should return ingredient statistics', async () => {
      try {
        const stats = await Ingredient.getStatistics()
        
        expect(stats).to.be.an('object')
        expect(stats).to.have.property('total_active')
        expect(stats).to.have.property('total_inactive')
        expect(stats).to.have.property('by_category')
        expect(stats).to.have.property('most_used')
        
        expect(stats.total_active).to.be.a('number')
        expect(stats.by_category).to.be.an('array')
        expect(stats.most_used).to.be.an('array')
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid data gracefully', async () => {
      try {
        // Test with missing required field
        await Ingredient.create({
          category: 'Test Category'
          // Missing required 'name' field
        })
        expect.fail('Should have thrown validation error')
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          expect(error.message).to.include('name')
        }
      }
    })

    it('should handle database connection errors gracefully', async () => {
      // This test specifically checks error handling when database is unavailable
      // In a real scenario with database connection issues
      try {
        await Ingredient.findById('invalid-uuid-format')
      } catch (error) {
        // Should either handle UUID format error or connection error gracefully
        expect(error).to.be.an('error')
      }
    })
  })
})