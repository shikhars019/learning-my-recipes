-- Learning My Recipes Database Schema - Minimal Version
-- PostgreSQL Schema for Recipe Management System
-- Contains only tables actually used by the application

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables in correct order (reverse dependency order)
DROP TABLE IF EXISTS recipe_versions CASCADE;
DROP TABLE IF EXISTS recipe_ingredients CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- Create the main categories table
-- Categories are used to organize ingredients and recipes
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 0 NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure slug is URL-friendly
    CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
    -- Prevent self-referencing and deep nesting
    CONSTRAINT categories_no_self_reference CHECK (id != parent_id),
    CONSTRAINT categories_max_level CHECK (level <= 5)
);

-- Create the ingredients table
-- Stores all ingredients with nutritional information
CREATE TABLE ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    common_unit VARCHAR(50),
    nutrition_data JSONB,
    allergen_info TEXT[],
    storage_tips TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure normalized name is lowercase and trimmed
    CONSTRAINT ingredients_normalized_name_format CHECK (normalized_name = lower(trim(normalized_name))),
    -- Validate nutrition data structure if present
    CONSTRAINT ingredients_nutrition_valid CHECK (
        nutrition_data IS NULL OR (
            (nutrition_data ? 'calories' OR nutrition_data ? 'calories_per_100g') AND 
            CASE 
                WHEN nutrition_data ? 'calories' THEN (nutrition_data->>'calories')::numeric >= 0
                WHEN nutrition_data ? 'calories_per_100g' THEN (nutrition_data->>'calories_per_100g')::numeric >= 0
                ELSE true
            END
        )
    )
);

-- Create the recipes table  
-- Main recipe information and instructions (stored as JSONB)
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions JSONB NOT NULL,
    prep_time INTEGER, -- minutes
    cook_time INTEGER, -- minutes
    total_time INTEGER GENERATED ALWAYS AS (COALESCE(prep_time, 0) + COALESCE(cook_time, 0)) STORED,
    servings INTEGER DEFAULT 4,
    difficulty_level VARCHAR(20) DEFAULT 'medium',
    category_id UUID REFERENCES categories(id),
    cuisine_type VARCHAR(100),
    dietary_tags TEXT[],
    image_url TEXT,
    source_url TEXT,
    is_public BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Validate time constraints
    CONSTRAINT recipes_prep_time_positive CHECK (prep_time IS NULL OR prep_time >= 0),
    CONSTRAINT recipes_cook_time_positive CHECK (cook_time IS NULL OR cook_time >= 0),
    CONSTRAINT recipes_servings_positive CHECK (servings > 0),
    -- Validate difficulty level
    CONSTRAINT recipes_difficulty_valid CHECK (
        difficulty_level IN ('easy', 'medium', 'hard', 'expert')
    ),
    -- Validate instructions structure
    CONSTRAINT recipes_instructions_valid CHECK (
        jsonb_typeof(instructions) = 'array' AND
        jsonb_array_length(instructions) > 0
    )
);

-- Create the recipe_ingredients junction table
-- Links recipes to ingredients with quantities
CREATE TABLE recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity DECIMAL(10,3),
    unit VARCHAR(50),
    preparation_notes TEXT,
    is_optional BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure positive quantity
    CONSTRAINT recipe_ingredients_quantity_positive CHECK (quantity IS NULL OR quantity > 0),
    -- Unique ingredient per recipe (prevent duplicates)
    CONSTRAINT recipe_ingredients_unique UNIQUE (recipe_id, ingredient_id)
);

-- Create recipe_versions table (referenced by Recipe.js model but missing from original schema)
-- Stores version history for recipes
CREATE TABLE recipe_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions JSONB NOT NULL,
    prep_time INTEGER,
    cook_time INTEGER,
    servings INTEGER,
    difficulty_level VARCHAR(20),
    change_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Validate version number
    CONSTRAINT recipe_versions_version_positive CHECK (version_number > 0),
    -- Unique version per recipe
    CONSTRAINT recipe_versions_unique UNIQUE (recipe_id, version_number),
    -- Validate time constraints
    CONSTRAINT recipe_versions_prep_time_positive CHECK (prep_time IS NULL OR prep_time >= 0),
    CONSTRAINT recipe_versions_cook_time_positive CHECK (cook_time IS NULL OR cook_time >= 0),
    CONSTRAINT recipe_versions_servings_positive CHECK (servings IS NULL OR servings > 0)
);

-- Create indexes for better query performance

-- Categories indexes
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active);

-- Ingredients indexes
CREATE INDEX idx_ingredients_normalized_name ON ingredients(normalized_name);
CREATE INDEX idx_ingredients_category ON ingredients(category);
CREATE INDEX idx_ingredients_active ON ingredients(is_active);
CREATE INDEX idx_ingredients_name_search ON ingredients USING gin(to_tsvector('english', name));

-- Recipes indexes
CREATE INDEX idx_recipes_category_id ON recipes(category_id);
CREATE INDEX idx_recipes_difficulty ON recipes(difficulty_level);
CREATE INDEX idx_recipes_cuisine ON recipes(cuisine_type);
CREATE INDEX idx_recipes_active ON recipes(is_active);
CREATE INDEX idx_recipes_public ON recipes(is_public);
CREATE INDEX idx_recipes_total_time ON recipes(total_time);
CREATE INDEX idx_recipes_title_search ON recipes USING gin(to_tsvector('english', title));
CREATE INDEX idx_recipes_description_search ON recipes USING gin(to_tsvector('english', description));
CREATE INDEX idx_recipes_dietary_tags ON recipes USING gin(dietary_tags);

-- Recipe ingredients indexes
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);
CREATE INDEX idx_recipe_ingredients_sort_order ON recipe_ingredients(recipe_id, sort_order);

-- Recipe versions indexes
CREATE INDEX idx_recipe_versions_recipe_id ON recipe_versions(recipe_id);
CREATE INDEX idx_recipe_versions_version_number ON recipe_versions(recipe_id, version_number);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON ingredients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments about what was removed from the original schema:
-- ❌ Removed: users table - No authentication system implemented
-- ❌ Removed: user_favorites table - No favorites functionality implemented  
-- ❌ Removed: reviews table - No review system implemented
-- ❌ Removed: recipe_instructions table - Instructions stored as JSONB in recipes table
-- ✅ Added: recipe_versions table - Referenced by Recipe.js model but was missing