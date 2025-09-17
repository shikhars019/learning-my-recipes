const express = require('express')
const router = express.Router()
const logger = require('../config/logger')

/**
 * Category Routes
 * These will be fully implemented in Prompt 4
 */

/**
 * @route   GET /api/categories
 * @desc    Get all recipe categories
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Category listing endpoint - To be implemented in Prompt 4',
    endpoint: 'GET /api/categories',
    timestamp: new Date().toISOString()
  })
})

/**
 * @route   GET /api/categories/:id/recipes
 * @desc    Get all recipes in a specific category
 * @access  Public
 */
router.get('/:id/recipes', (req, res) => {
  res.status(200).json({
    message: 'Category recipes endpoint - To be implemented in Prompt 4',
    endpoint: 'GET /api/categories/:id/recipes',
    requestedId: req.params.id,
    timestamp: new Date().toISOString()
  })
})

module.exports = router