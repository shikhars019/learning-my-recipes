const { expect } = require('chai')
const {
  validateCreateIngredient,
  validateUpdateIngredient,
  validateBatchCreateIngredients,
  validateSearchIngredients,
  validateAutocompleteIngredients,
  validateUsageStats,
  validateCreateCategory,
  validateUpdateCategory,
  validateSearchCategories,
  validateUUID,
  validateSlug,
  formatValidationError
} = require('../../src/validation/ingredientValidation')

describe('Ingredient Validation', () => {
  describe('Create Ingredient Validation', () => {
    it('should validate correct ingredient data', () => {
      const validData = {
        name: 'Fresh Tomatoes',
        category: 'Vegetables',
        description: 'Fresh red tomatoes from the garden',
        nutritional_info: {
          calories_per_100g: 18,
          protein_g: 0.9,
          carbs_g: 3.9,
          fat_g: 0.2
        },
        allergens: ['tree_nuts'],
        season: ['summer', 'autumn'],
        is_organic: true,
        is_perishable: true,
        shelf_life_days: 7,
        tags: ['fresh', 'red', 'vitamin-c']
      }

      const { error, value } = validateCreateIngredient(validData)
      expect(error).to.be.undefined
      expect(value.name).to.equal(validData.name)
      expect(value.category).to.equal(validData.category)
      expect(value.is_organic).to.be.true
    })

    it('should reject ingredient without name', () => {
      const invalidData = {
        category: 'Vegetables',
        description: 'Missing name'
      }

      const { error } = validateCreateIngredient(invalidData)
      expect(error).to.not.be.undefined
      expect(error.details[0].message).to.include('name')
      expect(error.details[0].message).to.include('required')
    })

    it('should reject ingredient with invalid allergens', () => {
      const invalidData = {
        name: 'Test Ingredient',
        allergens: ['invalid_allergen', 'gluten']
      }

      const { error } = validateCreateIngredient(invalidData)
      expect(error).to.not.be.undefined
      expect(error.details[0].message).to.include('allergen')
    })

    it('should reject ingredient with invalid season', () => {
      const invalidData = {
        name: 'Test Ingredient',
        season: ['invalid_season', 'summer']
      }

      const { error } = validateCreateIngredient(invalidData)
      expect(error).to.not.be.undefined
      expect(error.details[0].message).to.include('season')
    })

    it('should reject ingredient with too many tags', () => {
      const invalidData = {
        name: 'Test Ingredient',
        tags: Array(15).fill().map((_, i) => `tag${i}`) // 15 tags (limit is 10)
      }

      const { error } = validateCreateIngredient(invalidData)
      expect(error).to.not.be.undefined
      expect(error.details[0].message).to.include('10')
    })

    it('should reject ingredient with invalid nutritional values', () => {
      const invalidData = {
        name: 'Test Ingredient',
        nutritional_info: {
          calories_per_100g: -10, // Negative calories
          protein_g: 150 // Over 100g protein per 100g
        }
      }

      const { error } = validateCreateIngredient(invalidData)
      expect(error).to.not.be.undefined
    })

    it('should validate and clean ingredient data', () => {
      const dataWithExtraFields = {
        name: '  Fresh Tomatoes  ', // Extra spaces
        category: 'Vegetables',
        unknown_field: 'should be stripped',
        tags: ['fresh', 'fresh', 'red'] // Duplicates
      }

      const { error, value } = validateCreateIngredient(dataWithExtraFields)
      expect(error).to.be.undefined
      expect(value.name).to.equal('Fresh Tomatoes') // Trimmed
      expect(value.unknown_field).to.be.undefined // Stripped
    })
  })

  describe('Update Ingredient Validation', () => {
    it('should validate partial updates', () => {
      const updateData = {
        description: 'Updated description',
        is_organic: false
      }

      const { error, value } = validateUpdateIngredient(updateData)
      expect(error).to.be.undefined
      expect(value.description).to.equal(updateData.description)
      expect(value.is_organic).to.be.false
    })

    it('should reject empty update', () => {
      const { error } = validateUpdateIngredient({})
      expect(error).to.not.be.undefined
      expect(error.details[0].message).to.include('at least one field')
    })

    it('should allow updating only specific fields', () => {
      const updateData = {
        category: 'New Category'
      }

      const { error, value } = validateUpdateIngredient(updateData)
      expect(error).to.be.undefined
      expect(value.category).to.equal('New Category')
      expect(Object.keys(value)).to.have.lengthOf(1)
    })
  })

  describe('Batch Create Validation', () => {
    it('should validate batch ingredient creation', () => {
      const batchData = {
        ingredients: [
          { name: 'Ingredient 1', category: 'Category 1' },
          { name: 'Ingredient 2', category: 'Category 2' }
        ],
        skip_duplicates: true,
        update_existing: false
      }

      const { error, value } = validateBatchCreateIngredients(batchData)
      expect(error).to.be.undefined
      expect(value.ingredients).to.have.lengthOf(2)
      expect(value.skip_duplicates).to.be.true
      expect(value.update_existing).to.be.false
    })

    it('should reject batch with too many ingredients', () => {
      const batchData = {
        ingredients: Array(150).fill().map((_, i) => ({ 
          name: `Ingredient ${i}`, 
          category: 'Test' 
        }))
      }

      const { error } = validateBatchCreateIngredients(batchData)
      expect(error).to.not.be.undefined
      expect(error.details[0].message).to.include('100')
    })

    it('should reject batch with invalid ingredients', () => {
      const batchData = {
        ingredients: [
          { name: 'Valid Ingredient', category: 'Category' },
          { category: 'Missing name' } // Invalid ingredient
        ]
      }

      const { error } = validateBatchCreateIngredients(batchData)
      expect(error).to.not.be.undefined
      expect(error.details[0].path).to.include('ingredients')
    })
  })

  describe('Search Validation', () => {
    it('should validate search parameters', () => {
      const searchParams = {
        q: 'tomato',
        category: 'Vegetables',
        allergens: ['gluten'],
        season: ['summer'],
        is_organic: true,
        tags: ['fresh'],
        sort_by: 'name',
        sort_order: 'asc',
        page: 1,
        limit: 20
      }

      const { error, value } = validateSearchIngredients(searchParams)
      expect(error).to.be.undefined
      expect(value.q).to.equal('tomato')
      expect(value.category).to.equal('Vegetables')
      expect(value.page).to.equal(1)
      expect(value.limit).to.equal(20)
    })

    it('should provide defaults for optional search parameters', () => {
      const { error, value } = validateSearchIngredients({})
      expect(error).to.be.undefined
      expect(value.sort_by).to.equal('name')
      expect(value.sort_order).to.equal('asc')
      expect(value.page).to.equal(1)
      expect(value.limit).to.equal(20)
      expect(value.include_inactive).to.be.false
    })

    it('should reject invalid sort parameters', () => {
      const searchParams = {
        sort_by: 'invalid_field',
        sort_order: 'invalid_order'
      }

      const { error } = validateSearchIngredients(searchParams)
      expect(error).to.not.be.undefined
    })

    it('should handle array and string parameters correctly', () => {
      const withArrays = {
        allergens: ['gluten', 'dairy'],
        season: ['summer', 'winter'],
        tags: ['fresh', 'organic']
      }

      const { error: error1 } = validateSearchIngredients(withArrays)
      expect(error1).to.be.undefined

      const withStrings = {
        allergens: 'gluten',
        season: 'summer', 
        tags: 'fresh'
      }

      const { error: error2 } = validateSearchIngredients(withStrings)
      expect(error2).to.be.undefined
    })
  })

  describe('Autocomplete Validation', () => {
    it('should validate autocomplete parameters', () => {
      const params = {
        q: 'tom',
        limit: 5,
        category: 'Vegetables',
        include_categories: true
      }

      const { error, value } = validateAutocompleteIngredients(params)
      expect(error).to.be.undefined
      expect(value.q).to.equal('tom')
      expect(value.limit).to.equal(5)
      expect(value.include_categories).to.be.true
    })

    it('should require query parameter', () => {
      const { error } = validateAutocompleteIngredients({})
      expect(error).to.not.be.undefined
      expect(error.details[0].message).to.include('required')
    })

    it('should limit autocomplete query length', () => {
      const params = {
        q: 'a'.repeat(60) // Too long query
      }

      const { error } = validateAutocompleteIngredients(params)
      expect(error).to.not.be.undefined
      expect(error.details[0].message).to.include('50')
    })
  })

  describe('Usage Statistics Validation', () => {
    it('should validate usage statistics parameters', () => {
      const params = {
        ingredient_ids: ['123e4567-e89b-12d3-a456-426614174000'],
        days: 30,
        group_by: 'day'
      }

      const { error, value } = validateUsageStats(params)
      expect(error).to.be.undefined
      expect(value.days).to.equal(30)
      expect(value.group_by).to.equal('day')
    })

    it('should provide default values', () => {
      const { error, value } = validateUsageStats({})
      expect(error).to.be.undefined
      expect(value.days).to.equal(30)
      expect(value.group_by).to.equal('day')
    })

    it('should reject invalid UUID format', () => {
      const params = {
        ingredient_ids: ['invalid-uuid']
      }

      const { error } = validateUsageStats(params)
      expect(error).to.not.be.undefined
      expect(error.details[0].message).to.include('UUID')
    })
  })
})

describe('Category Validation', () => {
  describe('Create Category Validation', () => {
    it('should validate correct category data', () => {
      const validData = {
        name: 'Main Dishes',
        description: 'Primary course recipes',
        parent_id: '123e4567-e89b-12d3-a456-426614174000',
        sort_order: 1,
        color: '#FF0000',
        icon: 'restaurant',
        is_active: true
      }

      const { error, value } = validateCreateCategory(validData)
      expect(error).to.be.undefined
      expect(value.name).to.equal(validData.name)
      expect(value.sort_order).to.equal(1)
      expect(value.color).to.equal('#FF0000')
    })

    it('should reject category without name', () => {
      const invalidData = {
        description: 'Missing name'
      }

      const { error } = validateCreateCategory(invalidData)
      expect(error).to.not.be.undefined
      expect(error.details[0].message).to.include('name')
      expect(error.details[0].message).to.include('required')
    })

    it('should reject invalid color format', () => {
      const invalidData = {
        name: 'Test Category',
        color: 'red' // Invalid hex format
      }

      const { error } = validateCreateCategory(invalidData)
      expect(error).to.not.be.undefined
      expect(error.details[0].message).to.include('hex color')
    })

    it('should reject invalid parent UUID', () => {
      const invalidData = {
        name: 'Test Category',
        parent_id: 'invalid-uuid'
      }

      const { error } = validateCreateCategory(invalidData)
      expect(error).to.not.be.undefined
      expect(error.details[0].message).to.include('UUID')
    })

    it('should provide default values', () => {
      const minimalData = {
        name: 'Test Category'
      }

      const { error, value } = validateCreateCategory(minimalData)
      expect(error).to.be.undefined
      expect(value.sort_order).to.equal(0)
      expect(value.is_active).to.be.true
    })
  })

  describe('Update Category Validation', () => {
    it('should validate partial category updates', () => {
      const updateData = {
        description: 'Updated description',
        color: '#00FF00'
      }

      const { error, value } = validateUpdateCategory(updateData)
      expect(error).to.be.undefined
      expect(value.description).to.equal(updateData.description)
      expect(value.color).to.equal('#00FF00')
    })

    it('should reject empty update', () => {
      const { error } = validateUpdateCategory({})
      expect(error).to.not.be.undefined
      expect(error.details[0].message).to.include('at least one field')
    })
  })

  describe('Search Categories Validation', () => {
    it('should validate category search parameters', () => {
      const searchParams = {
        q: 'main',
        parent_id: '123e4567-e89b-12d3-a456-426614174000',
        level: 1,
        root_only: false,
        is_active: true,
        sort_by: 'name',
        page: 1,
        limit: 50
      }

      const { error, value } = validateSearchCategories(searchParams)
      expect(error).to.be.undefined
      expect(value.q).to.equal('main')
      expect(value.level).to.equal(1)
      expect(value.root_only).to.be.false
    })

    it('should provide default values', () => {
      const { error, value } = validateSearchCategories({})
      expect(error).to.be.undefined
      expect(value.sort_by).to.equal('name')
      expect(value.sort_order).to.equal('asc')
      expect(value.page).to.equal(1)
      expect(value.limit).to.equal(50)
      expect(value.root_only).to.be.false
    })

    it('should reject invalid level values', () => {
      const searchParams = {
        level: 5 // Max level is 2
      }

      const { error } = validateSearchCategories(searchParams)
      expect(error).to.not.be.undefined
      expect(error.details[0].message).to.include('2')
    })
  })
})

describe('Common Validation Utilities', () => {
  describe('UUID Validation', () => {
    it('should validate correct UUID format', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000'
      const { error } = validateUUID(validUUID)
      expect(error).to.be.undefined
    })

    it('should reject invalid UUID format', () => {
      const invalidUUID = 'not-a-uuid'
      const { error } = validateUUID(invalidUUID)
      expect(error).to.not.be.undefined
      expect(error.details[0].message).to.include('UUID')
    })

    it('should reject empty or null UUID', () => {
      const { error: error1 } = validateUUID('')
      const { error: error2 } = validateUUID(null)
      
      expect(error1).to.not.be.undefined
      expect(error2).to.not.be.undefined
    })
  })

  describe('Slug Validation', () => {
    it('should validate correct slug format', () => {
      const validSlugs = ['main-dishes', 'appetizers', 'soup-stew', 'category123']
      
      validSlugs.forEach(slug => {
        const { error } = validateSlug(slug)
        expect(error).to.be.undefined
      })
    })

    it('should reject invalid slug format', () => {
      const invalidSlugs = ['Main Dishes', 'category_name', 'category!', 'UPPERCASE']
      
      invalidSlugs.forEach(slug => {
        const { error } = validateSlug(slug)
        expect(error).to.not.be.undefined
      })
    })

    it('should reject empty or too long slugs', () => {
      const { error: error1 } = validateSlug('')
      const { error: error2 } = validateSlug('a'.repeat(70))
      
      expect(error1).to.not.be.undefined
      expect(error2).to.not.be.undefined
    })
  })

  describe('Error Formatting', () => {
    it('should format validation errors correctly', () => {
      const invalidData = {
        name: '', // Required field empty
        category: 'a'.repeat(60), // Too long
        allergens: ['invalid'] // Invalid enum value
      }

      const { error } = validateCreateIngredient(invalidData)
      expect(error).to.not.be.undefined

      const formatted = formatValidationError(error)
      expect(formatted).to.have.property('error')
      expect(formatted).to.have.property('details')
      expect(formatted).to.have.property('message')
      expect(formatted.details).to.be.an('array')
      expect(formatted.details.length).to.be.at.least(1)
      
      formatted.details.forEach(detail => {
        expect(detail).to.have.property('field')
        expect(detail).to.have.property('message')
      })
    })

    it('should handle single error correctly', () => {
      const invalidData = {
        name: '' // Only one error
      }

      const { error } = validateCreateIngredient(invalidData)
      const formatted = formatValidationError(error)
      
      expect(formatted.details).to.have.lengthOf(1)
      expect(formatted.message).to.equal(formatted.details[0].message)
    })

    it('should handle multiple errors correctly', () => {
      const invalidData = {
        name: '', // Required
        category: 'a'.repeat(60) // Too long
      }

      const { error } = validateCreateIngredient(invalidData)
      const formatted = formatValidationError(error)
      
      expect(formatted.details.length).to.be.at.least(2)
      expect(formatted.message).to.include('fields')
    })
  })

  describe('Data Sanitization', () => {
    it('should strip unknown fields from ingredient data', () => {
      const dataWithUnknownFields = {
        name: 'Test Ingredient',
        category: 'Test Category',
        unknown_field: 'should be removed',
        another_unknown: 123
      }

      const { error, value } = validateCreateIngredient(dataWithUnknownFields)
      expect(error).to.be.undefined
      expect(value.unknown_field).to.be.undefined
      expect(value.another_unknown).to.be.undefined
      expect(value.name).to.equal('Test Ingredient')
    })

    it('should trim whitespace from string fields', () => {
      const dataWithWhitespace = {
        name: '  Test Ingredient  ',
        category: '  Test Category  ',
        description: '  Test Description  '
      }

      const { error, value } = validateCreateIngredient(dataWithWhitespace)
      expect(error).to.be.undefined
      expect(value.name).to.equal('Test Ingredient')
      expect(value.category).to.equal('Test Category')
      expect(value.description).to.equal('Test Description')
    })

    it('should handle null and empty values correctly', () => {
      const dataWithNulls = {
        name: 'Test Ingredient',
        category: null,
        description: '',
        tags: null
      }

      const { error, value } = validateCreateIngredient(dataWithNulls)
      expect(error).to.be.undefined
      expect(value.category).to.be.null
      expect(value.description).to.equal('')
      expect(value.tags).to.be.null
    })
  })
})