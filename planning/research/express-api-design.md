# Express.js API Design Research for Educational Recipe App

## Overview
This document explores Express.js API design patterns and best practices suitable for a graduate-level educational project with intermediate complexity.

## API Architecture Patterns

### 1. RESTful API Design
Following REST principles for predictable and learnable API structure:

```
GET    /api/recipes              # Get all recipes (with pagination)
GET    /api/recipes/:id          # Get specific recipe
POST   /api/recipes              # Create new recipe
PUT    /api/recipes/:id          # Update recipe (creates new version)
DELETE /api/recipes/:id          # Delete recipe

GET    /api/recipes/search       # Search recipes by ingredients
GET    /api/categories           # Get all categories
GET    /api/ingredients          # Get all ingredients

GET    /api/users/:id/favorites  # Get user's favorites
POST   /api/users/:id/favorites  # Add to favorites
DELETE /api/users/:id/favorites/:recipeId  # Remove from favorites

POST   /api/ai/generate-recipe   # AI recipe generation endpoint
```

### 2. Project Structure (Monorepo Backend)
```
backend/
├── package.json
├── server.js                 # Entry point
├── config/
│   ├── database.js          # PostgreSQL connection
│   └── environment.js       # Environment variables
├── routes/
│   ├── recipes.js           # Recipe CRUD operations
│   ├── ingredients.js       # Ingredient management
│   ├── users.js            # User preferences/favorites
│   └── ai.js               # OpenAI integration
├── controllers/
│   ├── recipeController.js  # Business logic for recipes
│   ├── ingredientController.js
│   ├── userController.js
│   └── aiController.js
├── models/
│   ├── Recipe.js            # Data models/validators
│   ├── Ingredient.js
│   └── User.js
├── middleware/
│   ├── validation.js        # Input validation
│   ├── errorHandler.js      # Error handling
│   └── cors.js             # CORS configuration
├── utils/
│   ├── database.js          # DB query helpers
│   └── logger.js           # Logging utilities
└── tests/
    ├── recipes.test.js      # API endpoint tests
    └── integration.test.js  # Integration tests
```

### 3. Core Dependencies for Educational Value

#### Essential NPM Packages
```json
{
  "dependencies": {
    "express": "^4.18.0",           // Core web framework
    "pg": "^8.8.0",                // PostgreSQL client
    "cors": "^2.8.5",              // Cross-origin requests
    "helmet": "^6.0.0",            // Security middleware
    "morgan": "^1.10.0",           // HTTP request logger
    "joi": "^17.7.0",              // Input validation
    "dotenv": "^16.0.3",           // Environment variables
    "openai": "^4.0.0"             // OpenAI integration
  },
  "devDependencies": {
    "jest": "^29.0.0",             // Testing framework
    "supertest": "^6.3.0",         // HTTP testing
    "nodemon": "^2.0.20"           // Development auto-restart
  }
}
```

## API Implementation Patterns

### 1. Database Connection Management
```javascript
// config/database.js
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'recipe_app',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  max: 20,                    // Maximum connections in pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout connection attempts after 2s
});

module.exports = { pool };
```

### 2. Input Validation Pattern
```javascript
// middleware/validation.js
const Joi = require('joi');

const recipeSchema = Joi.object({
  name: Joi.string().min(3).max(255).required(),
  description: Joi.string().max(1000),
  instructions: Joi.string().required(),
  prep_time_minutes: Joi.number().integer().min(1).max(480),
  cook_time_minutes: Joi.number().integer().min(0).max(480),
  servings: Joi.number().integer().min(1).max(20),
  difficulty_level: Joi.string().valid('easy', 'medium', 'hard'),
  category_id: Joi.number().integer().required(),
  ingredients: Joi.array().items(
    Joi.object({
      ingredient_id: Joi.number().integer().required(),
      quantity: Joi.number().positive(),
      unit: Joi.string().max(50)
    })
  ).min(1).required()
});

const validateRecipe = (req, res, next) => {
  const { error } = recipeSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  next();
};

module.exports = { validateRecipe };
```

### 3. Error Handling Pattern
```javascript
// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Database errors
  if (err.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({
      error: 'Duplicate entry',
      message: 'A record with this data already exists'
    });
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    return res.status(400).json({
      error: 'Invalid reference',
      message: 'Referenced record does not exist'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
```

### 4. Recipe Controller Pattern
```javascript
// controllers/recipeController.js
const { pool } = require('../config/database');

class RecipeController {
  async getAllRecipes(req, res, next) {
    try {
      const { page = 1, limit = 10, category, difficulty } = req.query;
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT r.*, c.name as category_name,
               COUNT(*) OVER() as total_count
        FROM recipes r
        LEFT JOIN categories c ON r.category_id = c.id
      `;
      
      const conditions = [];
      const params = [];
      
      if (category) {
        conditions.push('c.name = $' + (params.length + 1));
        params.push(category);
      }
      
      if (difficulty) {
        conditions.push('r.difficulty_level = $' + (params.length + 1));
        params.push(difficulty);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
      
      const result = await pool.query(query, params);
      
      const totalCount = result.rows[0]?.total_count || 0;
      const totalPages = Math.ceil(totalCount / limit);
      
      res.json({
        recipes: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages,
          totalCount: parseInt(totalCount)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async searchByIngredients(req, res, next) {
    try {
      const { ingredients } = req.query; // comma-separated ingredient names
      
      if (!ingredients) {
        return res.status(400).json({ 
          error: 'Missing ingredients parameter' 
        });
      }
      
      const ingredientList = ingredients.split(',').map(i => i.trim());
      
      const query = `
        SELECT DISTINCT r.id, r.name, r.description, r.prep_time_minutes, 
               r.cook_time_minutes, r.difficulty_level, c.name as category_name
        FROM recipes r
        JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        JOIN ingredients i ON ri.ingredient_id = i.id
        LEFT JOIN categories c ON r.category_id = c.id
        WHERE i.name = ANY($1)
        ORDER BY r.name
      `;
      
      const result = await pool.query(query, [ingredientList]);
      
      res.json({
        recipes: result.rows,
        searchTerm: ingredientList,
        count: result.rows.length
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RecipeController();
```

## OpenAI Integration Pattern

### 1. AI Controller for Recipe Generation
```javascript
// controllers/aiController.js
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class AIController {
  async generateRecipe(req, res, next) {
    try {
      const { ingredients, preferences = {} } = req.body;
      
      if (!ingredients || !Array.isArray(ingredients)) {
        return res.status(400).json({
          error: 'Ingredients array is required'
        });
      }
      
      const prompt = this.buildRecipePrompt(ingredients, preferences);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful cooking assistant that creates recipes based on available ingredients."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });
      
      const recipeText = completion.choices[0].message.content;
      const parsedRecipe = this.parseAIRecipe(recipeText);
      
      res.json({
        recipe: parsedRecipe,
        rawResponse: recipeText
      });
      
    } catch (error) {
      if (error.code === 'insufficient_quota') {
        return res.status(429).json({
          error: 'AI service temporarily unavailable',
          message: 'Please try again later'
        });
      }
      next(error);
    }
  }
  
  buildRecipePrompt(ingredients, preferences) {
    let prompt = `Create a recipe using these ingredients: ${ingredients.join(', ')}.\n\n`;
    
    if (preferences.difficulty) {
      prompt += `Difficulty level: ${preferences.difficulty}\n`;
    }
    
    if (preferences.maxTime) {
      prompt += `Maximum total cooking time: ${preferences.maxTime} minutes\n`;
    }
    
    prompt += `
Format the response as:
Recipe Name: [name]
Prep Time: [minutes]
Cook Time: [minutes]
Servings: [number]
Difficulty: [easy/medium/hard]

Ingredients:
- [ingredient with quantity]

Instructions:
1. [step by step instructions]
    `;
    
    return prompt;
  }
  
  parseAIRecipe(recipeText) {
    // Basic parsing - in production, would use more robust parsing
    const lines = recipeText.split('\n');
    const recipe = {};
    
    lines.forEach(line => {
      if (line.startsWith('Recipe Name:')) {
        recipe.name = line.replace('Recipe Name:', '').trim();
      }
      // Add more parsing logic as needed
    });
    
    return {
      ...recipe,
      source: 'AI Generated',
      rawText: recipeText
    };
  }
}

module.exports = new AIController();
```

## Educational Benefits

### 1. Learning Objectives Demonstrated
- **MVC Architecture**: Clear separation of routes, controllers, and models
- **Middleware Patterns**: Authentication, validation, error handling
- **Database Integration**: Connection pooling, query optimization
- **API Design**: RESTful conventions, status codes, response formatting
- **Error Handling**: Graceful error responses and logging
- **Testing**: Unit and integration testing patterns

### 2. Best Practices for Students
- **Environment Configuration**: Proper use of environment variables
- **Security Considerations**: Helmet, CORS, input validation
- **Code Organization**: Modular structure with clear responsibilities
- **Documentation**: Comprehensive API documentation
- **Performance**: Database connection pooling and query optimization

### 3. Progressive Complexity
- **Branch 1**: Basic Express server with simple routes
- **Branch 2**: Add database integration and CRUD operations
- **Branch 3**: Implement search functionality and validation
- **Branch 4**: Add AI integration and advanced features
- **Branch 5**: Performance optimization and testing

This structure provides a solid foundation for teaching modern backend development while maintaining educational clarity and practical applicability.