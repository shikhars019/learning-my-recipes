const express = require('express')
const router = express.Router()
const Ingredient = require('../models/Ingredient')
const {
  validateCreateIngredient,
  validateUpdateIngredient,
  validateBatchCreateIngredients,
  validateSearchIngredients,
  validateAutocompleteIngredients,
  validateUsageStats,
  validateUUID,
  formatValidationError
} = require('../validation/ingredientValidation')
const logger = require('../config/logger')

/**
 * @route   GET /api/ingredients
 * @desc    Search and list ingredients with advanced filtering
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { error, value: params } = validateSearchIngredients(req.query)
    
    if (error) {
      return res.status(400).json(formatValidationError(error))
    }

    const result = await Ingredient.search(params)
    
    res.json({
      success: true,
      data: {
        ingredients: result.ingredients,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: Math.ceil(result.total / result.limit),
          has_next: result.page < Math.ceil(result.total / result.limit),
          has_prev: result.page > 1
        },
        filters_applied: params
      }
    })
  } catch (error) {
    logger.error('Error searching ingredients:', error)
    
    // Handle database connection errors gracefully
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        error: 'Database temporarily unavailable',
        message: 'Unable to connect to the database. Please try again later.'
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while searching ingredients'
    })
  }
})

/**
 * @route   GET /api/ingredients/autocomplete
 * @desc    Autocomplete ingredient search with relevance scoring
 * @access  Public
 */
router.get('/autocomplete', async (req, res) => {
  try {
    const { error, value: params } = validateAutocompleteIngredients(req.query)
    
    if (error) {
      return res.status(400).json(formatValidationError(error))
    }

    const suggestions = await Ingredient.autocomplete(params.q, {
      limit: params.limit,
      category: params.category,
      include_categories: params.include_categories
    })
    
    res.json({
      success: true,
      data: {
        query: params.q,
        suggestions,
        count: suggestions.length
      }
    })
  } catch (error) {
    logger.error('Error in ingredient autocomplete:', error)
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        error: 'Database temporarily unavailable',
        message: 'Unable to connect to the database. Please try again later.'
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred during autocomplete search'
    })
  }
})

/**
 * @route   GET /api/ingredients/statistics
 * @desc    Get ingredient usage statistics
 * @access  Public
 */
router.get('/statistics', async (req, res) => {
  try {
    const { error, value: params } = validateUsageStats(req.query)
    
    if (error) {
      return res.status(400).json(formatValidationError(error))
    }

    let stats
    if (params.ingredient_ids && params.ingredient_ids.length > 0) {
      // Get stats for specific ingredients
      stats = await Ingredient.getUsageStats(params.ingredient_ids, params.days, params.group_by)
    } else {
      // Get general ingredient statistics
      stats = await Ingredient.getStatistics()
    }
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('Error getting ingredient statistics:', error)
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        error: 'Database temporarily unavailable',
        message: 'Unable to connect to the database. Please try again later.'
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while getting statistics'
    })
  }
})

/**
 * @route   GET /api/ingredients/:id
 * @desc    Get ingredient by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { error: idError } = validateUUID(req.params.id)
    
    if (idError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ingredient ID',
        message: 'Please provide a valid ingredient ID'
      })
    }

    const ingredient = await Ingredient.findById(req.params.id)
    
    if (!ingredient) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found',
        message: `No ingredient found with ID: ${req.params.id}`
      })
    }
    
    res.json({
      success: true,
      data: ingredient
    })
  } catch (error) {
    logger.error(`Error getting ingredient ${req.params.id}:`, error)
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        error: 'Database temporarily unavailable',
        message: 'Unable to connect to the database. Please try again later.'
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while retrieving the ingredient'
    })
  }
})

/**
 * @route   POST /api/ingredients
 * @desc    Create a new ingredient
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { error, value: ingredientData } = validateCreateIngredient(req.body)
    
    if (error) {
      return res.status(400).json(formatValidationError(error))
    }

    const ingredient = await Ingredient.create(ingredientData)
    
    res.status(201).json({
      success: true,
      message: 'Ingredient created successfully',
      data: ingredient
    })
  } catch (error) {
    logger.error('Error creating ingredient:', error)
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate ingredient',
        message: error.message
      })
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        error: 'Database temporarily unavailable',
        message: 'Unable to connect to the database. Please try again later.'
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while creating the ingredient'
    })
  }
})

/**
 * @route   POST /api/ingredients/batch
 * @desc    Create multiple ingredients in batch
 * @access  Public
 */
router.post('/batch', async (req, res) => {
  try {
    const { error, value: batchData } = validateBatchCreateIngredients(req.body)
    
    if (error) {
      return res.status(400).json(formatValidationError(error))
    }

    const result = await Ingredient.createBatch(
      batchData.ingredients,
      batchData.skip_duplicates,
      batchData.update_existing
    )
    
    res.status(201).json({
      success: true,
      message: `Batch operation completed: ${result.created.length} created, ${result.updated.length} updated, ${result.skipped.length} skipped`,
      data: result
    })
  } catch (error) {
    logger.error('Error in batch create ingredients:', error)
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        error: 'Database temporarily unavailable',
        message: 'Unable to connect to the database. Please try again later.'
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred during batch ingredient creation'
    })
  }
})

/**
 * @route   PUT /api/ingredients/:id
 * @desc    Update an existing ingredient
 * @access  Public
 */
router.put('/:id', async (req, res) => {
  try {
    const { error: idError } = validateUUID(req.params.id)
    
    if (idError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ingredient ID',
        message: 'Please provide a valid ingredient ID'
      })
    }

    const { error, value: updateData } = validateUpdateIngredient(req.body)
    
    if (error) {
      return res.status(400).json(formatValidationError(error))
    }

    const ingredient = await Ingredient.update(req.params.id, updateData)
    
    if (!ingredient) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found',
        message: `No ingredient found with ID: ${req.params.id}`
      })
    }
    
    res.json({
      success: true,
      message: 'Ingredient updated successfully',
      data: ingredient
    })
  } catch (error) {
    logger.error(`Error updating ingredient ${req.params.id}:`, error)
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate ingredient',
        message: error.message
      })
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        error: 'Database temporarily unavailable',
        message: 'Unable to connect to the database. Please try again later.'
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while updating the ingredient'
    })
  }
})

/**
 * @route   DELETE /api/ingredients/:id
 * @desc    Delete an ingredient (soft delete - mark as inactive)
 * @access  Public
 */
router.delete('/:id', async (req, res) => {
  try {
    const { error: idError } = validateUUID(req.params.id)
    
    if (idError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ingredient ID',
        message: 'Please provide a valid ingredient ID'
      })
    }

    const deleted = await Ingredient.delete(req.params.id)
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found',
        message: `No ingredient found with ID: ${req.params.id}`
      })
    }
    
    res.json({
      success: true,
      message: 'Ingredient deactivated successfully',
      data: { id: req.params.id, deleted: true }
    })
  } catch (error) {
    logger.error(`Error deleting ingredient ${req.params.id}:`, error)
    
    if (error.message.includes('is used by')) {
      return res.status(409).json({
        success: false,
        error: 'Ingredient in use',
        message: error.message
      })
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        error: 'Database temporarily unavailable',
        message: 'Unable to connect to the database. Please try again later.'
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while deleting the ingredient'
    })
  }
})

/**
 * @route   POST /api/ingredients/:id/track-usage
 * @desc    Track ingredient usage (for analytics)
 * @access  Public
 */
router.post('/:id/track-usage', async (req, res) => {
  try {
    const { error: idError } = validateUUID(req.params.id)
    
    if (idError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ingredient ID',
        message: 'Please provide a valid ingredient ID'
      })
    }

    await Ingredient.trackUsage(req.params.id)
    
    res.json({
      success: true,
      message: 'Ingredient usage tracked successfully',
      data: { id: req.params.id, tracked: true }
    })
  } catch (error) {
    logger.error(`Error tracking usage for ingredient ${req.params.id}:`, error)
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        error: 'Database temporarily unavailable',
        message: 'Unable to connect to the database. Please try again later.'
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while tracking ingredient usage'
    })
  }
})

/**
 * @route   GET /api/ingredients/categories/list
 * @desc    Get list of all ingredient categories with counts
 * @access  Public
 */
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Ingredient.getCategories()
    
    res.json({
      success: true,
      data: {
        categories,
        total_categories: categories.length
      }
    })
  } catch (error) {
    logger.error('Error getting ingredient categories:', error)
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        error: 'Database temporarily unavailable',
        message: 'Unable to connect to the database. Please try again later.'
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while getting ingredient categories'
    })
  }
})

/**
 * Error handler for unmatched routes in ingredients API
 */
router.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `The endpoint ${req.method} ${req.originalUrl} was not found`,
    available_endpoints: [
      'GET /api/ingredients - Search ingredients',
      'GET /api/ingredients/autocomplete - Autocomplete search',  
      'GET /api/ingredients/statistics - Usage statistics',
      'GET /api/ingredients/categories/list - Get categories',
      'GET /api/ingredients/:id - Get ingredient by ID',
      'POST /api/ingredients - Create ingredient',
      'POST /api/ingredients/batch - Batch create ingredients',
      'POST /api/ingredients/:id/track-usage - Track usage',
      'PUT /api/ingredients/:id - Update ingredient',
      'DELETE /api/ingredients/:id - Delete ingredient'
    ]
  })
})

module.exports = router