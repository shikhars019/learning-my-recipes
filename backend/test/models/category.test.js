const { expect } = require('chai')
const Category = require('../../src/models/Category')
const { dbPool } = require('../../src/config/database')

describe('Category Model', () => {
  let testCategoryIds = []
  
  before(async () => {
    // Clean up any existing test data
    try {
      await dbPool.query(`
        DELETE FROM categories 
        WHERE name LIKE '%TEST_%' OR name LIKE '%test_%'
      `)
    } catch (error) {
      // Database might not be available in test environment
      console.log('Database cleanup skipped - database not available')
    }
  })

  afterEach(async () => {
    // Clean up test categories (in reverse order due to foreign key constraints)
    if (testCategoryIds.length > 0) {
      try {
        // Delete children first, then parents
        const sortedIds = [...testCategoryIds].reverse()
        for (const id of sortedIds) {
          await dbPool.query('DELETE FROM categories WHERE id = $1', [id])
        }
      } catch (error) {
        // Ignore cleanup errors
      }
      testCategoryIds = []
    }
  })

  describe('Slug Generation', () => {
    it('should create URL-friendly slugs from names', () => {
      const tests = [
        { input: 'Main Dishes', expected: 'main-dishes' },
        { input: 'Soups & Stews', expected: 'soups-stews' },
        { input: 'Chef\'s Special!', expected: 'chefs-special' },
        { input: '  Breakfast   Items  ', expected: 'breakfast-items' },
        { input: 'Desserts---Sweet', expected: 'desserts-sweet' }
      ]

      tests.forEach(test => {
        expect(Category.createSlug(test.input)).to.equal(test.expected)
      })
    })

    it('should handle edge cases in slug creation', () => {
      expect(Category.createSlug('')).to.equal('')
      expect(Category.createSlug(null)).to.equal('')
      expect(Category.createSlug('   ')).to.equal('')
      expect(Category.createSlug('A')).to.equal('a')
      expect(Category.createSlug('123')).to.equal('123')
    })
  })

  describe('CRUD Operations', () => {
    it('should create a root category with valid data', async () => {
      try {
        const categoryData = {
          name: 'TEST_Root_Category',
          description: 'A test root category',
          color: '#FF0000',
          icon: 'restaurant',
          sort_order: 1
        }

        const category = await Category.create(categoryData)
        testCategoryIds.push(category.id)

        expect(category.id).to.be.a('string')
        expect(category.name).to.equal(categoryData.name)
        expect(category.slug).to.equal('test-root-category')
        expect(category.description).to.equal(categoryData.description)
        expect(category.level).to.equal(0) // Root level
        expect(category.parent_id).to.be.null
        expect(category.color).to.equal(categoryData.color)
        expect(category.icon).to.equal(categoryData.icon)
        expect(category.sort_order).to.equal(categoryData.sort_order)
        expect(category.is_active).to.be.true
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          console.log('Skipping database test - database not available')
          this.skip()
        } else {
          throw error
        }
      }
    })

    it('should create a child category with valid parent', async () => {
      try {
        // First create parent
        const parentData = {
          name: 'TEST_Parent_Category',
          description: 'Test parent category'
        }
        const parent = await Category.create(parentData)
        testCategoryIds.push(parent.id)

        // Then create child
        const childData = {
          name: 'TEST_Child_Category',
          description: 'Test child category',
          parent_id: parent.id
        }
        const child = await Category.create(childData)
        testCategoryIds.push(child.id)

        expect(child.parent_id).to.equal(parent.id)
        expect(child.level).to.equal(1) // One level below parent
        expect(child.slug).to.equal('test-child-category')
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })

    it('should prevent creating categories with duplicate names', async () => {
      try {
        const categoryData = {
          name: 'TEST_Duplicate_Check',
          description: 'First category'
        }

        const first = await Category.create(categoryData)
        testCategoryIds.push(first.id)

        // Try to create duplicate
        try {
          await Category.create({
            name: 'TEST_Duplicate_Check', // Same name
            description: 'Second category'
          })
          expect.fail('Should have thrown duplicate error')
        } catch (error) {
          expect(error.message).to.include('already exists')
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else if (!error.message.includes('already exists')) {
          throw error
        }
      }
    })

    it('should find category by ID with hierarchical information', async () => {
      try {
        const categoryData = {
          name: 'TEST_FindById_Category',
          description: 'Test category for findById'
        }

        const created = await Category.create(categoryData)
        testCategoryIds.push(created.id)

        const found = await Category.findById(created.id)
        expect(found).to.not.be.null
        expect(found.id).to.equal(created.id)
        expect(found.name).to.equal(categoryData.name)
        expect(found.children).to.be.an('array')
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })

    it('should find category by slug', async () => {
      try {
        const categoryData = {
          name: 'TEST_FindBySlug_Category',
          description: 'Test category for findBySlug'
        }

        const created = await Category.create(categoryData)
        testCategoryIds.push(created.id)

        const found = await Category.findBySlug('test-findbyslug-category')
        expect(found).to.not.be.null
        expect(found.id).to.equal(created.id)
        expect(found.slug).to.equal('test-findbyslug-category')
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })

    it('should update an existing category', async () => {
      try {
        const categoryData = {
          name: 'TEST_Update_Category',
          description: 'Original description'
        }

        const created = await Category.create(categoryData)
        testCategoryIds.push(created.id)

        const updateData = {
          description: 'Updated description',
          color: '#00FF00',
          sort_order: 5
        }

        const updated = await Category.update(created.id, updateData)
        expect(updated).to.not.be.null
        expect(updated.description).to.equal('Updated description')
        expect(updated.color).to.equal('#00FF00')
        expect(updated.sort_order).to.equal(5)
        expect(updated.name).to.equal(categoryData.name) // Should remain unchanged
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })

    it('should soft delete a category', async () => {
      try {
        const categoryData = {
          name: 'TEST_Delete_Category',
          description: 'Test category for deletion'
        }

        const created = await Category.create(categoryData)
        testCategoryIds.push(created.id)

        const deleted = await Category.delete(created.id)
        expect(deleted).to.be.true

        // Verify it's soft deleted (marked as inactive)
        const found = await Category.findById(created.id)
        expect(found).to.be.null // findById should only return active categories
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })
  })

  describe('Hierarchical Operations', () => {
    it('should enforce maximum nesting level', async () => {
      try {
        // Create level 0 (root)
        const level0 = await Category.create({
          name: 'TEST_Level_0',
          description: 'Root category'
        })
        testCategoryIds.push(level0.id)

        // Create level 1
        const level1 = await Category.create({
          name: 'TEST_Level_1',
          description: 'Level 1 category',
          parent_id: level0.id
        })
        testCategoryIds.push(level1.id)

        // Create level 2
        const level2 = await Category.create({
          name: 'TEST_Level_2',
          description: 'Level 2 category',
          parent_id: level1.id
        })
        testCategoryIds.push(level2.id)

        // Try to create level 3 (should fail)
        try {
          await Category.create({
            name: 'TEST_Level_3',
            description: 'Level 3 category (should fail)',
            parent_id: level2.id
          })
          expect.fail('Should have thrown nesting level error')
        } catch (error) {
          expect(error.message).to.include('Maximum category nesting level')
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else if (!error.message.includes('Maximum category nesting level')) {
          throw error
        }
      }
    })

    it('should prevent circular references', async () => {
      try {
        // Create parent and child
        const parent = await Category.create({
          name: 'TEST_Circular_Parent',
          description: 'Parent category'
        })
        testCategoryIds.push(parent.id)

        const child = await Category.create({
          name: 'TEST_Circular_Child',
          description: 'Child category',
          parent_id: parent.id
        })
        testCategoryIds.push(child.id)

        // Try to make parent a child of child (circular reference)
        try {
          await Category.update(parent.id, { parent_id: child.id })
          expect.fail('Should have thrown circular reference error')
        } catch (error) {
          expect(error.message).to.include('circular reference')
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else if (!error.message.includes('circular reference')) {
          throw error
        }
      }
    })

    it('should build category tree correctly', async () => {
      try {
        // Create hierarchical structure
        const root = await Category.create({
          name: 'TEST_Tree_Root',
          description: 'Root for tree test'
        })
        testCategoryIds.push(root.id)

        const child1 = await Category.create({
          name: 'TEST_Tree_Child1',
          description: 'First child',
          parent_id: root.id
        })
        testCategoryIds.push(child1.id)

        const child2 = await Category.create({
          name: 'TEST_Tree_Child2',
          description: 'Second child',
          parent_id: root.id
        })
        testCategoryIds.push(child2.id)

        const grandchild = await Category.create({
          name: 'TEST_Tree_Grandchild',
          description: 'Grandchild',
          parent_id: child1.id
        })
        testCategoryIds.push(grandchild.id)

        const tree = await Category.getTree(root.id)
        
        expect(tree).to.be.an('array')
        expect(tree.length).to.equal(1) // Should return root with children
        
        const rootNode = tree[0]
        expect(rootNode.name).to.equal('TEST_Tree_Root')
        expect(rootNode.children).to.have.lengthOf(2)
        
        // Find child1 and verify it has grandchild
        const child1Node = rootNode.children.find(c => c.name === 'TEST_Tree_Child1')
        expect(child1Node).to.not.be.undefined
        expect(child1Node.children).to.have.lengthOf(1)
        expect(child1Node.children[0].name).to.equal('TEST_Tree_Grandchild')
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })
  })

  describe('Search and Filtering', () => {
    beforeEach(async () => {
      try {
        // Create test categories for search
        const testCategories = [
          { name: 'TEST_Search_Appetizers', description: 'Small plates and starters' },
          { name: 'TEST_Search_Main_Dishes', description: 'Primary course meals' },
          { name: 'TEST_Search_Desserts', description: 'Sweet treats and pastries' }
        ]

        for (const data of testCategories) {
          const category = await Category.create(data)
          testCategoryIds.push(category.id)
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })

    it('should find all categories with default parameters', async () => {
      try {
        const categories = await Category.findAll()
        
        expect(categories).to.be.an('array')
        expect(categories.length).to.be.at.least(3) // Our test categories plus any defaults
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })

    it('should filter categories by search term', async () => {
      try {
        const categories = await Category.findAll({ search: 'TEST_Search_Main' })
        
        expect(categories).to.be.an('array')
        const foundMain = categories.find(cat => cat.name === 'TEST_Search_Main_Dishes')
        expect(foundMain).to.not.be.undefined
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })

    it('should filter root categories only', async () => {
      try {
        const categories = await Category.findAll({ root_only: true })
        
        expect(categories).to.be.an('array')
        categories.forEach(cat => {
          expect(cat.parent_id).to.be.null
          expect(cat.level).to.equal(0)
        })
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })

    it('should handle pagination correctly', async () => {
      try {
        const categories = await Category.findAll({ 
          limit: 1, 
          offset: 0 
        })
        
        expect(categories).to.have.lengthOf(1)
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })
  })

  describe('Statistics', () => {
    it('should return category statistics', async () => {
      try {
        const stats = await Category.getStatistics()
        
        expect(stats).to.be.an('object')
        expect(stats).to.have.property('total_active')
        expect(stats).to.have.property('total_inactive')
        expect(stats).to.have.property('by_level')
        expect(stats).to.have.property('most_used')
        expect(stats).to.have.property('root_categories')
        
        expect(stats.total_active).to.be.a('number')
        expect(stats.total_inactive).to.be.a('number')
        expect(stats.root_categories).to.be.a('number')
        expect(stats.by_level).to.be.an('array')
        expect(stats.most_used).to.be.an('array')
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })
  })

  describe('Validation and Error Handling', () => {
    it('should reject invalid color codes', async () => {
      try {
        await Category.create({
          name: 'TEST_Invalid_Color',
          color: 'invalid-color' // Invalid hex color
        })
        expect.fail('Should have thrown validation error')
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          expect(error.message).to.include('color')
        }
      }
    })

    it('should reject categories with invalid parent IDs', async () => {
      try {
        await Category.create({
          name: 'TEST_Invalid_Parent',
          parent_id: '123e4567-e89b-12d3-a456-426614174000' // Non-existent UUID
        })
        expect.fail('Should have thrown parent validation error')
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          expect(error.message).to.include('Parent category not found')
        }
      }
    })

    it('should handle missing required fields', async () => {
      try {
        await Category.create({
          description: 'Missing name field'
          // Missing required 'name' field
        })
        expect.fail('Should have thrown validation error')
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          expect(error.message).to.include('name')
        }
      }
    })
  })

  describe('JSON Serialization', () => {
    it('should serialize category to JSON correctly', async () => {
      try {
        const categoryData = {
          name: 'TEST_JSON_Category',
          description: 'Test category for JSON',
          color: '#FF0000',
          icon: 'restaurant'
        }

        const category = await Category.create(categoryData)
        testCategoryIds.push(category.id)

        const json = category.toJSON()
        
        expect(json).to.be.an('object')
        expect(json).to.have.property('id')
        expect(json).to.have.property('name')
        expect(json).to.have.property('slug')
        expect(json).to.have.property('description')
        expect(json).to.have.property('level')
        expect(json).to.have.property('is_active')
        expect(json).to.have.property('children')
        expect(json).to.have.property('recipe_count')
        expect(json).to.have.property('ingredient_count')
        expect(json).to.have.property('created_at')
        expect(json).to.have.property('updated_at')
        
        expect(json.children).to.be.an('array')
        expect(json.name).to.equal(categoryData.name)
        expect(json.color).to.equal(categoryData.color)
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.skip()
        } else {
          throw error
        }
      }
    })
  })
})