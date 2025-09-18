# Learning My Recipes - Data Model Documentation

## Overview

Our recipe application uses a **normalized relational database model** with proper entity relationships. This ensures data consistency, eliminates duplication, and provides flexibility for advanced features.

## Core Entities

### 1. Users Table
```sql
users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(100),
    bio TEXT,
    avatar_url TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

### 2. Categories Table
```sql
categories (
    id UUID PRIMARY KEY,
    name VARCHAR(100) UNIQUE,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

### 3. Recipes Table
```sql
recipes (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    prep_time INTEGER,                  -- minutes
    cook_time INTEGER,                  -- minutes  
    total_time INTEGER,                 -- minutes (manually set)
    servings INTEGER DEFAULT 1,
    difficulty VARCHAR(20),             -- 'easy', 'medium', 'hard'
    category_id INTEGER REFERENCES categories(id),
    user_id UUID REFERENCES users(id),
    image_url TEXT,
    instructions TEXT[],               -- Array of instruction steps
    tips TEXT,
    nutrition_info JSONB,              -- nutritional data
    is_ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

### 4. Ingredients Table (Master List)
```sql
ingredients (
    id SERIAL PRIMARY KEY,              -- INTEGER auto-increment
    name VARCHAR(200) NOT NULL UNIQUE,
    category VARCHAR(100),              -- 'protein', 'vegetable', 'spice', etc.
    common_unit VARCHAR(50),            -- most common unit for this ingredient
    nutrition_data JSONB,               -- per 100g nutritional data
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

### 5. Recipe-Ingredients Junction Table
```sql
recipe_ingredients (
    id SERIAL PRIMARY KEY,              -- INTEGER auto-increment
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity DECIMAL(10,3),             -- amount (e.g., 2.5)
    unit VARCHAR(50),                   -- 'cups', 'tbsp', 'lbs', etc.
    preparation VARCHAR(100),           -- 'chopped', 'diced', 'minced'
    optional BOOLEAN DEFAULT false,
    substitute_notes TEXT,              -- alternative ingredients
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

## Key Design Principles

### 1. **Normalized Data Model**
- **Ingredients are stored once** in the `ingredients` table
- **Recipes reference ingredients by ID** through `recipe_ingredients` table
- **No duplication** - "Chicken breast" exists once, referenced by all recipes

### 2. **Hybrid Approach for Flexibility**
- `recipe_ingredients.ingredient_id` (UUID) - **PRIMARY**: Reference to normalized ingredient
- `recipe_ingredients.ingredient_name` (TEXT) - **FALLBACK**: For custom/rare ingredients not in master list

### 3. **Why This Model?**

#### ✅ **Advantages**
- **Data Consistency**: "Chicken breast" nutrition info stored once, shared by all recipes
- **Advanced Search**: Find all recipes containing specific ingredients by ID
- **Analytics**: Track ingredient popularity, seasonal usage, allergen analysis
- **Standardization**: Prevent "chicken breast" vs "chicken" vs "Chicken Breast" duplicates
- **Rich Metadata**: Store allergens, nutrition, storage tips per ingredient
- **Future Features**: Shopping lists, meal planning, inventory management

#### ❌ **What We Avoid**
- **Storing ingredient names directly in recipes** (leads to inconsistency)
- **No ingredient normalization** (same ingredient with different names)
- **No rich ingredient metadata** (nutrition, allergens, seasons)

## Data Flow Examples

### Example 1: Creating a Recipe
```sql
-- 1. Ensure ingredients exist in master table
INSERT INTO ingredients (name, category) VALUES ('Chicken breast', 'protein');
INSERT INTO ingredients (name, category) VALUES ('Bell peppers', 'vegetable');

-- 2. Create recipe
INSERT INTO recipes (title, description, instructions) 
VALUES ('Chicken Stir Fry', '...', '["Step 1", "Step 2"]');

-- 3. Link recipe to ingredients with quantities
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, ingredient_name, amount, unit)
VALUES 
  (recipe_uuid, chicken_ingredient_uuid, 'Chicken breast', 1, 'lb'),
  (recipe_uuid, pepper_ingredient_uuid, 'Bell peppers', 2, 'whole');
```

### Example 2: Searching Recipes by Ingredients
```sql
-- Find all recipes containing "Chicken breast" and "Bell peppers"
SELECT DISTINCT r.*
FROM recipes r
JOIN recipe_ingredients ri ON r.id = ri.recipe_id
WHERE ri.ingredient_id IN (chicken_uuid, pepper_uuid);
```

### Example 3: Ingredient Autocomplete
```sql
-- Search ingredients for "chick"
SELECT id, name FROM ingredients 
WHERE LOWER(name) LIKE '%chick%' 
ORDER BY usage_count DESC;
```

## Current Issues to Fix

### 1. **Seed Data Mismatch**
The current seed script has column name mismatches:
- Uses `quantity` but schema has `amount`
- Uses `preparation` but schema has `notes`  
- Uses `optional` but schema has `is_optional`

### 2. **API Inconsistency**
- Backend expects ingredient UUIDs
- Frontend was sending ingredient names
- Need alignment on search approach

### 3. **Missing Ingredients Population**
- Seed script creates ingredients but might not populate master `ingredients` table properly
- Recipe search fails because ingredient UUIDs don't exist

## Recommended Actions

### 1. **Fix Seed Data**
- Update column names to match schema
- Ensure ingredients are properly inserted into master table
- Create proper recipe-ingredient relationships

### 2. **Clear Search Strategy**
- **Ingredient Search**: Look up ingredient IDs from names, then search recipes by IDs
- **Text Search**: Search recipe titles/descriptions directly
- **Hybrid**: Support both approaches

### 3. **Database Reset**
- Drop and recreate database with correct schema
- Run corrected seed script
- Verify all relationships work

This normalized model provides a solid foundation for a scalable recipe application with rich ingredient data and powerful search capabilities.