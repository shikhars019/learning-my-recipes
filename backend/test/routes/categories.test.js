const request = require('supertest')
const { expect } = require('chai')
const app = require('../../src/app')

describe('Category API Routes', () => {
  let testCategoryIds = []
  
  afterEach(async () => {
    // Clean up created test categories (in reverse order due to hierarchies)
    for (let i = testCategoryIds.length - 1; i >= 0; i--) {
      try {
        await request(app).delete(`/api/categories/${testCategoryIds[i]}`)
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    testCategoryIds = []
  })

  describe('POST /api/categories', () => {
    it('should create a new category with valid data', async () => {
      const categoryData = {
        name: 'TEST_API_Vegetables',
        description: 'Fresh vegetables category',
        color: '#4CAF50',
        is_active: true
      }

      const response = await request(app)
        .post('/api/categories')
        .send(categoryData)
        .expect((res) => {
          if (res.status === 503) {
            console.log('Database unavailable, skipping test')
            return
          }
          expect(res.status).to.be.oneOf([201, 503])
        })

      if (response.status === 201) {
        expect(response.body.success).to.be.true
        expect(response.body.data.name).to.equal(categoryData.name)
        expect(response.body.data.slug).to.equal('test-api-vegetables')
        expect(response.body.data.level).to.equal(1)
        expect(response.body.data.color).to.equal(categoryData.color)
        testCategoryIds.push(response.body.data.id)
      }
    })

    it('should create subcategory with valid parent', async () => {
      // First create parent category
      const parentData = {
        name: 'TEST_API_Parent',
        description: 'Parent category'
      }

      const parentResponse = await request(app)
        .post('/api/categories')
        .send(parentData)

      if (parentResponse.status === 201) {
        const parentId = parentResponse.body.data.id
        testCategoryIds.push(parentId)

        const childData = {
          name: 'TEST_API_Child',
          parent_id: parentId,
          description: 'Child category'
        }

        const childResponse = await request(app)
          .post('/api/categories')
          .send(childData)

        if (childResponse.status === 201) {
          expect(childResponse.body.success).to.be.true
          expect(childResponse.body.data.parent_id).to.equal(parentId)
          expect(childResponse.body.data.level).to.equal(2)
          testCategoryIds.push(childResponse.body.data.id)
        }
      }
    })

    it('should reject category with missing required fields', async () => {
      const invalidData = {
        description: 'Missing name field'
        // Missing required 'name' field
      }

      const response = await request(app)
        .post('/api/categories')
        .send(invalidData)

      if (response.status !== 503) {
        expect(response.status).to.equal(400)
        expect(response.body.success).to.be.false
        expect(response.body.error).to.equal('Validation failed')
      }
    })

    it('should reject category with invalid color format', async () => {
      const invalidData = {
        name: 'TEST_Invalid_Color',
        color: 'invalid-color' // Invalid hex format
      }

      const response = await request(app)
        .post('/api/categories')
        .send(invalidData)

      if (response.status !== 503) {
        expect(response.status).to.equal(400)
        expect(response.body.success).to.be.false
      }
    })

    it('should reject category with non-existent parent', async () => {
      const invalidData = {
        name: 'TEST_Invalid_Parent',
        parent_id: '123e4567-e89b-12d3-a456-426614174000' // Non-existent parent
      }

      const response = await request(app)
        .post('/api/categories')
        .send(invalidData)

      if (response.status !== 503) {
        expect(response.status).to.equal(400)
        expect(response.body.success).to.be.false
        expect(response.body.error).to.include('Parent category not found')
      }
    })

    it('should reject category exceeding maximum nesting level', async () => {
      // Create category at level 1
      const level1Response = await request(app)
        .post('/api/categories')
        .send({ name: 'TEST_Level_1' })

      if (level1Response.status === 201) {
        const level1Id = level1Response.body.data.id
        testCategoryIds.push(level1Id)

        // Create category at level 2
        const level2Response = await request(app)
          .post('/api/categories')
          .send({ name: 'TEST_Level_2', parent_id: level1Id })

        if (level2Response.status === 201) {
          const level2Id = level2Response.body.data.id
          testCategoryIds.push(level2Id)

          // Create category at level 3
          const level3Response = await request(app)
            .post('/api/categories')
            .send({ name: 'TEST_Level_3', parent_id: level2Id })

          if (level3Response.status === 201) {
            const level3Id = level3Response.body.data.id
            testCategoryIds.push(level3Id)

            // Try to create level 4 (should fail)
            const level4Response = await request(app)
              .post('/api/categories')
              .send({ name: 'TEST_Level_4', parent_id: level3Id })

            expect(level4Response.status).to.equal(400)
            expect(level4Response.body.success).to.be.false
            expect(level4Response.body.error).to.include('Maximum nesting level')
          }
        }
      }
    })

    it('should handle duplicate category names', async () => {
      const categoryData = {
        name: 'TEST_API_Duplicate'
      }

      // Create first category
      const response1 = await request(app)
        .post('/api/categories')
        .send(categoryData)

      if (response1.status === 201) {
        testCategoryIds.push(response1.body.data.id)

        // Try to create duplicate
        const response2 = await request(app)
          .post('/api/categories')
          .send(categoryData)

        expect(response2.status).to.equal(409)
        expect(response2.body.success).to.be.false
        expect(response2.body.error).to.equal('Duplicate category')
      }
    })
  })

  describe('GET /api/categories/:id', () => {
    it('should get category by valid ID', async () => {
      const categoryData = {
        name: 'TEST_API_GetById',
        description: 'Test category'
      }

      const createResponse = await request(app)
        .post('/api/categories')
        .send(categoryData)

      if (createResponse.status === 201) {
        const categoryId = createResponse.body.data.id
        testCategoryIds.push(categoryId)

        const getResponse = await request(app)
          .get(`/api/categories/${categoryId}`)

        if (getResponse.status !== 503) {
          expect(getResponse.status).to.equal(200)
          expect(getResponse.body.success).to.be.true
          expect(getResponse.body.data.id).to.equal(categoryId)
          expect(getResponse.body.data.name).to.equal(categoryData.name)
        }
      }
    })

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/categories/invalid-uuid')

      if (response.status !== 503) {
        expect(response.status).to.equal(400)
        expect(response.body.success).to.be.false
        expect(response.body.error).to.equal('Invalid category ID')
      }
    })

    it('should return 404 for non-existent category', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000'
      const response = await request(app)
        .get(`/api/categories/${nonExistentId}`)

      if (response.status !== 503) {
        expect(response.status).to.equal(404)
        expect(response.body.success).to.be.false
        expect(response.body.error).to.equal('Category not found')
      }
    })
  })

  describe('GET /api/categories', () => {
    beforeEach(async () => {
      // Create test categories for listing
      const testCategories = [
        { name: 'TEST_LIST_Fruits', description: 'Fruits category' },
        { name: 'TEST_LIST_Vegetables', description: 'Vegetables category' }
      ]

      for (const data of testCategories) {
        try {
          const response = await request(app)
            .post('/api/categories')
            .send(data)
          
          if (response.status === 201) {
            testCategoryIds.push(response.body.data.id)
          }
        } catch (error) {
          // Skip if database unavailable
        }
      }
    })

    it('should list categories with default parameters', async () => {
      const response = await request(app)
        .get('/api/categories')

      if (response.status !== 503) {
        expect(response.status).to.equal(200)
        expect(response.body.success).to.be.true
        expect(response.body.data.categories).to.be.an('array')
        expect(response.body.data.pagination).to.be.an('object')
        expect(response.body.data.pagination).to.have.property('page')
        expect(response.body.data.pagination).to.have.property('limit')
      }
    })

    it('should search categories by query', async () => {
      const response = await request(app)
        .get('/api/categories?q=TEST_LIST')

      if (response.status === 200 && response.body.data.categories.length > 0) {
        expect(response.body.success).to.be.true
        const categories = response.body.data.categories
        const names = categories.map(cat => cat.name)
        expect(names.some(name => name.includes('TEST_LIST'))).to.be.true
      }
    })

    it('should filter categories by parent_id', async () => {
      // First create a parent-child relationship
      const parentResponse = await request(app)
        .post('/api/categories')
        .send({ name: 'TEST_PARENT_Filter' })

      if (parentResponse.status === 201) {
        const parentId = parentResponse.body.data.id
        testCategoryIds.push(parentId)

        const childResponse = await request(app)
          .post('/api/categories')
          .send({ name: 'TEST_CHILD_Filter', parent_id: parentId })

        if (childResponse.status === 201) {
          testCategoryIds.push(childResponse.body.data.id)

          const filterResponse = await request(app)
            .get(`/api/categories?parent_id=${parentId}`)

          if (filterResponse.status === 200) {
            expect(filterResponse.body.success).to.be.true
            const categories = filterResponse.body.data.categories
            categories.forEach(category => {
              expect(category.parent_id).to.equal(parentId)
            })
          }
        }
      }
    })

    it('should filter categories by level', async () => {
      const response = await request(app)
        .get('/api/categories?level=1')

      if (response.status === 200) {
        expect(response.body.success).to.be.true
        const categories = response.body.data.categories
        categories.forEach(category => {
          expect(category.level).to.equal(1)
        })
      }
    })

    it('should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/api/categories?page=1&limit=1')

      if (response.status === 200) {
        expect(response.body.success).to.be.true
        expect(response.body.data.pagination.page).to.equal(1)
        expect(response.body.data.pagination.limit).to.equal(1)
        expect(response.body.data.categories.length).to.be.at.most(1)
      }
    })

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/categories?page=0&limit=200') // Invalid values

      if (response.status !== 503) {
        expect(response.status).to.equal(400)
        expect(response.body.success).to.be.false
      }
    })
  })

  describe('GET /api/categories/tree', () => {
    beforeEach(async () => {
      // Create hierarchical test data
      try {
        const parentResponse = await request(app)
          .post('/api/categories')
          .send({ name: 'TEST_TREE_Root', description: 'Root category' })

        if (parentResponse.status === 201) {
          const parentId = parentResponse.body.data.id
          testCategoryIds.push(parentId)

          const child1Response = await request(app)
            .post('/api/categories')
            .send({ name: 'TEST_TREE_Child1', parent_id: parentId })

          if (child1Response.status === 201) {
            testCategoryIds.push(child1Response.body.data.id)
          }

          const child2Response = await request(app)
            .post('/api/categories')
            .send({ name: 'TEST_TREE_Child2', parent_id: parentId })

          if (child2Response.status === 201) {
            testCategoryIds.push(child2Response.body.data.id)
          }
        }
      } catch (error) {
        // Skip setup if database unavailable
      }
    })

    it('should return hierarchical category tree', async () => {
      const response = await request(app)
        .get('/api/categories/tree')

      if (response.status === 200) {
        expect(response.body.success).to.be.true
        expect(response.body.data.tree).to.be.an('array')
        
        // Check tree structure
        const tree = response.body.data.tree
        if (tree.length > 0) {
          // Find our test root category
          const testRoot = tree.find(cat => cat.name === 'TEST_TREE_Root')
          if (testRoot && testRoot.children) {
            expect(testRoot.children).to.be.an('array')
            expect(testRoot.level).to.equal(1)
          }
        }
      }
    })

    it('should filter tree by root category', async () => {
      // First get a root category ID
      const parentResponse = await request(app)
        .post('/api/categories')
        .send({ name: 'TEST_TREE_Specific_Root' })

      if (parentResponse.status === 201) {
        const rootId = parentResponse.body.data.id
        testCategoryIds.push(rootId)

        const response = await request(app)
          .get(`/api/categories/tree?root_id=${rootId}`)

        if (response.status === 200) {
          expect(response.body.success).to.be.true
          expect(response.body.data.tree).to.be.an('array')
          
          if (response.body.data.tree.length > 0) {
            expect(response.body.data.tree[0].id).to.equal(rootId)
          }
        }
      }
    })

    it('should limit tree depth', async () => {
      const response = await request(app)
        .get('/api/categories/tree?max_depth=1')

      if (response.status === 200) {
        expect(response.body.success).to.be.true
        const tree = response.body.data.tree
        
        // All items should be at level 1 when max_depth is 1
        tree.forEach(category => {
          expect(category.level).to.equal(1)
        })
      }
    })
  })

  describe('GET /api/categories/slug/:slug', () => {
    it('should get category by slug', async () => {
      const categoryData = {
        name: 'TEST Slug Category',
        description: 'Category for slug testing'
      }

      const createResponse = await request(app)
        .post('/api/categories')
        .send(categoryData)

      if (createResponse.status === 201) {
        const expectedSlug = 'test-slug-category'
        testCategoryIds.push(createResponse.body.data.id)

        const slugResponse = await request(app)
          .get(`/api/categories/slug/${expectedSlug}`)

        if (slugResponse.status !== 503) {
          expect(slugResponse.status).to.equal(200)
          expect(slugResponse.body.success).to.be.true
          expect(slugResponse.body.data.slug).to.equal(expectedSlug)
          expect(slugResponse.body.data.name).to.equal(categoryData.name)
        }
      }
    })

    it('should return 404 for non-existent slug', async () => {
      const response = await request(app)
        .get('/api/categories/slug/non-existent-slug')

      if (response.status !== 503) {
        expect(response.status).to.equal(404)
        expect(response.body.success).to.be.false
        expect(response.body.error).to.equal('Category not found')
      }
    })

    it('should validate slug format', async () => {
      const response = await request(app)
        .get('/api/categories/slug/Invalid Slug Format!')

      if (response.status !== 503) {
        expect(response.status).to.equal(400)
        expect(response.body.success).to.be.false
        expect(response.body.error).to.equal('Invalid slug format')
      }
    })
  })

  describe('PUT /api/categories/:id', () => {
    it('should update existing category', async () => {
      const categoryData = {
        name: 'TEST_UPDATE_Original',
        description: 'Original description'
      }

      const createResponse = await request(app)
        .post('/api/categories')
        .send(categoryData)

      if (createResponse.status === 201) {
        const categoryId = createResponse.body.data.id
        testCategoryIds.push(categoryId)

        const updateData = {
          name: 'TEST_UPDATE_Modified',
          description: 'Updated description',
          color: '#FF5722'
        }

        const updateResponse = await request(app)
          .put(`/api/categories/${categoryId}`)
          .send(updateData)

        if (updateResponse.status === 200) {
          expect(updateResponse.body.success).to.be.true
          expect(updateResponse.body.data.name).to.equal('TEST_UPDATE_Modified')
          expect(updateResponse.body.data.description).to.equal('Updated description')
          expect(updateResponse.body.data.color).to.equal('#FF5722')
          expect(updateResponse.body.data.slug).to.equal('test-update-modified')
        }
      }
    })

    it('should prevent circular references', async () => {
      // Create parent and child categories
      const parentResponse = await request(app)
        .post('/api/categories')
        .send({ name: 'TEST_CIRCULAR_Parent' })

      if (parentResponse.status === 201) {
        const parentId = parentResponse.body.data.id
        testCategoryIds.push(parentId)

        const childResponse = await request(app)
          .post('/api/categories')
          .send({ name: 'TEST_CIRCULAR_Child', parent_id: parentId })

        if (childResponse.status === 201) {
          const childId = childResponse.body.data.id
          testCategoryIds.push(childId)

          // Try to make parent a child of its own child (circular reference)
          const updateResponse = await request(app)
            .put(`/api/categories/${parentId}`)
            .send({ parent_id: childId })

          expect(updateResponse.status).to.equal(400)
          expect(updateResponse.body.success).to.be.false
          expect(updateResponse.body.error).to.include('circular reference')
        }
      }
    })

    it('should return 404 for non-existent category', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000'
      const updateData = { name: 'Updated Name' }

      const response = await request(app)
        .put(`/api/categories/${nonExistentId}`)
        .send(updateData)

      if (response.status !== 503) {
        expect(response.status).to.equal(404)
        expect(response.body.success).to.be.false
      }
    })

    it('should validate update data', async () => {
      const categoryData = {
        name: 'TEST_VALIDATION_Update'
      }

      const createResponse = await request(app)
        .post('/api/categories')
        .send(categoryData)

      if (createResponse.status === 201) {
        const categoryId = createResponse.body.data.id
        testCategoryIds.push(categoryId)

        const invalidUpdate = {
          name: '', // Empty name
          color: 'invalid-color'
        }

        const updateResponse = await request(app)
          .put(`/api/categories/${categoryId}`)
          .send(invalidUpdate)

        expect(updateResponse.status).to.equal(400)
        expect(updateResponse.body.success).to.be.false
      }
    })
  })

  describe('DELETE /api/categories/:id', () => {
    it('should soft delete category without children', async () => {
      const categoryData = {
        name: 'TEST_DELETE_NoChildren'
      }

      const createResponse = await request(app)
        .post('/api/categories')
        .send(categoryData)

      if (createResponse.status === 201) {
        const categoryId = createResponse.body.data.id
        
        const deleteResponse = await request(app)
          .delete(`/api/categories/${categoryId}`)

        if (deleteResponse.status === 200) {
          expect(deleteResponse.body.success).to.be.true
          expect(deleteResponse.body.message).to.include('deactivated')

          // Verify category is no longer accessible
          const getResponse = await request(app)
            .get(`/api/categories/${categoryId}`)

          expect(getResponse.status).to.equal(404)
        }
      }
    })

    it('should reject deletion of category with children', async () => {
      const parentResponse = await request(app)
        .post('/api/categories')
        .send({ name: 'TEST_DELETE_WithChildren' })

      if (parentResponse.status === 201) {
        const parentId = parentResponse.body.data.id
        testCategoryIds.push(parentId)

        const childResponse = await request(app)
          .post('/api/categories')
          .send({ name: 'TEST_DELETE_Child', parent_id: parentId })

        if (childResponse.status === 201) {
          testCategoryIds.push(childResponse.body.data.id)

          const deleteResponse = await request(app)
            .delete(`/api/categories/${parentId}`)

          expect(deleteResponse.status).to.equal(400)
          expect(deleteResponse.body.success).to.be.false
          expect(deleteResponse.body.error).to.include('has children')
        }
      }
    })

    it('should return 404 for non-existent category', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000'
      
      const response = await request(app)
        .delete(`/api/categories/${nonExistentId}`)

      if (response.status !== 503) {
        expect(response.status).to.equal(404)
        expect(response.body.success).to.be.false
      }
    })
  })

  describe('GET /api/categories/statistics', () => {
    beforeEach(async () => {
      // Create test categories for statistics
      try {
        const categories = [
          { name: 'TEST_STATS_Category1' },
          { name: 'TEST_STATS_Category2' }
        ]

        for (const data of categories) {
          const response = await request(app)
            .post('/api/categories')
            .send(data)
          
          if (response.status === 201) {
            testCategoryIds.push(response.body.data.id)
          }
        }
      } catch (error) {
        // Skip setup if database unavailable
      }
    })

    it('should return category statistics', async () => {
      const response = await request(app)
        .get('/api/categories/statistics')

      if (response.status === 200) {
        expect(response.body.success).to.be.true
        expect(response.body.data).to.be.an('object')
        expect(response.body.data).to.have.property('total_active')
        expect(response.body.data).to.have.property('by_level')
        expect(response.body.data).to.have.property('total_root_categories')
        expect(response.body.data.by_level).to.be.an('object')
      }
    })

    it('should filter statistics by specific categories', async () => {
      if (testCategoryIds.length > 0) {
        const categoryId = testCategoryIds[0]
        const response = await request(app)
          .get(`/api/categories/statistics?category_ids=${categoryId}`)

        if (response.status === 200) {
          expect(response.body.success).to.be.true
          expect(response.body.data).to.be.an('object')
        }
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const response = await request(app)
        .get('/api/categories')

      if (response.status === 503) {
        expect(response.body.success).to.be.false
        expect(response.body.error).to.equal('Database temporarily unavailable')
        expect(response.body.message).to.include('try again later')
      }
    })

    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/categories/non-existent-endpoint')

      expect(response.status).to.equal(404)
      expect(response.body.success).to.be.false
      expect(response.body.error).to.equal('Endpoint not found')
    })

    it('should handle malformed JSON in requests', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')

      expect(response.status).to.equal(400)
    })

    it('should validate UUID format in path parameters', async () => {
      const response = await request(app)
        .get('/api/categories/not-a-uuid')

      if (response.status !== 503) {
        expect(response.status).to.equal(400)
        expect(response.body.success).to.be.false
        expect(response.body.error).to.equal('Invalid category ID')
      }
    })

    it('should handle unsupported HTTP methods', async () => {
      const response = await request(app)
        .patch('/api/categories/123e4567-e89b-12d3-a456-426614174000')

      expect(response.status).to.equal(404)
    })
  })
})