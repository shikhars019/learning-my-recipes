# PostgreSQL Database Schema Research for Recipe Applications

## Overview
This document researches optimal PostgreSQL database design patterns for recipe management applications, focusing on educational value and intermediate complexity.

## Core Entity Relationships

### Primary Entities
1. **Recipes** - Central entity containing recipe metadata
2. **Ingredients** - Master list of ingredients
3. **Recipe_Ingredients** - Many-to-many relationship with quantities
4. **Categories** - Recipe categorization (breakfast, dinner, dessert, etc.)
5. **Users** - User profiles and preferences (no authentication)
6. **User_Favorites** - User's favorite recipes
7. **Recipe_Versions** - Track recipe edits and changes

### Schema Design Principles

#### 1. Normalization Strategy
- **Third Normal Form (3NF)** recommended for educational clarity
- Separate ingredient master data from recipe-specific quantities
- Avoid over-normalization that complicates queries for students

#### 2. Recipe Core Schema
```sql
-- Recipes table with intermediate complexity
recipes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT NOT NULL,
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    servings INTEGER DEFAULT 4,
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    category_id INTEGER REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories for organization
categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- Master ingredients list
ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100), -- dairy, vegetables, meat, etc.
    unit_type VARCHAR(50) -- cups, grams, pieces, etc.
);

-- Recipe-ingredient relationships with quantities
recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients(id),
    quantity DECIMAL(10,2),
    unit VARCHAR(50),
    notes TEXT -- optional preparation notes
);
```

#### 3. User Preferences and Favorites
```sql
-- User profiles (no authentication)
users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255),
    dietary_preferences JSONB, -- vegetarian, vegan, gluten-free, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User favorites
user_favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, recipe_id)
);
```

#### 4. Recipe Versioning
```sql
-- Track recipe modifications for educational purposes
recipe_versions (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    changes_description TEXT,
    modified_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Store the recipe state at this version
    recipe_data JSONB NOT NULL
);
```

#### 5. Nutritional Information (Optional Enhancement)
```sql
-- Nutritional data for intermediate complexity
recipe_nutrition (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    calories_per_serving INTEGER,
    protein_grams DECIMAL(5,2),
    carbs_grams DECIMAL(5,2),
    fat_grams DECIMAL(5,2),
    fiber_grams DECIMAL(5,2)
);
```

## Indexing Strategy for Performance

### Essential Indexes
```sql
-- Performance indexes for common queries
CREATE INDEX idx_recipes_category ON recipes(category_id);
CREATE INDEX idx_recipes_difficulty ON recipes(difficulty_level);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);
CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_ingredients_name ON ingredients(name);

-- Composite indexes for ingredient search
CREATE INDEX idx_recipe_ingredients_composite ON recipe_ingredients(ingredient_id, recipe_id);
```

## Query Patterns for Educational Value

### 1. Find Recipes by Available Ingredients
```sql
-- Simple exact matching approach (as specified in requirements)
SELECT DISTINCT r.id, r.name, r.description, r.prep_time_minutes
FROM recipes r
JOIN recipe_ingredients ri ON r.id = ri.recipe_id
JOIN ingredients i ON ri.ingredient_id = i.id
WHERE i.name IN ('tomatoes', 'onions', 'garlic')
ORDER BY r.name;
```

### 2. Recipe Search with Metadata
```sql
-- Search with difficulty and time constraints
SELECT r.*, c.name as category_name
FROM recipes r
LEFT JOIN categories c ON r.category_id = c.id
WHERE r.difficulty_level = 'easy'
  AND r.prep_time_minutes + r.cook_time_minutes <= 30
ORDER BY r.prep_time_minutes + r.cook_time_minutes;
```

### 3. User Favorites with Recipe Details
```sql
-- User's favorite recipes with full details
SELECT r.*, c.name as category_name, uf.added_at as favorited_at
FROM user_favorites uf
JOIN recipes r ON uf.recipe_id = r.id
LEFT JOIN categories c ON r.category_id = c.id
WHERE uf.user_id = $1
ORDER BY uf.added_at DESC;
```

## Data Seeding Strategy

### Sample Data Structure for 20 Recipes
- **Categories**: Breakfast (5), Lunch (5), Dinner (7), Dessert (3)
- **Difficulty Distribution**: Easy (10), Medium (7), Hard (3)
- **Time Range**: 15-120 minutes total time
- **Ingredient Variety**: 50-60 unique ingredients across all recipes

### Educational Benefits
1. **Relationship Understanding**: Many-to-many relationships between recipes and ingredients
2. **Data Normalization**: Proper separation of concerns
3. **Query Optimization**: Index usage and query performance
4. **JSON Data**: Modern PostgreSQL features with JSONB
5. **Constraints**: Data integrity through foreign keys and check constraints

## Migration Strategy

### Development Approach
1. **Create base schema** with core tables
2. **Add sample data** via ETL script
3. **Add indexes** for performance optimization
4. **Implement versioning** after core functionality
5. **Add nutritional data** as enhancement

This schema provides intermediate complexity suitable for educational purposes while maintaining practical applicability and performance.