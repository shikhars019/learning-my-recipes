const express = require('express')
const router = express.Router()
const Category = require('../models/Category')
const {
  validateCreateCategory,
  validateUpdateCategory,
  validateSearchCategories,
  validateUUID,
  validateSlug,
  formatValidationError
} = require('../validation/ingredientValidation')
const logger = require('../config/logger')

/**
 * @route   GET /api/categories
 * @desc    Search and list categories with hierarchical filtering
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { error, value: params } = validateSearchCategories(req.query)
    
    if (error) {
      return res.status(400).json(formatValidationError(error))
    }

    // Calculate offset for pagination
    const offset = (params.page - 1) * params.limit
    const searchParams = { ...params, offset }

    const categories = await Category.findAll(searchParams)
    
    // Get total count for pagination (if not using root_only filter)
    let total = categories.length
    if (!params.root_only && !params.parent_id) {
      const countResult = await Category.findAll({ ...searchParams, limit: null, offset: null })
      total = countResult.length
    }
    
    res.json({
      success: true,
      data: {
        categories,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          pages: Math.ceil(total / params.limit),
          has_next: params.page < Math.ceil(total / params.limit),
          has_prev: params.page > 1
        },
        filters_applied: params
      }
    })
  } catch (error) {
    logger.error('Error searching categories:', error)
    
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
      message: 'An error occurred while searching categories'
    })
  }
})

/**
 * @route   GET /api/categories/tree
 * @desc    Get hierarchical category tree structure
 * @access  Public
 */
router.get('/tree', async (req, res) => {
  try {
    const rootId = req.query.root_id || null
    
    if (rootId) {
      const { error: idError } = validateUUID(rootId)
      if (idError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid root category ID',
          message: 'Please provide a valid category ID for root filter'
        })
      }
    }

    const tree = await Category.getTree(rootId)
    
    res.json({
      success: true,
      data: {
        tree,
        root_id: rootId,
        total_categories: tree.length
      }
    })
  } catch (error) {
    logger.error('Error getting category tree:', error)
    
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
      message: 'An error occurred while building category tree'
    })
  }
})

/**
 * @route   GET /api/categories/statistics
 * @desc    Get category statistics and usage information
 * @access  Public
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await Category.getStatistics()
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('Error getting category statistics:', error)
    
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
      message: 'An error occurred while getting category statistics'
    })
  }
})

/**
 * @route   GET /api/categories/slug/:slug
 * @desc    Get category by slug
 * @access  Public
 */
router.get('/slug/:slug', async (req, res) => {
  try {
    const { error: slugError } = validateSlug(req.params.slug)
    
    if (slugError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category slug',
        message: 'Please provide a valid category slug'
      })
    }

    const category = await Category.findBySlug(req.params.slug)
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
        message: `No category found with slug: ${req.params.slug}`
      })
    }
    
    res.json({
      success: true,
      data: category
    })
  } catch (error) {
    logger.error(`Error getting category by slug ${req.params.slug}:`, error)
    
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
      message: 'An error occurred while retrieving the category'
    })
  }
})

/**
 * @route   GET /api/categories/:id
 * @desc    Get category by ID with hierarchical information
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { error: idError } = validateUUID(req.params.id)
    
    if (idError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID',
        message: 'Please provide a valid category ID'
      })
    }

    const category = await Category.findById(req.params.id)
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
        message: `No category found with ID: ${req.params.id}`
      })
    }
    
    res.json({
      success: true,
      data: category
    })
  } catch (error) {
    logger.error(`Error getting category ${req.params.id}:`, error)
    
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
      message: 'An error occurred while retrieving the category'
    })
  }
})

/**
 * @route   POST /api/categories
 * @desc    Create a new category
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { error, value: categoryData } = validateCreateCategory(req.body)
    
    if (error) {
      return res.status(400).json(formatValidationError(error))
    }

    const category = await Category.create(categoryData)
    
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    })
  } catch (error) {
    logger.error('Error creating category:', error)
    
    if (error.message.includes('already exists') || error.message.includes('conflict')) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate category',
        message: error.message
      })
    }
    
    if (error.message.includes('Parent category not found') || 
        error.message.includes('Maximum category nesting')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parent category',
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
      message: 'An error occurred while creating the category'
    })
  }
})

/**
 * @route   PUT /api/categories/:id
 * @desc    Update an existing category
 * @access  Public
 */
router.put('/:id', async (req, res) => {
  try {
    const { error: idError } = validateUUID(req.params.id)
    
    if (idError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID',
        message: 'Please provide a valid category ID'
      })
    }

    const { error, value: updateData } = validateUpdateCategory(req.body)
    
    if (error) {
      return res.status(400).json(formatValidationError(error))
    }

    const category = await Category.update(req.params.id, updateData)
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
        message: `No category found with ID: ${req.params.id}`
      })
    }
    
    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    })
  } catch (error) {
    logger.error(`Error updating category ${req.params.id}:`, error)
    
    if (error.message.includes('already exists') || error.message.includes('conflict')) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate category',
        message: error.message
      })
    }
    
    if (error.message.includes('Parent category not found') || 
        error.message.includes('Maximum category nesting') ||
        error.message.includes('circular reference') ||
        error.message.includes('cannot be its own parent')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category hierarchy',
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
      message: 'An error occurred while updating the category'
    })
  }
})

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete a category (soft delete - mark as inactive)
 * @access  Public
 */
router.delete('/:id', async (req, res) => {
  try {
    const { error: idError } = validateUUID(req.params.id)
    
    if (idError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category ID',
        message: 'Please provide a valid category ID'
      })
    }

    const deleted = await Category.delete(req.params.id)
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
        message: `No category found with ID: ${req.params.id}`
      })
    }
    
    res.json({
      success: true,
      message: 'Category deactivated successfully',
      data: { id: req.params.id, deleted: true }
    })
  } catch (error) {
    logger.error(`Error deleting category ${req.params.id}:`, error)
    
    if (error.message.includes('has') && error.message.includes('child categories')) {
      return res.status(409).json({
        success: false,
        error: 'Category has children',
        message: error.message
      })
    }
    
    if (error.message.includes('is used by')) {
      return res.status(409).json({
        success: false,
        error: 'Category in use',
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
      message: 'An error occurred while deleting the category'
    })
  }
})

/**
 * Error handler for unmatched routes in categories API
 */
router.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `The endpoint ${req.method} ${req.originalUrl} was not found`,
    available_endpoints: [
      'GET /api/categories - Search categories',
      'GET /api/categories/tree - Get category tree',
      'GET /api/categories/statistics - Get statistics',
      'GET /api/categories/slug/:slug - Get category by slug',
      'GET /api/categories/:id - Get category by ID',
      'POST /api/categories - Create category',
      'PUT /api/categories/:id - Update category',
      'DELETE /api/categories/:id - Delete category'
    ]
  })
})

module.exports = router