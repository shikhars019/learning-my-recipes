const Joi = require('joi')
const { validationError } = require('./errorHandler')
const logger = require('../config/logger')

/**
 * Request Validation Middleware Factory
 * Creates validation middleware for different request parts (body, params, query)
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source]
    
    const { error, value } = schema.validate(data, {
      abortEarly: false, // Return all errors, not just the first one
      allowUnknown: false, // Don't allow unknown fields
      stripUnknown: true // Remove unknown fields from the result
    })
    
    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message.replace(/"/g, "'"))
        .join(', ')
      
      logger.logWarning('Request validation failed', {
        source,
        errors: error.details.map(d => ({ field: d.path.join('.'), message: d.message })),
        receivedData: data
      })
      
      return next(validationError(errorMessage))
    }
    
    // Replace the request data with the validated (and potentially transformed) data
    req[source] = value
    next()
  }
}

/**
 * Common Joi schemas for reuse
 */
const schemas = {
  // ID validation (UUID or integer)
  id: Joi.alternatives().try(
    Joi.string().uuid({ version: 'uuidv4' }),
    Joi.number().integer().positive()
  ).required(),
  
  // Pagination schemas
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid('created_at', 'updated_at', 'name', 'title').default('created_at'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),
  
  // Recipe validation schemas
  recipe: {
    create: Joi.object({
      title: Joi.string().min(3).max(255).required(),
      description: Joi.string().max(1000),
      prep_time: Joi.number().integer().min(1).max(480).required(),
      cook_time: Joi.number().integer().min(0).max(480).required(),
      servings: Joi.number().integer().min(1).max(50).required(),
      difficulty: Joi.string().valid('easy', 'medium', 'hard').required(),
      category_id: Joi.number().integer().positive().required(),
      instructions: Joi.array().items(Joi.string().min(5).max(500)).min(1).required(),
      tips: Joi.string().max(500),
      image_url: Joi.string().uri(),
      ingredients: Joi.array().items(
        Joi.object({
          ingredient_id: Joi.number().integer().positive().required(),
          quantity: Joi.number().positive(),
          unit: Joi.string().max(50),
          preparation: Joi.string().max(100),
          optional: Joi.boolean().default(false)
        })
      ).min(1).required()
    }),
    
    update: Joi.object({
      title: Joi.string().min(3).max(255),
      description: Joi.string().max(1000),
      prep_time: Joi.number().integer().min(1).max(480),
      cook_time: Joi.number().integer().min(0).max(480),
      servings: Joi.number().integer().min(1).max(50),
      difficulty: Joi.string().valid('easy', 'medium', 'hard'),
      category_id: Joi.number().integer().positive(),
      instructions: Joi.array().items(Joi.string().min(5).max(500)).min(1),
      tips: Joi.string().max(500),
      image_url: Joi.string().uri(),
      ingredients: Joi.array().items(
        Joi.object({
          ingredient_id: Joi.number().integer().positive().required(),
          quantity: Joi.number().positive(),
          unit: Joi.string().max(50),
          preparation: Joi.string().max(100),
          optional: Joi.boolean().default(false)
        })
      ).min(1)
    }).min(1),
    
    search: Joi.object({
      q: Joi.string().max(100),
      ingredients: Joi.alternatives().try(
        Joi.string(),
        Joi.array().items(Joi.string())
      ),
      category: Joi.alternatives().try(
        Joi.number().integer().positive(),
        Joi.array().items(Joi.number().integer().positive())
      ),
      difficulty: Joi.alternatives().try(
        Joi.string().valid('easy', 'medium', 'hard'),
        Joi.array().items(Joi.string().valid('easy', 'medium', 'hard'))
      ),
      prep_time_max: Joi.number().integer().min(1).max(480),
      cook_time_max: Joi.number().integer().min(0).max(480),
      servings_min: Joi.number().integer().min(1),
      servings_max: Joi.number().integer().max(50)
    })
  },
  
  // Ingredient validation schemas
  ingredient: {
    create: Joi.object({
      name: Joi.string().min(2).max(200).required(),
      category: Joi.string().max(100),
      common_unit: Joi.string().max(50),
      nutrition_data: Joi.object({
        calories: Joi.number().min(0),
        protein: Joi.number().min(0),
        carbs: Joi.number().min(0),
        fat: Joi.number().min(0),
        fiber: Joi.number().min(0),
        sugar: Joi.number().min(0)
      })
    }),
    
    search: Joi.object({
      q: Joi.string().min(1).max(100).required(),
      category: Joi.string().max(100),
      limit: Joi.number().integer().min(1).max(50).default(10)
    })
  },
  
  // User validation schemas
  user: {
    create: Joi.object({
      email: Joi.string().email().required(),
      username: Joi.string().alphanum().min(3).max(50).required(),
      first_name: Joi.string().max(100),
      last_name: Joi.string().max(100),
      bio: Joi.string().max(500)
    }),
    
    update: Joi.object({
      email: Joi.string().email(),
      username: Joi.string().alphanum().min(3).max(50),
      first_name: Joi.string().max(100),
      last_name: Joi.string().max(100),
      bio: Joi.string().max(500)
    }).min(1)
  },
  
  // AI request validation
  ai: {
    generateRecipe: Joi.object({
      ingredients: Joi.array().items(Joi.string()).min(1).max(20).required(),
      dietary_restrictions: Joi.array().items(
        Joi.string().valid('vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'low-carb', 'keto')
      ),
      preferred_cuisine: Joi.string().max(50),
      difficulty: Joi.string().valid('easy', 'medium', 'hard'),
      max_prep_time: Joi.number().integer().min(5).max(480)
    })
  }
}

/**
 * Pre-built validation middleware for common use cases
 */
const validators = {
  // Parameter validators
  validateId: validate(Joi.object({ id: schemas.id }), 'params'),
  validateRecipeId: validate(Joi.object({ id: schemas.id }), 'params'),
  validateUserId: validate(Joi.object({ id: schemas.id }), 'params'),
  
  // Query validators
  validatePagination: validate(schemas.pagination, 'query'),
  validateRecipeSearch: validate(schemas.recipe.search, 'query'),
  validateIngredientSearch: validate(schemas.ingredient.search, 'query'),
  
  // Body validators
  validateRecipeCreate: validate(schemas.recipe.create),
  validateRecipeUpdate: validate(schemas.recipe.update),
  validateIngredientCreate: validate(schemas.ingredient.create),
  validateUserCreate: validate(schemas.user.create),
  validateUserUpdate: validate(schemas.user.update),
  validateAIGenerate: validate(schemas.ai.generateRecipe)
}

/**
 * Sanitization helpers
 */
const sanitize = {
  /**
   * Sanitize string input to prevent XSS
   */
  string: (str) => {
    if (typeof str !== 'string') return str
    return str
      .replace(/[<>]/g, '') // Remove HTML tags
      .trim()
  },
  
  /**
   * Sanitize search query
   */
  searchQuery: (query) => {
    if (typeof query !== 'string') return query
    return query
      .replace(/[<>]/g, '')
      .replace(/[^\w\s-]/g, '') // Only allow word characters, spaces, and hyphens
      .trim()
      .substring(0, 100) // Limit length
  },
  
  /**
   * Normalize ingredient name
   */
  ingredientName: (name) => {
    if (typeof name !== 'string') return name
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
  }
}

/**
 * Request rate limiting validation
 */
const validateRateLimit = (windowMs = 900000, max = 100) => {
  return (req, res, next) => {
    // This would integrate with express-rate-limit
    // For now, just log the request
    logger.debug('Rate limit check', {
      ip: req.ip,
      method: req.method,
      path: req.path
    })
    next()
  }
}

module.exports = {
  validate,
  schemas,
  validators,
  sanitize,
  validateRateLimit
}