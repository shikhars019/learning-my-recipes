const { dbPool } = require('../config/database')
const logger = require('../config/logger')

/**
 * Recipe Model
 * Handles all database operations for recipes
 */
class Recipe {
  constructor(data = {}) {
    this.id = data.id
    this.title = data.title
    this.description = data.description
    this.instructions = data.instructions
    // Map database columns to consistent API format
    this.prep_time_minutes = data.prep_time
    this.cook_time_minutes = data.cook_time
    this.total_time_minutes = data.total_time
    this.servings = data.servings
    this.difficulty_level = data.difficulty
    this.category_id = data.category_id
    this.image_url = data.image_url
    this.source_url = data.source_url
    this.notes = data.notes
    this.tips = data.tips
    this.nutrition_info = data.nutrition_info
    this.is_ai_generated = data.is_ai_generated
    this.ai_prompt = data.ai_prompt
    this.is_public = data.is_public !== undefined ? data.is_public : true
    this.created_at = data.created_at
    this.updated_at = data.updated_at
    this.version = data.version || 1
  }

  /**
   * Create a new recipe
   * @param {Object} recipeData - Recipe data
   * @returns {Promise<Recipe>} - Created recipe
   */
  static async create(recipeData) {
    const client = await dbPool.connect()
    try {
      await client.query('BEGIN')

      const query = `
        INSERT INTO recipes (
          title, description, instructions, prep_time, cook_time,
          servings, difficulty_level, category_id, image_url, 
          is_public, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `

      // Calculate total_time from prep_time + cook_time
      const prepTime = recipeData.prep_time || 0;
      const cookTime = recipeData.cook_time || 0;
      const totalTime = prepTime + cookTime;

      const values = [
        recipeData.title,
        recipeData.description,
        JSON.stringify(recipeData.instructions), // Ensure instructions array is properly stringified for PostgreSQL JSONB
        prepTime,
        cookTime,
        recipeData.servings || 1,
        recipeData.difficulty_level || recipeData.difficulty || 'medium',
        recipeData.category_id || null,
        recipeData.image_url,
        recipeData.is_public !== undefined ? recipeData.is_public : true,
        recipeData.is_active !== undefined ? recipeData.is_active : true
      ]

      const result = await client.query(query, values)
      const recipe = new Recipe(result.rows[0])

      // If ingredients are provided, create recipe-ingredient relationships
      if (recipeData.ingredients && recipeData.ingredients.length > 0) {
        await recipe._createIngredientRelationships(client, recipe.id, recipeData.ingredients)
      }

      await client.query('COMMIT')
      logger.info(`Recipe created successfully: ${recipe.id}`)
      return recipe
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Error creating recipe:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Find recipe by ID with ingredients
   * @param {string} id - Recipe ID
   * @returns {Promise<Recipe|null>} - Recipe with ingredients
   */
  static async findById(id) {
    try {
      const query = `
        SELECT r.*, c.name as category_name
        FROM recipes r
        LEFT JOIN categories c ON r.category_id = c.id
        WHERE r.id = $1
      `
      
      const result = await dbPool.query(query, [id])
      
      if (result.rows.length === 0) {
        return null
      }

      const recipe = new Recipe(result.rows[0])
      recipe.category_name = result.rows[0].category_name
      
      // Fetch ingredients
      recipe.ingredients = await recipe._getIngredients(id)
      
      return recipe
    } catch (error) {
      logger.error(`Error finding recipe by ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Find all recipes with optional filtering
   * @param {Object} options - Search options
   * @returns {Promise<Array<Recipe>>} - Array of recipes
   */
  static async findAll(options = {}) {
    try {
      let query = `
        SELECT r.*, c.name as category_name
        FROM recipes r
        LEFT JOIN categories c ON r.category_id = c.id
        WHERE r.is_active = true
      `
      
      const values = []
      let paramCount = 0

      // Add filters
      if (options.category_id) {
        paramCount++
        query += ` AND r.category_id = $${paramCount}`
        values.push(options.category_id)
      }

      if (options.difficulty_level) {
        paramCount++
        query += ` AND r.difficulty_level = $${paramCount}`
        values.push(options.difficulty_level)
      }

      if (options.is_public !== undefined) {
        paramCount++
        query += ` AND r.is_public = $${paramCount}`
        values.push(options.is_public)
      }

      if (options.search) {
        paramCount++
        query += ` AND (r.title ILIKE $${paramCount} OR r.description ILIKE $${paramCount})`
        values.push(`%${options.search}%`)
      }

      // Add ordering
      query += ` ORDER BY r.created_at DESC`

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
      
      return result.rows.map(row => {
        const recipe = new Recipe(row)
        recipe.category_name = row.category_name
        recipe.username = row.username
        return recipe
      })
    } catch (error) {
      logger.error('Error finding recipes:', error)
      throw error
    }
  }

  /**
   * Update recipe
   * @param {string} id - Recipe ID
   * @param {Object} updates - Updated data
   * @returns {Promise<Recipe|null>} - Updated recipe
   */
  static async update(id, updates) {
    const client = await dbPool.connect()
    try {
      await client.query('BEGIN')

      // Get current recipe for versioning
      const currentRecipe = await Recipe.findById(id)
      if (!currentRecipe) {
        return null
      }

      // Create version history entry (disabled for simplified schema)
      // TODO: Re-enable when recipe_versions table is created
      // await Recipe._createVersionHistory(client, currentRecipe)

      // Prepare update query
      const updateFields = []
      const values = []
      let paramCount = 0

      const allowedFields = [
        'title', 'description', 'instructions', 'prep_time', 
        'cook_time', 'servings', 'difficulty_level', 'category_id',
        'image_url', 'tips', 'nutrition_info', 'is_ai_generated', 'ai_prompt'
      ]

      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          paramCount++
          updateFields.push(`${field} = $${paramCount}`)
          
          // Handle JSONB fields that need proper serialization
          if (field === 'instructions') {
            // Ensure instructions array is properly stringified for PostgreSQL JSONB
            values.push(JSON.stringify(updates[field]))
          } else {
            values.push(updates[field])
          }
        }
      })

      if (updateFields.length === 0) {
        await client.query('ROLLBACK')
        return currentRecipe
      }

      // Increment version (disabled for simplified schema)
      // TODO: Re-enable when version column is added to recipes table
      // paramCount++
      // updateFields.push(`version = $${paramCount}`)
      // values.push(currentRecipe.version + 1)

      paramCount++
      updateFields.push(`updated_at = $${paramCount}`)
      values.push(new Date())

      paramCount++
      const query = `
        UPDATE recipes 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `
      values.push(id)

      const result = await client.query(query, values)
      
      // Update ingredients if provided
      if (updates.ingredients) {
        await Recipe._updateIngredientRelationships(client, id, updates.ingredients)
      }

      await client.query('COMMIT')
      
      const updatedRecipe = new Recipe(result.rows[0])
      logger.info(`Recipe updated successfully: ${updatedRecipe.id}`)
      return updatedRecipe
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error(`Error updating recipe ${id}:`, error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Delete recipe
   * @param {string} id - Recipe ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(id) {
    const client = await dbPool.connect()
    try {
      await client.query('BEGIN')

      // Delete recipe ingredients first (foreign key constraint)
      await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [id])
      
      // Delete recipe versions
      await client.query('DELETE FROM recipe_versions WHERE recipe_id = $1', [id])
      
      // Delete recipe
      const result = await client.query('DELETE FROM recipes WHERE id = $1', [id])
      
      await client.query('COMMIT')
      
      const deleted = result.rowCount > 0
      logger.info(`Recipe ${deleted ? 'deleted' : 'not found'}: ${id}`)
      return deleted
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error(`Error deleting recipe ${id}:`, error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Search recipes by ingredients
   * @param {Array<string>} ingredientIds - Array of ingredient IDs
   * @param {Object} options - Search options
   * @returns {Promise<Array<Recipe>>} - Matching recipes
   */
  static async findByIngredients(ingredientIds, options = {}) {
    try {
      let query = `
        SELECT DISTINCT r.*, c.name as category_name,
               COUNT(ri.ingredient_id) as matching_ingredients
        FROM recipes r
        LEFT JOIN categories c ON r.category_id = c.id
        INNER JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        WHERE ri.ingredient_id = ANY($1) AND r.is_active = true
      `
      
      const values = [ingredientIds]
      let paramCount = 1

      // Note: is_public column doesn't exist in current schema, so we skip this filter
      // if (options.is_public !== undefined) {
      //   paramCount++
      //   query += ` AND r.is_public = $${paramCount}`
      //   values.push(options.is_public)
      // }

      query += `
        GROUP BY r.id, c.name
        ORDER BY matching_ingredients DESC, r.created_at DESC
      `

      if (options.limit) {
        paramCount++
        query += ` LIMIT $${paramCount}`
        values.push(options.limit)
      }

      const result = await dbPool.query(query, values)
      
      return result.rows.map(row => {
        const recipe = new Recipe(row)
        recipe.category_name = row.category_name
        recipe.matching_ingredients = parseInt(row.matching_ingredients)
        return recipe
      })
    } catch (error) {
      logger.error('Error finding recipes by ingredients:', error)
      throw error
    }
  }

  /**
   * Get recipe ingredients
   * @param {string} recipeId - Recipe ID
   * @returns {Promise<Array>} - Recipe ingredients
   */
  async _getIngredients(recipeId) {
    try {
      const query = `
        SELECT ri.*, i.name, i.category
        FROM recipe_ingredients ri
        LEFT JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = $1
      `
      
      const result = await dbPool.query(query, [recipeId])
      return result.rows
    } catch (error) {
      logger.error(`Error getting ingredients for recipe ${recipeId}:`, error)
      throw error
    }
  }

  /**
   * Create ingredient relationships for a recipe
   * @param {Object} client - Database client
   * @param {string} recipeId - Recipe ID
   * @param {Array} ingredients - Array of ingredient objects
   */
  async _createIngredientRelationships(client, recipeId, ingredients) {
    for (let i = 0; i < ingredients.length; i++) {
      const ingredient = ingredients[i]
      const query = `
        INSERT INTO recipe_ingredients (
          recipe_id, ingredient_id, quantity, unit, preparation_notes, is_optional
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `
      
      await client.query(query, [
        recipeId,
        ingredient.ingredient_id,
        ingredient.quantity,
        ingredient.unit,
        ingredient.preparation || null,
        ingredient.optional || false
      ])
    }
  }

  /**
   * Update ingredient relationships for a recipe
   * @param {Object} client - Database client
   * @param {string} recipeId - Recipe ID
   * @param {Array} ingredients - Array of ingredient objects
   */
  static async _updateIngredientRelationships(client, recipeId, ingredients) {
    // Delete existing relationships
    await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId])
    
    // Create new relationships
    for (let i = 0; i < ingredients.length; i++) {
      const ingredient = ingredients[i]
      const query = `
        INSERT INTO recipe_ingredients (
          recipe_id, ingredient_id, quantity, unit, preparation_notes, is_optional
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `
      
      await client.query(query, [
        recipeId,
        ingredient.ingredient_id,
        ingredient.quantity,
        ingredient.unit,
        ingredient.preparation || null,
        ingredient.optional || false
      ])
    }
  }

  /**
   * Create version history entry
   * @param {Object} client - Database client
   * @param {Recipe} recipe - Current recipe
   */
  static async _createVersionHistory(client, recipe) {
    const query = `
      INSERT INTO recipe_versions (
        recipe_id, title, description, instructions, prep_time_minutes,
        cook_time_minutes, servings, difficulty_level, category_id,
        image_url, source_url, notes, is_public, version, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `
    
    await client.query(query, [
      recipe.id,
      recipe.title,
      recipe.description,
      recipe.instructions,
      recipe.prep_time_minutes,
      recipe.cook_time_minutes,
      recipe.servings,
      recipe.difficulty_level,
      recipe.category_id,
      recipe.image_url,
      recipe.source_url,
      recipe.notes,
      recipe.is_public,
      recipe.version,
      recipe.updated_at || recipe.created_at
    ])
  }

  /**
   * Get recipe version history
   * @param {string} recipeId - Recipe ID
   * @returns {Promise<Array>} - Version history
   */
  static async getVersionHistory(recipeId) {
    try {
      const query = `
        SELECT * FROM recipe_versions 
        WHERE recipe_id = $1 
        ORDER BY version DESC
      `
      
      const result = await dbPool.query(query, [recipeId])
      return result.rows
    } catch (error) {
      logger.error(`Error getting version history for recipe ${recipeId}:`, error)
      throw error
    }
  }

  /**
   * Convert recipe to JSON
   * @returns {Object} - Recipe object
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      instructions: this.instructions,
      prep_time_minutes: this.prep_time_minutes,
      cook_time_minutes: this.cook_time_minutes,
      total_time_minutes: this.total_time_minutes,
      servings: this.servings,
      difficulty_level: this.difficulty_level,
      category_id: this.category_id,
      category_name: this.category_name,
      image_url: this.image_url,
      source_url: this.source_url,
      notes: this.notes,
      tips: this.tips,
      nutrition_info: this.nutrition_info,
      is_ai_generated: this.is_ai_generated,
      ai_prompt: this.ai_prompt,
      is_public: this.is_public,
      version: this.version,
      ingredients: this.ingredients,
      matching_ingredients: this.matching_ingredients,
      created_at: this.created_at,
      updated_at: this.updated_at
    }
  }
}

module.exports = Recipe