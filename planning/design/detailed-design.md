# Learning My Recipes - Detailed Design Document

## Overview

**Learning My Recipes** is an educational full-stack recipe management application designed for a 10-day graduate engineering training program. The application demonstrates modern web development practices using Node.js, React, PostgreSQL, and AI integration, structured as a simple monorepo with progressive complexity across 5 Git branches.

### Educational Objectives

1. **Database Design**: Learn PostgreSQL schema design, relationships, and optimization
2. **Backend Development**: Master Express.js API patterns, middleware, and error handling
3. **Frontend Development**: Build responsive React applications with Material-UI
4. **Data Processing**: Implement ETL patterns with Python for data ingestion
5. **AI Integration**: Integrate OpenAI for intelligent recipe generation
6. **DevOps Practices**: Version control, documentation, and deployment strategies

## Requirements Summary

Based on requirements clarification, the system must provide:

- **Core Functionality**: Recipe CRUD operations, ingredient-based search, user favorites
- **Educational Features**: Recipe versioning, comprehensive documentation, progressive Git branches
- **Technical Stack**: Node.js/Express backend, React/Material-UI frontend, PostgreSQL database
- **Advanced Features**: Python ETL processing, OpenAI recipe generation
- **Constraints**: No Docker, no authentication system, Windows-compatible local PostgreSQL setup

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React SPA     │    │  Express.js API │    │   PostgreSQL    │
│  (Frontend)     │◄──►│   (Backend)     │◄──►│   Database      │
│  Material-UI    │    │  RESTful APIs   │    │   Recipe Data   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       ▲
         │                       │                       │
         ▼              ┌─────────────────┐              │
┌─────────────────┐     │   OpenAI API    │              │
│  Static Files   │     │ Recipe Generator│              │
│  (Build Output) │     └─────────────────┘              │
└─────────────────┘                                      │
                                               ┌─────────────────┐
                                               │  Python ETL     │
                                               │  Data Processor │
                                               └─────────────────┘
```

### Monorepo Structure

```
learning-my-recipes/
├── README.md                          # Project overview and setup
├── .gitignore                         # Git ignore rules
├── package.json                       # Root package.json for scripts
├── docs/                              # Educational documentation
│   ├── branch-guides/                 # Branch-specific learning guides
│   ├── architecture/                  # System architecture docs
│   └── student-notes/                 # Progressive learning notes
├── frontend/                          # React application
│   ├── package.json
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── theme/
│   └── tests/
├── backend/                           # Express.js API
│   ├── package.json
│   ├── server.js
│   ├── config/
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── middleware/
│   └── tests/
├── scripts/                           # Python ETL and utilities
│   ├── etl/
│   ├── data/
│   ├── config/
│   └── requirements.txt
└── database/                          # Database schema and migrations
    ├── schema.sql
    ├── migrations/
    └── seed-data/
```

## Database Design

### Entity Relationship Model

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│ categories  │     │ recipe_ingredients│     │ ingredients │
│             │     │                  │     │             │
│ id (PK)     │     │ id (PK)          │     │ id (PK)     │
│ name        │◄────│ recipe_id (FK)   │────►│ name        │
│ description │     │ ingredient_id (FK)│     │ category    │
└─────────────┘     │ quantity         │     │ unit_type   │
       ▲            │ unit             │     └─────────────┘
       │            │ notes            │
       │            └──────────────────┘
       │                     ▲
┌─────────────┐              │
│ recipes     │──────────────┘
│             │
│ id (PK)     │     ┌──────────────────┐
│ name        │     │ user_favorites   │
│ description │     │                  │
│ instructions│     │ id (PK)          │
│ prep_time   │     │ user_id (FK)     │────┐
│ cook_time   │     │ recipe_id (FK)   │    │
│ servings    │     │ added_at         │    │
│ difficulty  │     └──────────────────┘    │
│ category_id │                             │
│ created_at  │     ┌──────────────────┐    │
│ updated_at  │     │ recipe_versions  │    │
└─────────────┘     │                  │    │
       ▲            │ id (PK)          │    │
       │            │ recipe_id (FK)   │    │
       │            │ version_number   │    │
       │            │ changes_desc     │    │
       │            │ modified_by (FK) │    │
       │            │ created_at       │    │
       │            │ recipe_data      │    │
       │            └──────────────────┘    │
       │                                    │
┌─────────────┐                             │
│ users       │─────────────────────────────┘
│             │
│ id (PK)     │     ┌──────────────────┐
│ username    │     │ recipe_nutrition │
│ email       │     │                  │
│ dietary_pref│     │ id (PK)          │
│ created_at  │     │ recipe_id (FK)   │────┐
└─────────────┘     │ calories_serving │    │
                    │ protein_grams    │    │
                    │ carbs_grams      │    │
                    │ fat_grams        │    │
                    │ fiber_grams      │    │
                    └──────────────────┘    │
                                            │
                                            ▼
                              (References recipes.id)
```

### Core Database Schema

```sql
-- Categories table for recipe classification
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ingredients master table
CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100), -- dairy, vegetables, meat, spices, etc.
    unit_type VARCHAR(50), -- default unit (cups, grams, pieces, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Main recipes table
CREATE TABLE recipes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    instructions TEXT NOT NULL,
    prep_time_minutes INTEGER CHECK (prep_time_minutes > 0),
    cook_time_minutes INTEGER DEFAULT 0 CHECK (cook_time_minutes >= 0),
    servings INTEGER DEFAULT 4 CHECK (servings > 0),
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    category_id INTEGER REFERENCES categories(id),
    image_url VARCHAR(500),
    source VARCHAR(100) DEFAULT 'User Created', -- 'User Created', 'AI Generated', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipe-ingredient relationships with quantities
CREATE TABLE recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients(id),
    quantity DECIMAL(10,2),
    unit VARCHAR(50),
    preparation_notes TEXT, -- "diced", "chopped fine", etc.
    is_optional BOOLEAN DEFAULT FALSE,
    UNIQUE(recipe_id, ingredient_id)
);

-- Users table (no authentication, just preferences)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255),
    display_name VARCHAR(255),
    dietary_preferences JSONB, -- {"vegetarian": true, "gluten_free": false, etc.}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User favorites
CREATE TABLE user_favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, recipe_id)
);

-- Recipe versioning for educational purposes
CREATE TABLE recipe_versions (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    changes_description TEXT,
    modified_by INTEGER REFERENCES users(id),
    recipe_data JSONB NOT NULL, -- Store complete recipe state
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(recipe_id, version_number)
);

-- Nutritional information (optional enhancement)
CREATE TABLE recipe_nutrition (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    calories_per_serving INTEGER,
    protein_grams DECIMAL(5,2),
    carbs_grams DECIMAL(5,2),
    fat_grams DECIMAL(5,2),
    fiber_grams DECIMAL(5,2),
    sodium_mg DECIMAL(7,2)
);

-- Performance indexes
CREATE INDEX idx_recipes_category ON recipes(category_id);
CREATE INDEX idx_recipes_difficulty ON recipes(difficulty_level);
CREATE INDEX idx_recipes_prep_time ON recipes(prep_time_minutes);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);
CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_ingredients_name ON ingredients(name);
CREATE INDEX idx_recipes_name ON recipes(name);

-- Update trigger for recipes.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## API Design

### RESTful Endpoint Specification

#### Base URL Structure
```
/api/v1/
├── recipes/
├── ingredients/
├── categories/
├── users/
└── ai/
```

#### Core Recipe Endpoints

```http
GET    /api/v1/recipes              # List recipes with pagination
GET    /api/v1/recipes/:id          # Get specific recipe with ingredients
POST   /api/v1/recipes              # Create new recipe
PUT    /api/v1/recipes/:id          # Update recipe (creates version)
DELETE /api/v1/recipes/:id          # Delete recipe
GET    /api/v1/recipes/search       # Search recipes by ingredients/criteria
GET    /api/v1/recipes/:id/versions # Get recipe version history
```

#### Ingredient and Category Endpoints

```http
GET    /api/v1/ingredients          # List all ingredients
POST   /api/v1/ingredients          # Add new ingredient
GET    /api/v1/categories           # List all categories
POST   /api/v1/categories           # Add new category
```

#### User and Favorites Endpoints

```http
GET    /api/v1/users                # List users (for demo purposes)
POST   /api/v1/users                # Create user profile
GET    /api/v1/users/:id/favorites  # Get user's favorite recipes
POST   /api/v1/users/:id/favorites  # Add recipe to favorites
DELETE /api/v1/users/:id/favorites/:recipeId # Remove from favorites
```

#### AI Integration Endpoints

```http
POST   /api/v1/ai/generate-recipe   # Generate recipe from ingredients
GET    /api/v1/ai/status            # Check AI service availability
```

### Request/Response Format Examples

#### Recipe Creation Request
```json
POST /api/v1/recipes
{
  "name": "Spaghetti Carbonara",
  "description": "Classic Italian pasta dish with eggs and cheese",
  "instructions": "1. Cook pasta al dente...\n2. Mix eggs with cheese...",
  "prep_time_minutes": 10,
  "cook_time_minutes": 15,
  "servings": 4,
  "difficulty_level": "medium",
  "category_id": 2,
  "ingredients": [
    {
      "ingredient_id": 1,
      "quantity": 400,
      "unit": "grams",
      "preparation_notes": "spaghetti pasta"
    },
    {
      "ingredient_id": 15,
      "quantity": 3,
      "unit": "large",
      "preparation_notes": "room temperature eggs"
    }
  ]
}
```

#### Recipe Search Response
```json
GET /api/v1/recipes/search?ingredients=tomatoes,onions
{
  "recipes": [
    {
      "id": 1,
      "name": "Tomato Onion Soup",
      "description": "Simple and delicious soup",
      "prep_time_minutes": 15,
      "cook_time_minutes": 30,
      "difficulty_level": "easy",
      "category": {
        "id": 3,
        "name": "Soups"
      },
      "matched_ingredients": ["tomatoes", "onions"],
      "total_ingredients": 6,
      "match_percentage": 33.3
    }
  ],
  "search_criteria": {
    "ingredients": ["tomatoes", "onions"],
    "match_type": "exact"
  },
  "total_results": 1
}
```

## Frontend Design

### Component Architecture

```
App
├── Layout/
│   ├── Header (Navigation, Search)
│   ├── Sidebar (Categories, Filters)
│   └── Footer
├── Pages/
│   ├── HomePage (Recipe Grid, Featured)
│   ├── RecipeDetailPage (Full recipe, ingredients)
│   ├── SearchResultsPage (Search results grid)
│   ├── CreateRecipePage (Recipe form)
│   ├── EditRecipePage (Recipe editing)
│   ├── FavoritesPage (User's favorites)
│   └── AIGeneratorPage (AI recipe generation)
├── Components/
│   ├── RecipeCard (Recipe preview card)
│   ├── RecipeForm (Create/edit recipe form)
│   ├── IngredientSearch (Ingredient autocomplete)
│   ├── RecipeInstructions (Formatted instructions)
│   ├── NutritionInfo (Nutritional display)
│   ├── DifficultyBadge (Difficulty indicator)
│   ├── CategoryFilter (Category selection)
│   └── LoadingSpinner (Loading states)
└── Common/
    ├── ConfirmDialog (Confirmation dialogs)
    ├── ErrorBoundary (Error handling)
    ├── NotificationSnackbar (Toast notifications)
    └── SearchBar (Global search)
```

### Material-UI Theme Configuration

```javascript
const theme = createTheme({
  palette: {
    primary: {
      main: '#4caf50',      // Green for food/cooking theme
      light: '#81c784',
      dark: '#388e3c',
    },
    secondary: {
      main: '#ff9800',      // Orange accent color
      light: '#ffb74d',
      dark: '#f57c00',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      color: '#2e7d32',
    },
    h5: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          transition: 'box-shadow 0.3s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          },
        },
      },
    },
  },
});
```

### Responsive Design Strategy

- **Mobile-First**: Design for mobile screens (320px+) then scale up
- **Breakpoints**: Use Material-UI breakpoints (xs, sm, md, lg, xl)
- **Grid System**: Material-UI Grid component for responsive layouts
- **Navigation**: Responsive AppBar with drawer for mobile
- **Touch-Friendly**: Adequate touch targets (44px minimum)

## Data Flow Architecture

### Frontend State Management

```javascript
// Context-based state management structure
AppContext
├── RecipeContext (Recipe CRUD operations)
├── UserContext (User preferences, favorites)
├── SearchContext (Search state, filters)
└── NotificationContext (Toast messages, errors)

// Custom hooks for data fetching
useRecipes()         // Fetch recipes with pagination
useRecipe(id)        // Fetch single recipe
useIngredients()     // Fetch ingredients list
useCategories()      // Fetch categories
useFavorites(userId) // User's favorite recipes
useAIGeneration()    // AI recipe generation
```

### API Integration Patterns

```javascript
// Service layer for API calls
RecipeService {
  getAllRecipes(page, filters)
  getRecipeById(id)
  createRecipe(recipeData)
  updateRecipe(id, updates)
  deleteRecipe(id)
  searchRecipes(criteria)
}

IngredientService {
  getAllIngredients()
  searchIngredients(query)
  createIngredient(data)
}

AIService {
  generateRecipe(ingredients, preferences)
  checkServiceStatus()
}
```

## ETL Design

### Python ETL Architecture

```python
# ETL Pipeline Components
ETLPipeline
├── Extractors/
│   ├── JSONExtractor (Read recipe JSON files)
│   └── DataValidator (Schema validation)
├── Transformers/
│   ├── RecipeTransformer (Clean and validate recipes)
│   ├── IngredientNormalizer (Standardize ingredient names)
│   └── DuplicateDetector (Find duplicate recipes)
├── Loaders/
│   ├── DatabaseLoader (PostgreSQL insertion)
│   └── ValidationLoader (Data integrity checks)
└── Utils/
    ├── ConfigManager (Database configuration)
    ├── Logger (Comprehensive logging)
    └── ErrorHandler (Error recovery)
```

### Sample Recipe Data Structure

```json
{
  "recipes": [
    {
      "name": "Classic Spaghetti Carbonara",
      "description": "Authentic Roman pasta dish with eggs, cheese, and pancetta",
      "category": "Dinner",
      "difficulty_level": "medium",
      "prep_time_minutes": 10,
      "cook_time_minutes": 15,
      "servings": 4,
      "instructions": "1. Cook spaghetti in salted boiling water until al dente...",
      "ingredients": [
        {
          "name": "spaghetti",
          "quantity": 400,
          "unit": "grams"
        },
        {
          "name": "eggs",
          "quantity": 3,
          "unit": "large",
          "preparation_notes": "room temperature"
        }
      ],
      "nutrition": {
        "calories_per_serving": 520,
        "protein_grams": 22,
        "carbs_grams": 65,
        "fat_grams": 18
      }
    }
  ]
}
```

## AI Integration Design

### OpenAI Recipe Generation Flow

```
User Input (Ingredients + Preferences)
           ↓
    Input Validation & Sanitization
           ↓
      Prompt Construction
           ↓
    OpenAI API Call (GPT-3.5-turbo)
           ↓
     Response Parsing & Validation
           ↓
    Recipe Object Creation
           ↓
    Optional: Save to Database
           ↓
      Return to Frontend
```

### Prompt Engineering Strategy

```javascript
const systemPrompt = `You are a helpful cooking assistant that creates detailed recipes based on available ingredients.

Guidelines:
- Create practical, easy-to-follow recipes
- Use only the ingredients provided when possible
- Suggest common pantry items (salt, pepper, oil) if needed
- Provide clear step-by-step instructions
- Include cooking times and serving information
- Format your response consistently`;

const buildUserPrompt = (ingredients, preferences) => {
  return `Create a recipe using these ingredients: ${ingredients.join(', ')}.
  
  Preferences:
  - Cuisine: ${preferences.cuisine || 'Any'}
  - Difficulty: ${preferences.difficulty || 'Any'}
  - Max time: ${preferences.maxTime || 'No limit'} minutes
  
  Format the response exactly as specified in your system instructions.`;
};
```

## Error Handling Strategy

### Backend Error Handling

```javascript
// Centralized error handling middleware
const errorHandler = (err, req, res, next) => {
  // Log error for monitoring
  logger.error('API Error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Database errors
  if (err.code === '23505') { // Unique violation
    return res.status(409).json({
      error: 'Duplicate entry',
      message: 'A record with this data already exists'
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.details
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    requestId: req.id,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
```

### Frontend Error Handling

```javascript
// Error boundary for React components
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          <AlertTitle>Something went wrong</AlertTitle>
          Please refresh the page or contact support if the problem persists.
        </Alert>
      );
    }

    return this.props.children;
  }
}
```

## Testing Strategy

### Backend Testing Approach

```javascript
// Test categories and tools
├── Unit Tests (Jest)
│   ├── Controllers (Business logic)
│   ├── Models (Data validation)
│   ├── Services (External integrations)
│   └── Utils (Helper functions)
├── Integration Tests (Jest + Supertest)
│   ├── API Endpoints (Full request/response cycle)
│   ├── Database Operations (CRUD operations)
│   └── ETL Pipeline (Data processing)
└── Performance Tests
    ├── Load Testing (Artillery)
    └── Database Query Performance
```

### Frontend Testing Approach

```javascript
// Test categories and tools
├── Unit Tests (Jest + React Testing Library)
│   ├── Components (Rendering, interactions)
│   ├── Hooks (Custom hook behavior)
│   ├── Services (API calls)
│   └── Utils (Helper functions)
├── Integration Tests
│   ├── User Flows (Multi-component interactions)
│   ├── API Integration (Mocked API responses)
│   └── Form Validation (Complex form behavior)
└── E2E Tests (Cypress)
    ├── Critical User Journeys
    ├── Recipe Creation Flow
    └── Search Functionality
```

## Security Considerations

### Data Security

- **Input Validation**: Comprehensive validation on all inputs using Joi/express-validator
- **SQL Injection Prevention**: Parameterized queries with pg library
- **XSS Prevention**: Content Security Policy headers, input sanitization
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Configuration**: Proper cross-origin resource sharing setup

### API Security

```javascript
// Security middleware stack
app.use(helmet());                    // Security headers
app.use(cors(corsOptions));           // CORS configuration
app.use(rateLimit(rateLimitOptions)); // Rate limiting
app.use(express.json({ limit: '10mb' })); // Request size limiting
app.use(morgan('combined'));          // Request logging
```

## Performance Considerations

### Database Optimization

- **Indexing Strategy**: Indexes on frequently queried columns
- **Connection Pooling**: PostgreSQL connection pooling for efficiency
- **Query Optimization**: Efficient queries with proper joins and filtering
- **Pagination**: Limit result sets with cursor-based pagination

### Frontend Optimization

- **Code Splitting**: React.lazy() for route-based code splitting
- **Memoization**: React.memo() and useMemo() for expensive operations
- **Image Optimization**: WebP format, lazy loading for recipe images
- **Bundle Optimization**: Tree shaking, minification in production builds

### Caching Strategy

```javascript
// Redis caching for frequently accessed data
const cacheStrategy = {
  recipes: '15 minutes',      // Recipe list cache
  ingredients: '1 hour',      // Ingredient list cache
  categories: '24 hours',     // Category list cache
  search: '5 minutes'         // Search results cache
};
```

## Deployment Architecture

### Development Environment Setup

1. **Local PostgreSQL Installation**
   - Windows PostgreSQL installer
   - Database creation scripts
   - Sample data loading

2. **Node.js Environment**
   - Individual package.json files per service
   - Environment variable configuration
   - Development server scripts

3. **Python Environment**
   - Virtual environment setup
   - Requirements installation
   - ETL script execution

### Git Branch Strategy

```
main (stable, production-ready)
├── step-1-database-foundation
│   └── PostgreSQL schema, basic Express setup
├── step-2-api-development
│   └── Complete API endpoints, validation
├── step-3-frontend-implementation
│   └── React components, Material-UI integration
├── step-4-etl-processing
│   └── Python ETL pipeline, data loading
└── step-5-ai-integration
    └── OpenAI integration, final features
```

### Educational Documentation Structure

```
docs/
├── setup-guides/
│   ├── windows-postgres-setup.md
│   ├── node-environment-setup.md
│   └── python-environment-setup.md
├── learning-paths/
│   ├── database-design-concepts.md
│   ├── api-development-patterns.md
│   ├── react-best-practices.md
│   ├── etl-processing-guide.md
│   └── ai-integration-basics.md
├── code-walkthroughs/
│   ├── database-schema-explanation.md
│   ├── api-endpoint-deep-dive.md
│   ├── component-architecture-guide.md
│   └── error-handling-patterns.md
└── exercises/
    ├── database-queries-practice.md
    ├── api-testing-exercises.md
    ├── component-building-tasks.md
    └── integration-challenges.md
```

This comprehensive design document provides the foundation for implementing the Learning My Recipes application with clear educational objectives, technical specifications, and progressive learning opportunities across all five development branches.