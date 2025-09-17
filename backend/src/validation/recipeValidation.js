const Joi = require('joi')

/**
 * Recipe Validation Schemas
 * Comprehensive validation for recipe operations
 */

// Ingredient schema for recipe creation/updates
const ingredientSchema = Joi.object({
  ingredient_id: Joi.string().uuid().required()
    .messages({
      'string.uuid': 'Ingredient ID must be a valid UUID',
      'any.required': 'Ingredient ID is required'
    }),
  quantity: Joi.number().positive().allow(null)
    .messages({
      'number.positive': 'Quantity must be a positive number'
    }),
  unit: Joi.string().max(50).allow('', null)
    .messages({
      'string.max': 'Unit must not exceed 50 characters'
    }),
  notes: Joi.string().max(500).allow('', null)
    .messages({
      'string.max': 'Notes must not exceed 500 characters'
    })
})

// Recipe creation schema
const createRecipeSchema = Joi.object({
  title: Joi.string().min(1).max(200).required()
    .messages({
      'string.min': 'Title must not be empty',
      'string.max': 'Title must not exceed 200 characters',
      'any.required': 'Title is required'
    }),
  description: Joi.string().max(1000).allow('', null)
    .messages({
      'string.max': 'Description must not exceed 1000 characters'
    }),
  instructions: Joi.string().min(1).required()
    .messages({
      'string.min': 'Instructions cannot be empty',
      'any.required': 'Instructions are required'
    }),
  prep_time_minutes: Joi.number().integer().min(0).max(1440).allow(null)
    .messages({
      'number.integer': 'Prep time must be a whole number',
      'number.min': 'Prep time cannot be negative',
      'number.max': 'Prep time cannot exceed 24 hours (1440 minutes)'
    }),
  cook_time_minutes: Joi.number().integer().min(0).max(1440).allow(null)
    .messages({
      'number.integer': 'Cook time must be a whole number',
      'number.min': 'Cook time cannot be negative',
      'number.max': 'Cook time cannot exceed 24 hours (1440 minutes)'
    }),
  servings: Joi.number().integer().min(1).max(100).allow(null)
    .messages({
      'number.integer': 'Servings must be a whole number',
      'number.min': 'Servings must be at least 1',
      'number.max': 'Servings cannot exceed 100'
    }),
  difficulty_level: Joi.string().valid('easy', 'medium', 'hard').allow(null)
    .messages({
      'any.only': 'Difficulty level must be easy, medium, or hard'
    }),
  category_id: Joi.string().uuid().allow(null)
    .messages({
      'string.uuid': 'Category ID must be a valid UUID'
    }),
  user_id: Joi.string().uuid().required()
    .messages({
      'string.uuid': 'User ID must be a valid UUID',
      'any.required': 'User ID is required'
    }),
  image_url: Joi.string().uri().allow('', null)
    .messages({
      'string.uri': 'Image URL must be a valid URL'
    }),
  source_url: Joi.string().uri().allow('', null)
    .messages({
      'string.uri': 'Source URL must be a valid URL'
    }),
  notes: Joi.string().max(2000).allow('', null)
    .messages({
      'string.max': 'Notes must not exceed 2000 characters'
    }),
  is_public: Joi.boolean().default(true)
    .messages({
      'boolean.base': 'Is public must be true or false'
    }),
  ingredients: Joi.array().items(ingredientSchema).min(1).required()
    .messages({
      'array.min': 'At least one ingredient is required',
      'array.base': 'Ingredients must be an array',
      'any.required': 'Ingredients are required'
    })
})

// Recipe update schema (all fields optional except ingredients validation)
const updateRecipeSchema = Joi.object({
  title: Joi.string().min(1).max(200)
    .messages({
      'string.min': 'Title must not be empty',
      'string.max': 'Title must not exceed 200 characters'
    }),
  description: Joi.string().max(1000).allow('', null)
    .messages({
      'string.max': 'Description must not exceed 1000 characters'
    }),
  instructions: Joi.string().min(1)
    .messages({
      'string.min': 'Instructions cannot be empty'
    }),
  prep_time_minutes: Joi.number().integer().min(0).max(1440).allow(null)
    .messages({
      'number.integer': 'Prep time must be a whole number',
      'number.min': 'Prep time cannot be negative',
      'number.max': 'Prep time cannot exceed 24 hours (1440 minutes)'
    }),
  cook_time_minutes: Joi.number().integer().min(0).max(1440).allow(null)
    .messages({
      'number.integer': 'Cook time must be a whole number',
      'number.min': 'Cook time cannot be negative',
      'number.max': 'Cook time cannot exceed 24 hours (1440 minutes)'
    }),
  servings: Joi.number().integer().min(1).max(100).allow(null)
    .messages({
      'number.integer': 'Servings must be a whole number',
      'number.min': 'Servings must be at least 1',
      'number.max': 'Servings cannot exceed 100'
    }),
  difficulty_level: Joi.string().valid('easy', 'medium', 'hard').allow(null)
    .messages({
      'any.only': 'Difficulty level must be easy, medium, or hard'
    }),
  category_id: Joi.string().uuid().allow(null)
    .messages({
      'string.uuid': 'Category ID must be a valid UUID'
    }),
  image_url: Joi.string().uri().allow('', null)
    .messages({
      'string.uri': 'Image URL must be a valid URL'
    }),
  source_url: Joi.string().uri().allow('', null)
    .messages({
      'string.uri': 'Source URL must be a valid URL'
    }),
  notes: Joi.string().max(2000).allow('', null)
    .messages({
      'string.max': 'Notes must not exceed 2000 characters'
    }),
  is_public: Joi.boolean()
    .messages({
      'boolean.base': 'Is public must be true or false'
    }),
  ingredients: Joi.array().items(ingredientSchema).min(1)
    .messages({
      'array.min': 'At least one ingredient is required when updating ingredients',
      'array.base': 'Ingredients must be an array'
    })
}).min(1)
.messages({
  'object.min': 'At least one field must be provided for update'
})

// Recipe search/query schema
const searchRecipeSchema = Joi.object({
  search: Joi.string().max(100).allow('')
    .messages({
      'string.max': 'Search term must not exceed 100 characters'
    }),
  category_id: Joi.string().uuid()
    .messages({
      'string.uuid': 'Category ID must be a valid UUID'
    }),
  user_id: Joi.string().uuid()
    .messages({
      'string.uuid': 'User ID must be a valid UUID'
    }),
  difficulty_level: Joi.string().valid('easy', 'medium', 'hard')
    .messages({
      'any.only': 'Difficulty level must be easy, medium, or hard'
    }),
  is_public: Joi.boolean()
    .messages({
      'boolean.base': 'Is public must be true or false'
    }),
  ingredients: Joi.alternatives().try(
    Joi.string().uuid(),
    Joi.array().items(Joi.string().uuid()).min(1)
  )
    .messages({
      'string.uuid': 'Ingredient ID must be a valid UUID',
      'array.min': 'At least one ingredient ID is required',
      'alternatives.match': 'Ingredients must be a UUID string or array of UUIDs'
    }),
  min_prep_time: Joi.number().integer().min(0)
    .messages({
      'number.integer': 'Minimum prep time must be a whole number',
      'number.min': 'Minimum prep time cannot be negative'
    }),
  max_prep_time: Joi.number().integer().min(0)
    .messages({
      'number.integer': 'Maximum prep time must be a whole number',
      'number.min': 'Maximum prep time cannot be negative'
    }),
  min_cook_time: Joi.number().integer().min(0)
    .messages({
      'number.integer': 'Minimum cook time must be a whole number',
      'number.min': 'Minimum cook time cannot be negative'
    }),
  max_cook_time: Joi.number().integer().min(0)
    .messages({
      'number.integer': 'Maximum cook time must be a whole number',
      'number.min': 'Maximum cook time cannot be negative'
    }),
  min_servings: Joi.number().integer().min(1)
    .messages({
      'number.integer': 'Minimum servings must be a whole number',
      'number.min': 'Minimum servings must be at least 1'
    }),
  max_servings: Joi.number().integer().min(1)
    .messages({
      'number.integer': 'Maximum servings must be a whole number',
      'number.min': 'Maximum servings must be at least 1'
    }),
  page: Joi.number().integer().min(1).default(1)
    .messages({
      'number.integer': 'Page must be a whole number',
      'number.min': 'Page must be at least 1'
    }),
  limit: Joi.number().integer().min(1).max(100).default(20)
    .messages({
      'number.integer': 'Limit must be a whole number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  sort_by: Joi.string().valid('created_at', 'updated_at', 'title', 'difficulty_level', 'prep_time_minutes', 'cook_time_minutes').default('created_at')
    .messages({
      'any.only': 'Sort by must be one of: created_at, updated_at, title, difficulty_level, prep_time_minutes, cook_time_minutes'
    }),
  sort_order: Joi.string().valid('asc', 'desc').default('desc')
    .messages({
      'any.only': 'Sort order must be asc or desc'
    })
})

// UUID parameter validation
const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required()
    .messages({
      'string.uuid': 'ID must be a valid UUID',
      'any.required': 'ID is required'
    })
})

// Recipe validation functions
const validateCreateRecipe = (data) => {
  return createRecipeSchema.validate(data, { 
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  })
}

const validateUpdateRecipe = (data) => {
  return updateRecipeSchema.validate(data, { 
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  })
}

const validateSearchRecipe = (data) => {
  return searchRecipeSchema.validate(data, { 
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  })
}

const validateUuidParam = (data) => {
  return uuidParamSchema.validate(data, { 
    abortEarly: false,
    allowUnknown: false 
  })
}

// Custom validation helpers
const validateRecipeOwnership = (recipe, userId) => {
  return recipe.user_id === userId
}

const validateRecipeAccess = (recipe, userId) => {
  return recipe.is_public || recipe.user_id === userId
}

const sanitizeRecipeForPublic = (recipe) => {
  if (!recipe.is_public) {
    const { user_id, ...publicRecipe } = recipe.toJSON ? recipe.toJSON() : recipe
    return publicRecipe
  }
  return recipe.toJSON ? recipe.toJSON() : recipe
}

module.exports = {
  createRecipeSchema,
  updateRecipeSchema,
  searchRecipeSchema,
  uuidParamSchema,
  ingredientSchema,
  validateCreateRecipe,
  validateUpdateRecipe,
  validateSearchRecipe,
  validateUuidParam,
  validateRecipeOwnership,
  validateRecipeAccess,
  sanitizeRecipeForPublic
}