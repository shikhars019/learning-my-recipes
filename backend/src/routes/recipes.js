const express = require('express')
const router = express.Router()

const Recipe = require('../models/Recipe')
const { asyncHandler } = require('../middleware/errorHandler')
const {
  validateCreateRecipe,
  validateUpdateRecipe,
  validateSearchRecipe,
  validateUuidParam,
  validateRecipeAccess,
  validateRecipeOwnership,
  sanitizeRecipeForPublic
} = require('../validation/recipeValidation')
const logger = require('../config/logger')

// GET /api/recipes - Get all recipes with filtering and search
router.get('/', asyncHandler(async (req, res) => {
  // Validate query parameters
  const { error, value: validatedQuery } = validateSearchRecipe(req.query)
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      })),
      code: 'VALIDATION_ERROR'
    })
  }

  try {
    // Handle ingredient-based search
    if (validatedQuery.ingredients) {
      const ingredientIds = Array.isArray(validatedQuery.ingredients) 
        ? validatedQuery.ingredients 
        : [validatedQuery.ingredients]
      
      const recipes = await Recipe.findByIngredients(ingredientIds, {
        is_public: validatedQuery.is_public,
        limit: validatedQuery.limit
      })

      return res.json({
        recipes: recipes.map(recipe => sanitizeRecipeForPublic(recipe)),
        total: recipes.length,
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        search_type: 'ingredients'
      })
    }

    // Calculate offset for pagination
    const offset = (validatedQuery.page - 1) * validatedQuery.limit

    // Standard recipe search
    const recipes = await Recipe.findAll({
      ...validatedQuery,
      offset
    })

    // Get total count for pagination (simplified - in production you might want a separate count query)
    const totalRecipes = recipes.length < validatedQuery.limit ? recipes.length + offset : null

    res.json({
      recipes: recipes.map(recipe => sanitizeRecipeForPublic(recipe)),
      total: totalRecipes,
      page: validatedQuery.page,
      limit: validatedQuery.limit,
      has_more: recipes.length === validatedQuery.limit
    })

  } catch (error) {
    logger.error('Error fetching recipes:', error)
    
    // Handle database connection errors gracefully
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.message?.includes('connect')) {
      return res.status(503).json({
        error: 'Database service unavailable',
        message: 'Unable to connect to the database. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      })
    }
    
    throw error
  }
}))

// POST /api/recipes - Create new recipe
router.post('/', asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value: validatedData } = validateCreateRecipe(req.body)
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      })),
      code: 'VALIDATION_ERROR'
    })
  }

  try {
    const recipe = await Recipe.create(validatedData)
    
    logger.info(`Recipe created: ${recipe.id}`)
    
    res.status(201).json({
      message: 'Recipe created successfully',
      recipe: recipe.toJSON()
    })

  } catch (error) {
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({
        error: 'Invalid reference',
        message: 'Category ID, User ID, or Ingredient ID does not exist',
        code: 'FOREIGN_KEY_ERROR'
      })
    }
    
    logger.error('Error creating recipe:', error)
    throw error
  }
}))

// GET /api/recipes/:id - Get specific recipe
router.get('/:id', asyncHandler(async (req, res) => {
  // Validate UUID parameter
  const { error: paramError } = validateUuidParam(req.params)
  if (paramError) {
    return res.status(400).json({
      error: 'Invalid ID format',
      message: 'Recipe ID must be a valid UUID',
      code: 'INVALID_UUID'
    })
  }

  try {
    const recipe = await Recipe.findById(req.params.id)
    
    if (!recipe) {
      return res.status(404).json({
        error: 'Recipe not found',
        message: `Recipe with ID ${req.params.id} does not exist`,
        code: 'RECIPE_NOT_FOUND'
      })
    }

    // Check access permissions (for future auth implementation)
    const userId = req.user?.id // This will be set by auth middleware in the future
    if (!validateRecipeAccess(recipe, userId)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to view this recipe',
        code: 'ACCESS_DENIED'
      })
    }

    res.json({
      recipe: sanitizeRecipeForPublic(recipe)
    })

  } catch (error) {
    logger.error(`Error fetching recipe ${req.params.id}:`, error)
    throw error
  }
}))

// PUT /api/recipes/:id - Update recipe
router.put('/:id', asyncHandler(async (req, res) => {
  // Validate UUID parameter
  const { error: paramError } = validateUuidParam(req.params)
  if (paramError) {
    return res.status(400).json({
      error: 'Invalid ID format',
      message: 'Recipe ID must be a valid UUID',
      code: 'INVALID_UUID'
    })
  }

  // Validate request body
  const { error, value: validatedData } = validateUpdateRecipe(req.body)
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      })),
      code: 'VALIDATION_ERROR'
    })
  }

  try {
    // First check if recipe exists
    const existingRecipe = await Recipe.findById(req.params.id)
    if (!existingRecipe) {
      return res.status(404).json({
        error: 'Recipe not found',
        message: `Recipe with ID ${req.params.id} does not exist`,
        code: 'RECIPE_NOT_FOUND'
      })
    }

    // Check ownership permissions (for future auth implementation)
    const userId = req.user?.id // This will be set by auth middleware in the future
    
    // Temporarily disable ownership check since authentication is not implemented
    // TODO: Re-enable when authentication system is ready
    // if (!validateRecipeOwnership(existingRecipe, userId)) {
    //   return res.status(403).json({
    //     error: 'Access denied',
    //     message: 'You can only update your own recipes',
    //     code: 'OWNERSHIP_REQUIRED'
    //   })
    // }

    const updatedRecipe = await Recipe.update(req.params.id, validatedData)
    
    logger.info(`Recipe updated: ${updatedRecipe.id} by user ${userId}`)
    
    res.json({
      message: 'Recipe updated successfully',
      recipe: updatedRecipe.toJSON()
    })

  } catch (error) {
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({
        error: 'Invalid reference',
        message: 'Category ID or Ingredient ID does not exist',
        code: 'FOREIGN_KEY_ERROR'
      })
    }
    
    logger.error(`Error updating recipe ${req.params.id}:`, error)
    throw error
  }
}))

// DELETE /api/recipes/:id - Delete recipe
router.delete('/:id', asyncHandler(async (req, res) => {
  // Validate UUID parameter
  const { error: paramError } = validateUuidParam(req.params)
  if (paramError) {
    return res.status(400).json({
      error: 'Invalid ID format',
      message: 'Recipe ID must be a valid UUID',
      code: 'INVALID_UUID'
    })
  }

  try {
    // First check if recipe exists and get ownership info
    const existingRecipe = await Recipe.findById(req.params.id)
    if (!existingRecipe) {
      return res.status(404).json({
        error: 'Recipe not found',
        message: `Recipe with ID ${req.params.id} does not exist`,
        code: 'RECIPE_NOT_FOUND'
      })
    }

    // Check ownership permissions (for future auth implementation)
    const userId = req.user?.id // This will be set by auth middleware in the future
    
    // Temporarily disable ownership check since authentication is not implemented
    // TODO: Re-enable when authentication system is ready
    // if (!validateRecipeOwnership(existingRecipe, userId)) {
    //   return res.status(403).json({
    //     error: 'Access denied',
    //     message: 'You can only delete your own recipes',
    //     code: 'OWNERSHIP_REQUIRED'
    //   })
    // }

    const deleted = await Recipe.delete(req.params.id)
    
    if (deleted) {
      logger.info(`Recipe deleted: ${req.params.id} by user ${userId}`)
      res.json({
        message: 'Recipe deleted successfully',
        recipe_id: req.params.id
      })
    } else {
      // This shouldn't happen since we checked existence above
      res.status(404).json({
        error: 'Recipe not found',
        message: `Recipe with ID ${req.params.id} could not be deleted`,
        code: 'RECIPE_NOT_FOUND'
      })
    }

  } catch (error) {
    logger.error(`Error deleting recipe ${req.params.id}:`, error)
    throw error
  }
}))

// GET /api/recipes/:id/versions - Get recipe version history
router.get('/:id/versions', asyncHandler(async (req, res) => {
  // Validate UUID parameter
  const { error: paramError } = validateUuidParam(req.params)
  if (paramError) {
    return res.status(400).json({
      error: 'Invalid ID format',
      message: 'Recipe ID must be a valid UUID',
      code: 'INVALID_UUID'
    })
  }

  try {
    // First check if recipe exists
    const recipe = await Recipe.findById(req.params.id)
    if (!recipe) {
      return res.status(404).json({
        error: 'Recipe not found',
        message: `Recipe with ID ${req.params.id} does not exist`,
        code: 'RECIPE_NOT_FOUND'
      })
    }

    // Check access permissions
    const userId = req.user?.id
    if (!validateRecipeAccess(recipe, userId)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to view this recipe\'s history',
        code: 'ACCESS_DENIED'
      })
    }

    const versions = await Recipe.getVersionHistory(req.params.id)
    
    res.json({
      recipe_id: req.params.id,
      versions: versions,
      total_versions: versions.length
    })

  } catch (error) {
    logger.error(`Error fetching version history for recipe ${req.params.id}:`, error)
    throw error
  }
}))

// GET /api/recipes/search/ingredients - Advanced ingredient-based search
router.get('/search/ingredients', asyncHandler(async (req, res) => {
  const { ingredients } = req.query
  
  if (!ingredients) {
    return res.status(400).json({
      error: 'Missing parameter',
      message: 'Ingredients parameter is required',
      code: 'MISSING_INGREDIENTS'
    })
  }

  // Parse ingredients (can be comma-separated string or array)
  let ingredientIds
  try {
    if (typeof ingredients === 'string') {
      ingredientIds = ingredients.split(',').map(id => {
        const trimmed = id.trim();
        // Basic UUID format validation (8-4-4-4-12 characters)
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
          throw new Error('Invalid UUID format');
        }
        return trimmed;
      })
    } else if (Array.isArray(ingredients)) {
      ingredientIds = ingredients.map(id => {
        const uuid = typeof id === 'string' ? id.trim() : String(id);
        // Basic UUID format validation
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
          throw new Error('Invalid UUID format');
        }
        return uuid;
      })
    } else {
      throw new Error('Invalid format')
    }

  } catch (error) {
    return res.status(400).json({
      error: 'Invalid ingredients format',
      message: 'Ingredients must be a comma-separated string or array of valid UUID ingredient IDs',
      code: 'INVALID_FORMAT'
    })
  }

  try {
    const options = {
      is_public: req.query.is_public !== undefined ? req.query.is_public === 'true' : true,
      limit: req.query.limit ? parseInt(req.query.limit) : 50
    }

    const recipes = await Recipe.findByIngredients(ingredientIds, options)
    
    res.json({
      recipes: recipes.map(recipe => ({
        ...sanitizeRecipeForPublic(recipe),
        matching_ingredients: recipe.matching_ingredients
      })),
      search_ingredients: ingredientIds,
      total: recipes.length,
      limit: options.limit
    })

  } catch (error) {
    logger.error('Error in ingredient-based search:', error)
    throw error
  }
}))

module.exports = router