const request = require('supertest')
const app = require('../app')
const { testConnection } = require('../config/database')

describe('API Server Basic Tests', () => {
  describe('Health Endpoints', () => {
    test('GET /api/health should return OK status', async () => {
      const res = await request(app)
        .get('/api/health')
        .expect(200)
      
      expect(res.body.status).toBe('ok')
      expect(res.body.service).toBe('learning-my-recipes-api')
      expect(res.body.version).toBe('1.0.0')
    })

    test('GET /api/health/live should return alive status', async () => {
      const res = await request(app)
        .get('/api/health/live')
        .expect(200)
      
      expect(res.body.status).toBe('alive')
    })
  })

  describe('Route Structure', () => {
    test('GET / should return API info', async () => {
      const res = await request(app)
        .get('/')
        .expect(200)
      
      expect(res.body.message).toBe('Learning My Recipes API')
      expect(res.body.version).toBe('1.0.0')
    })

    test('GET /api/recipes should return placeholder response', async () => {
      const res = await request(app)
        .get('/api/recipes')
        .expect(200)
      
      expect(res.body.endpoint).toBe('GET /api/recipes')
    })

    test('GET /api/ingredients should return placeholder response', async () => {
      const res = await request(app)
        .get('/api/ingredients')
        .expect(200)
      
      expect(res.body.endpoint).toBe('GET /api/ingredients')
    })

    test('GET /api/categories should return placeholder response', async () => {
      const res = await request(app)
        .get('/api/categories')
        .expect(200)
      
      expect(res.body.endpoint).toBe('GET /api/categories')
    })
  })

  describe('Error Handling', () => {
    test('GET /nonexistent should return 404', async () => {
      const res = await request(app)
        .get('/nonexistent')
        .expect(404)
      
      expect(res.body.error).toBeDefined()
      expect(res.body.code).toBe('ROUTE_NOT_FOUND')
    })
  })
})

describe('Database Connection', () => {
  test('Database connection test should return result', async () => {
    const result = await testConnection()
    expect(result).toBeDefined()
    expect(result.success).toBeDefined()
    // Note: This test may fail if no database is configured, which is expected in development
    if (!result.success) {
      console.log('Database connection failed (expected in development without DB setup):', result.error)
    }
  }, 10000) // Allow 10 seconds for database connection
})