const { dbPool } = require('../config/database')
const logger = require('../config/logger')

/**
 * Category Model
 * Handles hierarchical category management for recipes and ingredients
 */
class Category {
  constructor(data = {}) {
    this.id = data.id
    this.name = data.name
    this.slug = data.slug
    this.description = data.description
    this.parent_id = data.parent_id
    this.level = data.level || 0
    this.sort_order = data.sort_order || 0
    this.is_active = data.is_active !== undefined ? data.is_active : true
    this.color = data.color
    this.icon = data.icon
    this.created_at = data.created_at
    this.updated_at = data.updated_at
    
    // Hierarchical properties (populated by specific queries)
    this.parent = data.parent
    this.children = data.children || []
    this.recipe_count = data.recipe_count || 0
    this.ingredient_count = data.ingredient_count || 0
  }

  /**
   * Create URL-friendly slug from name
   * @param {string} name - Category name
   * @returns {string} - URL slug
   */
  static createSlug(name) {
    if (!name || typeof name !== 'string') {
      return ''
    }
    
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')           // Replace spaces with hyphens
      .replace(/[^\w\-]/g, '')        // Remove non-word characters except hyphens
      .replace(/-+/g, '-')            // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, '')        // Remove leading/trailing hyphens
  }

  /**
   * Create a new category
   * @param {Object} categoryData - Category data
   * @returns {Promise<Category>} - Created category
   */
  static async create(categoryData) {
    const client = await dbPool.connect()
    try {
      await client.query('BEGIN')

      const slug = Category.createSlug(categoryData.name)
      
      // Check for existing category with same name or slug
      const existingQuery = `
        SELECT id, name, slug FROM categories 
        WHERE name = $1 OR slug = $2
      `
      const existingResult = await client.query(existingQuery, [categoryData.name, slug])
      
      if (existingResult.rows.length > 0) {
        const existing = existingResult.rows[0]
        throw new Error(`Category already exists: "${existing.name}" (slug: "${existing.slug}")`)
      }

      // Validate parent category if provided
      let level = 0
      if (categoryData.parent_id) {
        const parentQuery = `SELECT level FROM categories WHERE id = $1 AND is_active = true`
        const parentResult = await client.query(parentQuery, [categoryData.parent_id])
        
        if (parentResult.rows.length === 0) {
          throw new Error(`Parent category not found or inactive: ${categoryData.parent_id}`)
        }
        
        level = parentResult.rows[0].level + 1
        
        // Prevent deep nesting (max 3 levels: 0, 1, 2)
        if (level > 2) {
          throw new Error('Maximum category nesting level (3) exceeded')
        }
      }

      const query = `
        INSERT INTO categories (
          name, slug, description, parent_id, level, sort_order, 
          is_active, color, icon
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `

      const values = [
        categoryData.name,
        slug,
        categoryData.description,
        categoryData.parent_id,
        level,
        categoryData.sort_order || 0,
        categoryData.is_active !== undefined ? categoryData.is_active : true,
        categoryData.color,
        categoryData.icon
      ]

      const result = await client.query(query, values)
      await client.query('COMMIT')
      
      const category = new Category(result.rows[0])
      logger.info(`Category created successfully: ${category.id} - ${category.name}`)
      return category
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Error creating category:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Find category by ID with hierarchical information
   * @param {string} id - Category ID
   * @returns {Promise<Category|null>} - Category with parent/children info
   */
  static async findById(id) {
    try {
      const query = `
        WITH RECURSIVE category_hierarchy AS (
          -- Base case: selected category
          SELECT c.*, 
                 p.name as parent_name,
                 0 as depth
          FROM categories c
          LEFT JOIN categories p ON c.parent_id = p.id
          WHERE c.id = $1
          
          UNION ALL
          
          -- Recursive case: children
          SELECT c.*,
                 p.name as parent_name,
                 ch.depth + 1
          FROM categories c
          JOIN category_hierarchy ch ON c.parent_id = ch.id
          LEFT JOIN categories p ON c.parent_id = p.id
          WHERE ch.depth < 10 -- Prevent infinite recursion
        ),
        category_stats AS (
          SELECT 
            c.id,
            COUNT(DISTINCT r.id) as recipe_count,
            COUNT(DISTINCT i.id) as ingredient_count
          FROM categories c
          LEFT JOIN recipes r ON c.id = r.category_id
          LEFT JOIN ingredients i ON c.name = i.category
          GROUP BY c.id
        )
        SELECT ch.*, cs.recipe_count, cs.ingredient_count
        FROM category_hierarchy ch
        LEFT JOIN category_stats cs ON ch.id = cs.id
        ORDER BY ch.depth, ch.sort_order, ch.name
      `
      
      const result = await dbPool.query(query, [id])
      
      if (result.rows.length === 0) {
        return null
      }

      // The first row is our main category
      const mainCategory = new Category({
        ...result.rows[0],
        parent: result.rows[0].parent_name ? {
          name: result.rows[0].parent_name
        } : null
      })

      // Add children (rows with depth > 0)
      mainCategory.children = result.rows
        .filter(row => row.depth > 0)
        .map(row => new Category(row))

      return mainCategory
    } catch (error) {
      logger.error(`Error finding category by ID ${id}:`, error)
      throw error
    }
  }

  /**
   * Find category by slug
   * @param {string} slug - Category slug
   * @returns {Promise<Category|null>} - Category
   */
  static async findBySlug(slug) {
    try {
      const query = `
        SELECT c.*, 
               p.name as parent_name,
               COUNT(DISTINCT r.id) as recipe_count,
               COUNT(DISTINCT i.id) as ingredient_count
        FROM categories c
        LEFT JOIN categories p ON c.parent_id = p.id
        LEFT JOIN recipes r ON c.id = r.category_id
        LEFT JOIN ingredients i ON c.name = i.category
        WHERE c.slug = $1
        GROUP BY c.id, p.name
      `
      
      const result = await dbPool.query(query, [slug])
      
      if (result.rows.length === 0) {
        return null
      }

      const categoryData = result.rows[0]
      return new Category({
        ...categoryData,
        parent: categoryData.parent_name ? {
          name: categoryData.parent_name
        } : null
      })
    } catch (error) {
      logger.error(`Error finding category by slug ${slug}:`, error)
      throw error
    }
  }

  /**
   * Find all categories with hierarchical structure
   * @param {Object} options - Search options
   * @returns {Promise<Array<Category>>} - Array of categories
   */
  static async findAll(options = {}) {
    try {
      let query = `
        SELECT c.*, 
               p.name as parent_name,
               COUNT(DISTINCT r.id) as recipe_count,
               COUNT(DISTINCT i.id) as ingredient_count
        FROM categories c
        LEFT JOIN categories p ON c.parent_id = p.id
        LEFT JOIN recipes r ON c.id = r.category_id
        LEFT JOIN ingredients i ON c.name = i.category
        WHERE 1=1
      `
      
      const values = []
      let paramCount = 0

      // Add filters
      if (options.parent_id) {
        paramCount++
        query += ` AND c.parent_id = $${paramCount}`
        values.push(options.parent_id)
      } else if (options.root_only) {
        query += ` AND c.parent_id IS NULL`
      }

      if (options.is_active !== undefined) {
        paramCount++
        query += ` AND c.is_active = $${paramCount}`
        values.push(options.is_active)
      }

      if (options.level !== undefined) {
        paramCount++
        query += ` AND c.level = $${paramCount}`
        values.push(options.level)
      }

      if (options.search) {
        paramCount++
        query += ` AND (c.name ILIKE $${paramCount} OR c.description ILIKE $${paramCount})`
        values.push(`%${options.search}%`)
      }

      query += `
        GROUP BY c.id, p.name
        ORDER BY c.level, c.sort_order, c.name
      `

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
      
      return result.rows.map(row => new Category({
        ...row,
        parent: row.parent_name ? { name: row.parent_name } : null
      }))
    } catch (error) {
      logger.error('Error finding categories:', error)
      throw error
    }
  }

  /**
   * Get hierarchical category tree
   * @param {string} rootId - Root category ID (optional)
   * @returns {Promise<Array<Category>>} - Tree structure
   */
  static async getTree(rootId = null) {
    try {
      const query = `
        WITH RECURSIVE category_tree AS (
          -- Base case: root categories or specific root
          SELECT c.*, 
                 COUNT(DISTINCT r.id) as recipe_count,
                 COUNT(DISTINCT i.id) as ingredient_count,
                 0 as depth,
                 ARRAY[c.id] as path
          FROM categories c
          LEFT JOIN recipes r ON c.id = r.category_id
          LEFT JOIN ingredients i ON c.name = i.category
          WHERE c.is_active = true 
            AND (${rootId ? 'c.id = $1' : 'c.parent_id IS NULL'})
          GROUP BY c.id
          
          UNION ALL
          
          -- Recursive case: children
          SELECT c.*,
                 COUNT(DISTINCT r.id) as recipe_count,
                 COUNT(DISTINCT i.id) as ingredient_count,
                 ct.depth + 1,
                 ct.path || c.id
          FROM categories c
          JOIN category_tree ct ON c.parent_id = ct.id
          LEFT JOIN recipes r ON c.id = r.category_id
          LEFT JOIN ingredients i ON c.name = i.category
          WHERE c.is_active = true 
            AND ct.depth < 10 -- Prevent infinite recursion
            AND NOT c.id = ANY(ct.path) -- Prevent cycles
          GROUP BY c.id, ct.depth, ct.path
        )
        SELECT * FROM category_tree
        ORDER BY depth, sort_order, name
      `
      
      const values = rootId ? [rootId] : []
      const result = await dbPool.query(query, values)
      
      // Build tree structure
      const categoryMap = new Map()
      const rootCategories = []

      // Create all category objects
      result.rows.forEach(row => {
        const category = new Category(row)
        category.children = []
        categoryMap.set(row.id, category)
      })

      // Build parent-child relationships
      result.rows.forEach(row => {
        const category = categoryMap.get(row.id)
        
        if (row.parent_id && categoryMap.has(row.parent_id)) {
          const parent = categoryMap.get(row.parent_id)
          parent.children.push(category)
        } else {
          rootCategories.push(category)
        }
      })

      return rootCategories
    } catch (error) {
      logger.error('Error building category tree:', error)
      throw error
    }
  }

  /**
   * Update category
   * @param {string} id - Category ID
   * @param {Object} updates - Updated data
   * @returns {Promise<Category|null>} - Updated category
   */
  static async update(id, updates) {
    const client = await dbPool.connect()
    try {
      await client.query('BEGIN')

      // Check if category exists
      const existingResult = await client.query('SELECT * FROM categories WHERE id = $1', [id])
      if (existingResult.rows.length === 0) {
        return null
      }

      // If name is being updated, create new slug and check for duplicates
      if (updates.name) {
        const slug = Category.createSlug(updates.name)
        const duplicateQuery = `
          SELECT id, name, slug FROM categories 
          WHERE (name = $1 OR slug = $2) AND id != $3
        `
        const duplicateResult = await client.query(duplicateQuery, [updates.name, slug, id])
        
        if (duplicateResult.rows.length > 0) {
          const existing = duplicateResult.rows[0]
          throw new Error(`Category conflict: "${existing.name}" already uses name or slug "${slug}"`)
        }

        updates.slug = slug
      }

      // If parent is being changed, validate and update level
      if (updates.parent_id !== undefined) {
        if (updates.parent_id === id) {
          throw new Error('Category cannot be its own parent')
        }

        if (updates.parent_id) {
          // Check if parent exists and get level
          const parentQuery = `SELECT level FROM categories WHERE id = $1 AND is_active = true`
          const parentResult = await client.query(parentQuery, [updates.parent_id])
          
          if (parentResult.rows.length === 0) {
            throw new Error(`Parent category not found or inactive: ${updates.parent_id}`)
          }
          
          const newLevel = parentResult.rows[0].level + 1
          if (newLevel > 2) {
            throw new Error('Maximum category nesting level (3) exceeded')
          }

          // Check for circular reference
          const circularQuery = `
            WITH RECURSIVE check_cycle AS (
              SELECT id, parent_id, 0 as depth
              FROM categories WHERE id = $1
              
              UNION ALL
              
              SELECT c.id, c.parent_id, cc.depth + 1
              FROM categories c
              JOIN check_cycle cc ON c.id = cc.parent_id
              WHERE cc.depth < 10
            )
            SELECT COUNT(*) as cycle_count
            FROM check_cycle
            WHERE parent_id = $2
          `
          const circularResult = await client.query(circularQuery, [updates.parent_id, id])
          
          if (parseInt(circularResult.rows[0].cycle_count) > 0) {
            throw new Error('Cannot create circular reference in category hierarchy')
          }

          updates.level = newLevel
        } else {
          updates.level = 0
        }

        // Update levels of all descendants if level changed
        if (updates.level !== existingResult.rows[0].level) {
          await Category._updateDescendantLevels(client, id, updates.level)
        }
      }

      // Prepare update query
      const updateFields = []
      const values = []
      let paramCount = 0

      const allowedFields = [
        'name', 'slug', 'description', 'parent_id', 'level', 
        'sort_order', 'is_active', 'color', 'icon'
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
        return new Category(existingResult.rows[0])
      }

      paramCount++
      updateFields.push(`updated_at = $${paramCount}`)
      values.push(new Date())

      paramCount++
      const query = `
        UPDATE categories 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `
      values.push(id)

      const result = await client.query(query, values)
      await client.query('COMMIT')
      
      const category = new Category(result.rows[0])
      logger.info(`Category updated successfully: ${category.id} - ${category.name}`)
      return category
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error(`Error updating category ${id}:`, error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Update descendant levels when parent level changes
   * @param {Object} client - Database client
   * @param {string} parentId - Parent category ID
   * @param {number} parentLevel - New parent level
   */
  static async _updateDescendantLevels(client, parentId, parentLevel) {
    const query = `
      WITH RECURSIVE descendants AS (
        SELECT id, parent_id, level, $2 + 1 as new_level
        FROM categories
        WHERE parent_id = $1
        
        UNION ALL
        
        SELECT c.id, c.parent_id, c.level, d.new_level + 1
        FROM categories c
        JOIN descendants d ON c.parent_id = d.id
        WHERE d.new_level < 10
      )
      UPDATE categories
      SET level = descendants.new_level
      FROM descendants
      WHERE categories.id = descendants.id
    `
    
    await client.query(query, [parentId, parentLevel])
  }

  /**
   * Delete category (soft delete - mark as inactive)
   * @param {string} id - Category ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(id) {
    const client = await dbPool.connect()
    try {
      await client.query('BEGIN')

      // Check if category has children
      const childrenResult = await client.query(
        'SELECT COUNT(*) as count FROM categories WHERE parent_id = $1 AND is_active = true',
        [id]
      )
      
      const childrenCount = parseInt(childrenResult.rows[0].count)
      if (childrenCount > 0) {
        throw new Error(`Cannot delete category: it has ${childrenCount} active child categories. Remove or reassign children first.`)
      }

      // Check usage in recipes and ingredients
      const usageResult = await client.query(`
        SELECT 
          COUNT(DISTINCT r.id) as recipe_count,
          COUNT(DISTINCT i.id) as ingredient_count
        FROM categories c
        LEFT JOIN recipes r ON c.id = r.category_id
        LEFT JOIN ingredients i ON c.name = i.category
        WHERE c.id = $1
      `, [id])
      
      const usage = usageResult.rows[0]
      if (parseInt(usage.recipe_count) > 0 || parseInt(usage.ingredient_count) > 0) {
        throw new Error(
          `Cannot delete category: it is used by ${usage.recipe_count} recipes and ${usage.ingredient_count} ingredients. ` +
          `Reassign or remove associations first.`
        )
      }

      // Soft delete - mark as inactive
      const result = await client.query(
        'UPDATE categories SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id',
        [id]
      )
      
      await client.query('COMMIT')
      
      const deleted = result.rowCount > 0
      logger.info(`Category ${deleted ? 'deactivated' : 'not found'}: ${id}`)
      return deleted
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error(`Error deleting category ${id}:`, error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get category statistics
   * @returns {Promise<Object>} - Category statistics
   */
  static async getStatistics() {
    try {
      const queries = {
        total_active: 'SELECT COUNT(*) as count FROM categories WHERE is_active = true',
        total_inactive: 'SELECT COUNT(*) as count FROM categories WHERE is_active = false',
        by_level: `
          SELECT level, COUNT(*) as count 
          FROM categories 
          WHERE is_active = true
          GROUP BY level 
          ORDER BY level
        `,
        most_used: `
          SELECT c.id, c.name, c.slug,
                 COUNT(DISTINCT r.id) as recipe_count,
                 COUNT(DISTINCT i.id) as ingredient_count,
                 (COUNT(DISTINCT r.id) + COUNT(DISTINCT i.id)) as total_usage
          FROM categories c
          LEFT JOIN recipes r ON c.id = r.category_id
          LEFT JOIN ingredients i ON c.name = i.category
          WHERE c.is_active = true
          GROUP BY c.id, c.name, c.slug
          ORDER BY total_usage DESC
          LIMIT 10
        `,
        root_categories: 'SELECT COUNT(*) as count FROM categories WHERE parent_id IS NULL AND is_active = true'
      }

      const results = {}
      
      for (const [key, query] of Object.entries(queries)) {
        const result = await dbPool.query(query)
        results[key] = ['total_active', 'total_inactive', 'root_categories'].includes(key)
          ? parseInt(result.rows[0].count)
          : result.rows
      }

      return results
    } catch (error) {
      logger.error('Error getting category statistics:', error)
      throw error
    }
  }

  /**
   * Convert category to JSON
   * @returns {Object} - Category object
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      description: this.description,
      parent_id: this.parent_id,
      parent: this.parent,
      level: this.level,
      sort_order: this.sort_order,
      is_active: this.is_active,
      color: this.color,
      icon: this.icon,
      children: this.children.map(child => child.toJSON ? child.toJSON() : child),
      recipe_count: this.recipe_count,
      ingredient_count: this.ingredient_count,
      created_at: this.created_at,
      updated_at: this.updated_at
    }
  }
}

module.exports = Category