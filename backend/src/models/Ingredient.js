const { dbPool } = require('../config/database')
const logger = require('../config/logger')

/**
 * Ingredient Model
 * Handles all database operations for ingredients with normalization and duplicate prevention
 */
class Ingredient {
  constructor(data = {}) {
    this.id = data.id
    this.name = data.name
    this.normalized_name = data.normalized_name
    this.category = data.category
    this.unit = data.unit
    this.calories_per_100g = data.calories_per_100g
    this.protein_per_100g = data.protein_per_100g
    this.carbs_per_100g = data.carbs_per_100g
    this.fat_per_100g = data.fat_per_100g
    this.fiber_per_100g = data.fiber_per_100g
    this.sugar_per_100g = data.sugar_per_100g
    this.sodium_per_100g = data.sodium_per_100g
    this.description = data.description
    this.is_allergen = data.is_allergen
    this.allergen_info = data.allergen_info
    this.storage_tips = data.storage_tips
    this.seasonal_availability = data.seasonal_availability
    this.created_at = data.created_at
    this.updated_at = data.updated_at
    this.usage_count = data.usage_count || 0
  }

  /**
   * Normalize ingredient name for consistency and duplicate detection
   * @param {string} name - Raw ingredient name
   * @returns {string} - Normalized name
   */
  static normalizeName(name) {
    if (!name || typeof name !== 'string') {
      return ''
    }
    
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
  }

  /**
   * Create a new ingredient with normalization and duplicate checking
   * @param {Object} ingredientData - Ingredient data
   * @returns {Promise<Ingredient>} - Created ingredient
   */
  static async create(ingredientData) {
    const client = await dbPool.connect()
    try {
      await client.query('BEGIN')

      // Normalize the name
      const normalizedName = Ingredient.normalizeName(ingredientData.name)
      
      // Check for existing ingredient with same normalized name
      const existingQuery = `
        SELECT id, name FROM ingredients 
        WHERE normalized_name = $1
      `
      const existingResult = await client.query(existingQuery, [normalizedName])
      
      if (existingResult.rows.length > 0) {
        throw new Error(`Ingredient already exists: "${existingResult.rows[0].name}" (normalized as "${normalizedName}")`)
      }

      const query = `
        INSERT INTO ingredients (
          name, normalized_name, category, unit, calories_per_100g,
          protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g,
          sugar_per_100g, sodium_per_100g, description, is_allergen,
          allergen_info, storage_tips, seasonal_availability
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `

      const values = [
        ingredientData.name,
        normalizedName,
        ingredientData.category,
        ingredientData.unit,
        ingredientData.calories_per_100g,
        ingredientData.protein_per_100g,
        ingredientData.carbs_per_100g,
        ingredientData.fat_per_100g,
        ingredientData.fiber_per_100g,
        ingredientData.sugar_per_100g,
        ingredientData.sodium_per_100g,
        ingredientData.description,
        ingredientData.is_allergen || false,
        ingredientData.allergen_info,
        ingredientData.storage_tips,
        ingredientData.seasonal_availability
      ]

      const result = await client.query(query, values)
      await client.query('COMMIT')
      
      const ingredient = new Ingredient(result.rows[0])
      logger.info(`Ingredient created successfully: ${ingredient.id} - ${ingredient.name}`)
      return ingredient
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Error creating ingredient:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Create multiple ingredients in a batch operation
   * @param {Array<Object>} ingredientsData - Array of ingredient data
   * @returns {Promise<Array<Ingredient>>} - Created ingredients
   */
  static async createBatch(ingredientsData) {
    const client = await dbPool.connect()
    try {
      await client.query('BEGIN')
      
      const results = []
      const errors = []
      
      for (let i = 0; i < ingredientsData.length; i++) {
        try {
          const data = ingredientsData[i]
          const normalizedName = Ingredient.normalizeName(data.name)
          
          // Check for duplicates within the batch and existing data
          const duplicateInBatch = results.find(r => r.normalized_name === normalizedName)
          if (duplicateInBatch) {
            errors.push({
              index: i,
              name: data.name,
              error: `Duplicate in batch: matches "${duplicateInBatch.name}"`
            })
            continue
          }
          
          const existingQuery = `SELECT id, name FROM ingredients WHERE normalized_name = $1`
          const existingResult = await client.query(existingQuery, [normalizedName])
          
          if (existingResult.rows.length > 0) {
            errors.push({
              index: i,
              name: data.name,
              error: `Already exists: "${existingResult.rows[0].name}"`
            })
            continue
          }

          const query = `
            INSERT INTO ingredients (
              name, normalized_name, category, unit, calories_per_100g,
              protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g,
              sugar_per_100g, sodium_per_100g, description, is_allergen,
              allergen_info, storage_tips, seasonal_availability
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
          `

          const values = [
            data.name, normalizedName, data.category, data.unit,
            data.calories_per_100g, data.protein_per_100g, data.carbs_per_100g,
            data.fat_per_100g, data.fiber_per_100g, data.sugar_per_100g,
            data.sodium_per_100g, data.description, data.is_allergen || false,
            data.allergen_info, data.storage_tips, data.seasonal_availability
          ]

          const result = await client.query(query, values)
          results.push(new Ingredient(result.rows[0]))
          
        } catch (error) {
          errors.push({
            index: i,
            name: ingredientsData[i].name,
            error: error.message
          })
        }
      }
      
      await client.query('COMMIT')
      
      logger.info(`Batch ingredient creation: ${results.length} created, ${errors.length} errors`)
      
      return { 
        created: results, 
        errors: errors,
        summary: {
          total: ingredientsData.length,
          created: results.length,
          failed: errors.length
        }
      }
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Error in batch ingredient creation:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Find ingredient by ID
   * @param {string} id - Ingredient ID
   * @returns {Promise<Ingredient|null>} - Ingredient or null
   */
  static async findById(id) {
    try {
      const query = `
        SELECT i.*, 
               COALESCE(usage_stats.usage_count, 0) as usage_count
        FROM ingredients i
        LEFT JOIN (
          SELECT ingredient_id, COUNT(*) as usage_count
          FROM recipe_ingredients
          GROUP BY ingredient_id
        ) usage_stats ON i.id = usage_stats.ingredient_id
        WHERE i.id = $1
      `
      
      const result = await dbPool.query(query, [id])
      
      if (result.rows.length === 0) {
        return null
      }

      return new Ingredient(result.rows[0])
    } catch (error) {
      logger.error(`Error finding ingredient by ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Find ingredients with filtering and search
   * @param {Object} options - Search options
   * @returns {Promise<Array<Ingredient>>} - Array of ingredients
   */
  static async findAll(options = {}) {
    try {
      let query = `
        SELECT i.*, 
               COALESCE(usage_stats.usage_count, 0) as usage_count
        FROM ingredients i
        LEFT JOIN (
          SELECT ingredient_id, COUNT(*) as usage_count
          FROM recipe_ingredients
          GROUP BY ingredient_id
        ) usage_stats ON i.id = usage_stats.ingredient_id
        WHERE 1=1
      `
      
      const values = []
      let paramCount = 0

      // Add filters
      if (options.category) {
        paramCount++
        query += ` AND i.category = $${paramCount}`
        values.push(options.category)
      }

      if (options.is_allergen !== undefined) {
        paramCount++
        query += ` AND i.is_allergen = $${paramCount}`
        values.push(options.is_allergen)
      }

      if (options.search) {
        paramCount++
        query += ` AND (i.name ILIKE $${paramCount} OR i.description ILIKE $${paramCount})`
        values.push(`%${options.search}%`)
      }

      if (options.name_search) {
        paramCount++
        query += ` AND i.normalized_name ILIKE $${paramCount}`
        values.push(`%${Ingredient.normalizeName(options.name_search)}%`)
      }

      // Add ordering
      const sortBy = options.sort_by || 'name'
      const sortOrder = options.sort_order || 'ASC'
      
      if (sortBy === 'usage_count') {
        query += ` ORDER BY usage_count ${sortOrder}, i.name ASC`
      } else {
        query += ` ORDER BY i.${sortBy} ${sortOrder}`
      }

      // Add pagination
      if (options.limit) {
        paramCount++
        query += ` LIMIT $${paramCount}`
        values.push(options.limit)
      }

      if (options.offset) {
        paramCount++
        query += ` OFFSET $${paramCount}`
        values.push(options.offset)
      }

      const result = await dbPool.query(query, values)
      
      return result.rows.map(row => new Ingredient(row))
    } catch (error) {
      logger.error('Error finding ingredients:', error)
      throw error
    }
  }

  /**
   * Search ingredients for autocomplete with partial matching
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Array<Ingredient>>} - Matching ingredients
   */
  static async autocomplete(searchTerm, options = {}) {
    try {
      if (!searchTerm || searchTerm.length < 1) {
        return []
      }

      const normalizedSearch = Ingredient.normalizeName(searchTerm)
      const limit = options.limit || 10

      const query = `
        SELECT i.*, 
               COALESCE(usage_stats.usage_count, 0) as usage_count,
               CASE 
                 WHEN i.normalized_name = $1 THEN 1
                 WHEN i.normalized_name LIKE $2 THEN 2
                 WHEN i.normalized_name LIKE $3 THEN 3
                 ELSE 4
               END as relevance_score
        FROM ingredients i
        LEFT JOIN (
          SELECT ingredient_id, COUNT(*) as usage_count
          FROM recipe_ingredients
          GROUP BY ingredient_id
        ) usage_stats ON i.id = usage_stats.ingredient_id
        WHERE i.normalized_name ILIKE $3
        ORDER BY relevance_score ASC, usage_count DESC, i.name ASC
        LIMIT $4
      `
      
      const values = [
        normalizedSearch,           // Exact match
        `${normalizedSearch}%`,     // Starts with
        `%${normalizedSearch}%`,    // Contains
        limit
      ]

      const result = await dbPool.query(query, values)
      
      return result.rows.map(row => new Ingredient(row))
    } catch (error) {
      logger.error('Error in ingredient autocomplete:', error)
      throw error
    }
  }

  /**
   * Update ingredient
   * @param {string} id - Ingredient ID
   * @param {Object} updates - Updated data
   * @returns {Promise<Ingredient|null>} - Updated ingredient
   */
  static async update(id, updates) {
    const client = await dbPool.connect()
    try {
      await client.query('BEGIN')

      // Check if ingredient exists
      const existingResult = await client.query('SELECT * FROM ingredients WHERE id = $1', [id])
      if (existingResult.rows.length === 0) {
        return null
      }

      // If name is being updated, check for duplicates with new normalized name
      if (updates.name) {
        const newNormalizedName = Ingredient.normalizeName(updates.name)
        const duplicateQuery = `
          SELECT id, name FROM ingredients 
          WHERE normalized_name = $1 AND id != $2
        `
        const duplicateResult = await client.query(duplicateQuery, [newNormalizedName, id])
        
        if (duplicateResult.rows.length > 0) {
          throw new Error(`Ingredient name conflict: "${duplicateResult.rows[0].name}" already uses normalized name "${newNormalizedName}"`)
        }

        updates.normalized_name = newNormalizedName
      }

      // Prepare update query
      const updateFields = []
      const values = []
      let paramCount = 0

      const allowedFields = [
        'name', 'normalized_name', 'category', 'unit', 'calories_per_100g',
        'protein_per_100g', 'carbs_per_100g', 'fat_per_100g', 'fiber_per_100g',
        'sugar_per_100g', 'sodium_per_100g', 'description', 'is_allergen',
        'allergen_info', 'storage_tips', 'seasonal_availability'
      ]

      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          paramCount++
          updateFields.push(`${field} = $${paramCount}`)
          values.push(updates[field])
        }
      })

      if (updateFields.length === 0) {
        await client.query('ROLLBACK')
        return new Ingredient(existingResult.rows[0])
      }

      paramCount++
      updateFields.push(`updated_at = $${paramCount}`)
      values.push(new Date())

      paramCount++
      const query = `
        UPDATE ingredients 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `
      values.push(id)

      const result = await client.query(query, values)
      await client.query('COMMIT')
      
      const ingredient = new Ingredient(result.rows[0])
      logger.info(`Ingredient updated successfully: ${ingredient.id} - ${ingredient.name}`)
      return ingredient
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error(`Error updating ingredient ${id}:`, error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Delete ingredient
   * @param {string} id - Ingredient ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(id) {
    const client = await dbPool.connect()
    try {
      await client.query('BEGIN')

      // Check if ingredient is used in any recipes
      const usageResult = await client.query(
        'SELECT COUNT(*) as count FROM recipe_ingredients WHERE ingredient_id = $1',
        [id]
      )
      
      const usageCount = parseInt(usageResult.rows[0].count)
      if (usageCount > 0) {
        throw new Error(`Cannot delete ingredient: it is used in ${usageCount} recipe(s). Remove from recipes first.`)
      }

      // Delete ingredient
      const result = await client.query('DELETE FROM ingredients WHERE id = $1', [id])
      
      await client.query('COMMIT')
      
      const deleted = result.rowCount > 0
      logger.info(`Ingredient ${deleted ? 'deleted' : 'not found'}: ${id}`)
      return deleted
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error(`Error deleting ingredient ${id}:`, error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get ingredient statistics
   * @returns {Promise<Object>} - Usage statistics
   */
  static async getStatistics() {
    try {
      const queries = {
        total: 'SELECT COUNT(*) as count FROM ingredients',
        by_category: `
          SELECT category, COUNT(*) as count 
          FROM ingredients 
          WHERE category IS NOT NULL
          GROUP BY category 
          ORDER BY count DESC
        `,
        most_used: `
          SELECT i.id, i.name, i.category, COUNT(ri.recipe_id) as usage_count
          FROM ingredients i
          LEFT JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
          GROUP BY i.id, i.name, i.category
          ORDER BY usage_count DESC
          LIMIT 10
        `,
        allergens: 'SELECT COUNT(*) as count FROM ingredients WHERE is_allergen = true',
        with_nutrition: `
          SELECT COUNT(*) as count FROM ingredients 
          WHERE calories_per_100g IS NOT NULL OR protein_per_100g IS NOT NULL
        `
      }

      const results = {}
      
      for (const [key, query] of Object.entries(queries)) {
        const result = await dbPool.query(query)
        results[key] = key === 'total' || key === 'allergens' || key === 'with_nutrition' 
          ? parseInt(result.rows[0].count)
          : result.rows
      }

      return results
    } catch (error) {
      logger.error('Error getting ingredient statistics:', error)
      throw error
    }
  }

  /**
   * Get ingredients by category
   * @param {string} category - Category name
   * @returns {Promise<Array<Ingredient>>} - Ingredients in category
   */
  static async findByCategory(category) {
    try {
      const query = `
        SELECT i.*, 
               COALESCE(usage_stats.usage_count, 0) as usage_count
        FROM ingredients i
        LEFT JOIN (
          SELECT ingredient_id, COUNT(*) as usage_count
          FROM recipe_ingredients
          GROUP BY ingredient_id
        ) usage_stats ON i.id = usage_stats.ingredient_id
        WHERE i.category = $1
        ORDER BY usage_count DESC, i.name ASC
      `
      
      const result = await dbPool.query(query, [category])
      return result.rows.map(row => new Ingredient(row))
    } catch (error) {
      logger.error(`Error finding ingredients by category ${category}:`, error)
      throw error
    }
  }

  /**
   * Get all available categories
   * @returns {Promise<Array<string>>} - Available categories
   */
  static async getCategories() {
    try {
      const query = `
        SELECT DISTINCT category, COUNT(*) as ingredient_count
        FROM ingredients 
        WHERE category IS NOT NULL
        GROUP BY category
        ORDER BY ingredient_count DESC, category ASC
      `
      
      const result = await dbPool.query(query)
      return result.rows
    } catch (error) {
      logger.error('Error getting ingredient categories:', error)
      throw error
    }
  }

  /**
   * Convert ingredient to JSON
   * @returns {Object} - Ingredient object
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      normalized_name: this.normalized_name,
      category: this.category,
      unit: this.unit,
      nutrition: {
        calories_per_100g: this.calories_per_100g,
        protein_per_100g: this.protein_per_100g,
        carbs_per_100g: this.carbs_per_100g,
        fat_per_100g: this.fat_per_100g,
        fiber_per_100g: this.fiber_per_100g,
        sugar_per_100g: this.sugar_per_100g,
        sodium_per_100g: this.sodium_per_100g
      },
      description: this.description,
      is_allergen: this.is_allergen,
      allergen_info: this.allergen_info,
      storage_tips: this.storage_tips,
      seasonal_availability: this.seasonal_availability,
      usage_count: this.usage_count,
      created_at: this.created_at,
      updated_at: this.updated_at
    }
  }
}

module.exports = Ingredient