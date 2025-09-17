const Joi = require('joi')

/**
 * Validation schemas for ingredient operations
 */

// Base ingredient validation schema
const baseIngredientSchema = {
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Ingredient name is required',
      'string.min': 'Ingredient name must be at least 1 character',
      'string.max': 'Ingredient name cannot exceed 100 characters',
      'any.required': 'Ingredient name is required'
    }),
    
  category: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .allow(null, '')
    .messages({
      'string.min': 'Category must be at least 1 character',
      'string.max': 'Category cannot exceed 50 characters'
    }),
    
  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
    
  nutritional_info: Joi.object({
    calories_per_100g: Joi.number().min(0).max(10000).optional(),
    protein_g: Joi.number().min(0).max(100).optional(),
    carbs_g: Joi.number().min(0).max(100).optional(),
    fat_g: Joi.number().min(0).max(100).optional(),
    fiber_g: Joi.number().min(0).max(100).optional(),
    sugar_g: Joi.number().min(0).max(100).optional(),
    sodium_mg: Joi.number().min(0).max(50000).optional(),
    potassium_mg: Joi.number().min(0).max(50000).optional(),
    vitamin_c_mg: Joi.number().min(0).max(1000).optional(),
    calcium_mg: Joi.number().min(0).max(5000).optional(),
    iron_mg: Joi.number().min(0).max(100).optional()
  }).optional().allow(null),
  
  allergens: Joi.array()
    .items(Joi.string().valid(
      'gluten', 'dairy', 'eggs', 'fish', 'shellfish', 'tree_nuts', 
      'peanuts', 'wheat', 'soy', 'sesame', 'mustard', 'celery', 
      'lupin', 'molluscs', 'sulfites'
    ))
    .unique()
    .optional()
    .messages({
      'array.unique': 'Allergens must be unique',
      'any.only': 'Invalid allergen specified'
    }),
    
  storage_tips: Joi.string()
    .trim()
    .max(300)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': 'Storage tips cannot exceed 300 characters'
    }),
    
  season: Joi.array()
    .items(Joi.string().valid('spring', 'summer', 'autumn', 'winter'))
    .unique()
    .optional()
    .messages({
      'array.unique': 'Seasons must be unique',
      'any.only': 'Invalid season specified'
    }),
    
  is_organic: Joi.boolean().optional(),
  
  is_perishable: Joi.boolean().optional(),
  
  shelf_life_days: Joi.number()
    .integer()
    .min(0)
    .max(3650) // Max 10 years
    .optional()
    .messages({
      'number.integer': 'Shelf life must be a whole number',
      'number.min': 'Shelf life cannot be negative',
      'number.max': 'Shelf life cannot exceed 3650 days (10 years)'
    }),
    
  tags: Joi.array()
    .items(Joi.string().trim().min(1).max(30))
    .max(10)
    .unique()
    .optional()
    .messages({
      'array.max': 'Maximum 10 tags allowed',
      'array.unique': 'Tags must be unique',
      'string.min': 'Each tag must be at least 1 character',
      'string.max': 'Each tag cannot exceed 30 characters'
    }),
    
  is_active: Joi.boolean().optional()
}

// Create ingredient validation
const createIngredientSchema = Joi.object(baseIngredientSchema)

// Update ingredient validation (all fields optional)
const updateIngredientSchema = Joi.object({
  ...Object.fromEntries(
    Object.entries(baseIngredientSchema).map(([key, schema]) => [
      key, 
      schema.optional()
    ])
  )
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
})

// Batch create ingredients validation
const batchCreateIngredientsSchema = Joi.object({
  ingredients: Joi.array()
    .items(createIngredientSchema)
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'At least one ingredient is required',
      'array.max': 'Maximum 100 ingredients allowed per batch',
      'any.required': 'Ingredients array is required'
    }),
    
  skip_duplicates: Joi.boolean().optional().default(false),
  
  update_existing: Joi.boolean().optional().default(false)
})

// Search ingredients validation
const searchIngredientsSchema = Joi.object({
  q: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query cannot exceed 100 characters'
    }),
    
  category: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Category filter must be at least 1 character',
      'string.max': 'Category filter cannot exceed 50 characters'
    }),
    
  allergens: Joi.alternatives()
    .try(
      Joi.string(),
      Joi.array().items(Joi.string())
    )
    .optional(),
    
  season: Joi.alternatives()
    .try(
      Joi.string().valid('spring', 'summer', 'autumn', 'winter'),
      Joi.array().items(Joi.string().valid('spring', 'summer', 'autumn', 'winter'))
    )
    .optional(),
    
  is_organic: Joi.boolean().optional(),
  
  is_perishable: Joi.boolean().optional(),
  
  tags: Joi.alternatives()
    .try(
      Joi.string(),
      Joi.array().items(Joi.string())
    )
    .optional(),
    
  sort_by: Joi.string()
    .valid('name', 'category', 'created_at', 'usage_count', 'last_used')
    .optional()
    .default('name'),
    
  sort_order: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .default('asc'),
    
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1)
    .messages({
      'number.integer': 'Page must be a whole number',
      'number.min': 'Page must be at least 1'
    }),
    
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .messages({
      'number.integer': 'Limit must be a whole number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
    
  include_inactive: Joi.boolean().optional().default(false)
})

// Autocomplete ingredients validation
const autocompleteIngredientsSchema = Joi.object({
  q: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Search query is required for autocomplete',
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query cannot exceed 50 characters',
      'any.required': 'Search query is required for autocomplete'
    }),
    
  limit: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .optional()
    .default(10)
    .messages({
      'number.integer': 'Limit must be a whole number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 20 for autocomplete'
    }),
    
  category: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Category filter must be at least 1 character',
      'string.max': 'Category filter cannot exceed 50 characters'
    }),
    
  include_categories: Joi.boolean().optional().default(false)
})

// Usage statistics validation
const usageStatsSchema = Joi.object({
  ingredient_ids: Joi.array()
    .items(Joi.string().guid({ version: 'uuidv4' }))
    .min(1)
    .max(50)
    .optional()
    .messages({
      'array.min': 'At least one ingredient ID is required',
      'array.max': 'Maximum 50 ingredient IDs allowed',
      'string.guid': 'Invalid ingredient ID format'
    }),
    
  days: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .optional()
    .default(30)
    .messages({
      'number.integer': 'Days must be a whole number',
      'number.min': 'Days must be at least 1',
      'number.max': 'Days cannot exceed 365'
    }),
    
  group_by: Joi.string()
    .valid('day', 'week', 'month')
    .optional()
    .default('day')
})

/**
 * Validation schemas for category operations
 */

// Base category validation schema
const baseCategorySchema = {
  name: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Category name is required',
      'string.min': 'Category name must be at least 1 character',
      'string.max': 'Category name cannot exceed 50 characters',
      'any.required': 'Category name is required'
    }),
    
  description: Joi.string()
    .trim()
    .max(200)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': 'Description cannot exceed 200 characters'
    }),
    
  parent_id: Joi.string()
    .guid({ version: 'uuidv4' })
    .optional()
    .allow(null)
    .messages({
      'string.guid': 'Invalid parent category ID format'
    }),
    
  sort_order: Joi.number()
    .integer()
    .min(0)
    .optional()
    .default(0)
    .messages({
      'number.integer': 'Sort order must be a whole number',
      'number.min': 'Sort order cannot be negative'
    }),
    
  color: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Color must be a valid hex color code (e.g., #FF0000)'
    }),
    
  icon: Joi.string()
    .trim()
    .max(50)
    .optional()
    .allow(null, '')
    .messages({
      'string.max': 'Icon name cannot exceed 50 characters'
    }),
    
  is_active: Joi.boolean().optional().default(true)
}

// Create category validation
const createCategorySchema = Joi.object(baseCategorySchema)

// Update category validation (all fields optional)
const updateCategorySchema = Joi.object({
  ...Object.fromEntries(
    Object.entries(baseCategorySchema).map(([key, schema]) => [
      key, 
      schema.optional()
    ])
  )
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
})

// Search categories validation
const searchCategoriesSchema = Joi.object({
  q: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query cannot exceed 50 characters'
    }),
    
  parent_id: Joi.string()
    .guid({ version: 'uuidv4' })
    .optional()
    .allow(null)
    .messages({
      'string.guid': 'Invalid parent category ID format'
    }),
    
  level: Joi.number()
    .integer()
    .min(0)
    .max(2)
    .optional()
    .messages({
      'number.integer': 'Level must be a whole number',
      'number.min': 'Level cannot be negative',
      'number.max': 'Level cannot exceed 2 (maximum nesting depth)'
    }),
    
  root_only: Joi.boolean().optional().default(false),
  
  is_active: Joi.boolean().optional(),
  
  sort_by: Joi.string()
    .valid('name', 'sort_order', 'level', 'created_at', 'usage_count')
    .optional()
    .default('name'),
    
  sort_order: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .default('asc'),
    
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1)
    .messages({
      'number.integer': 'Page must be a whole number',
      'number.min': 'Page must be at least 1'
    }),
    
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .messages({
      'number.integer': 'Limit must be a whole number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    })
})

// UUID validation helper
const uuidSchema = Joi.string()
  .guid({ version: 'uuidv4' })
  .required()
  .messages({
    'string.guid': 'Invalid UUID format',
    'any.required': 'ID is required'
  })

// Slug validation helper
const slugSchema = Joi.string()
  .pattern(/^[a-z0-9-]+$/)
  .min(1)
  .max(60)
  .required()
  .messages({
    'string.pattern.base': 'Slug must contain only lowercase letters, numbers, and hyphens',
    'string.min': 'Slug must be at least 1 character',
    'string.max': 'Slug cannot exceed 60 characters',
    'any.required': 'Slug is required'
  })

/**
 * Validation helper functions
 */

/**
 * Validate ingredient creation data
 * @param {Object} data - Ingredient data to validate
 * @returns {Object} - Validation result
 */
function validateCreateIngredient(data) {
  return createIngredientSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  })
}

/**
 * Validate ingredient update data
 * @param {Object} data - Ingredient update data to validate
 * @returns {Object} - Validation result
 */
function validateUpdateIngredient(data) {
  return updateIngredientSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  })
}

/**
 * Validate batch ingredient creation data
 * @param {Object} data - Batch ingredient data to validate
 * @returns {Object} - Validation result
 */
function validateBatchCreateIngredients(data) {
  return batchCreateIngredientsSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  })
}

/**
 * Validate ingredient search parameters
 * @param {Object} params - Search parameters to validate
 * @returns {Object} - Validation result
 */
function validateSearchIngredients(params) {
  return searchIngredientsSchema.validate(params, { 
    abortEarly: false,
    stripUnknown: true 
  })
}

/**
 * Validate autocomplete parameters
 * @param {Object} params - Autocomplete parameters to validate
 * @returns {Object} - Validation result
 */
function validateAutocompleteIngredients(params) {
  return autocompleteIngredientsSchema.validate(params, { 
    abortEarly: false,
    stripUnknown: true 
  })
}

/**
 * Validate usage statistics parameters
 * @param {Object} params - Usage stats parameters to validate
 * @returns {Object} - Validation result
 */
function validateUsageStats(params) {
  return usageStatsSchema.validate(params, { 
    abortEarly: false,
    stripUnknown: true 
  })
}

/**
 * Validate category creation data
 * @param {Object} data - Category data to validate
 * @returns {Object} - Validation result
 */
function validateCreateCategory(data) {
  return createCategorySchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  })
}

/**
 * Validate category update data
 * @param {Object} data - Category update data to validate
 * @returns {Object} - Validation result
 */
function validateUpdateCategory(data) {
  return updateCategorySchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  })
}

/**
 * Validate category search parameters
 * @param {Object} params - Search parameters to validate
 * @returns {Object} - Validation result
 */
function validateSearchCategories(params) {
  return searchCategoriesSchema.validate(params, { 
    abortEarly: false,
    stripUnknown: true 
  })
}

/**
 * Validate UUID
 * @param {string} id - UUID to validate
 * @returns {Object} - Validation result
 */
function validateUUID(id) {
  return uuidSchema.validate(id)
}

/**
 * Validate slug
 * @param {string} slug - Slug to validate
 * @returns {Object} - Validation result
 */
function validateSlug(slug) {
  return slugSchema.validate(slug)
}

/**
 * Format validation errors for API response
 * @param {Object} error - Joi validation error
 * @returns {Object} - Formatted error response
 */
function formatValidationError(error) {
  const errors = error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value
  }))
  
  return {
    error: 'Validation failed',
    details: errors,
    message: errors.length === 1 
      ? errors[0].message 
      : `Validation failed on ${errors.length} fields`
  }
}

module.exports = {
  // Ingredient validation
  validateCreateIngredient,
  validateUpdateIngredient,
  validateBatchCreateIngredients,
  validateSearchIngredients,
  validateAutocompleteIngredients,
  validateUsageStats,
  
  // Category validation
  validateCreateCategory,
  validateUpdateCategory,
  validateSearchCategories,
  
  // Common validation
  validateUUID,
  validateSlug,
  formatValidationError,
  
  // Raw schemas (for testing or advanced usage)
  schemas: {
    ingredient: {
      create: createIngredientSchema,
      update: updateIngredientSchema,
      batchCreate: batchCreateIngredientsSchema,
      search: searchIngredientsSchema,
      autocomplete: autocompleteIngredientsSchema,
      usageStats: usageStatsSchema
    },
    category: {
      create: createCategorySchema,
      update: updateCategorySchema,
      search: searchCategoriesSchema
    },
    common: {
      uuid: uuidSchema,
      slug: slugSchema
    }
  }
}