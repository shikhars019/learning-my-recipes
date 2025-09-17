-- Learning My Recipes Database Schema
-- PostgreSQL Schema with all tables, relationships, and indexes

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables in correct order (reverse dependency order)
DROP TABLE IF EXISTS user_favorites CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS recipe_instructions CASCADE;
DROP TABLE IF EXISTS recipe_ingredients CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- Categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    profile_image_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Ingredients table
CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    category VARCHAR(100),
    common_unit VARCHAR(50),
    nutrition_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Recipes table
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    prep_time INTEGER, -- in minutes
    cook_time INTEGER, -- in minutes
    total_time INTEGER, -- in minutes
    servings INTEGER DEFAULT 1,
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT,
    instructions TEXT[], -- Array of instruction steps
    tips TEXT,
    nutrition_info JSONB,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    ai_prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_times CHECK (prep_time >= 0 AND cook_time >= 0 AND total_time >= 0),
    CONSTRAINT valid_servings CHECK (servings > 0)
);

-- Recipe ingredients junction table
CREATE TABLE recipe_ingredients (
    id SERIAL PRIMARY KEY,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity DECIMAL(10,3),
    unit VARCHAR(50),
    preparation VARCHAR(100), -- e.g., "chopped", "diced", "minced"
    optional BOOLEAN DEFAULT FALSE,
    substitute_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(recipe_id, ingredient_id)
);

-- Recipe instructions table (alternative to array for better querying)
CREATE TABLE recipe_instructions (
    id SERIAL PRIMARY KEY,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    instruction TEXT NOT NULL,
    duration_minutes INTEGER, -- time for this specific step
    temperature INTEGER, -- cooking temperature if applicable
    equipment VARCHAR(200), -- required equipment for this step
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(recipe_id, step_number),
    CONSTRAINT valid_step_number CHECK (step_number > 0),
    CONSTRAINT valid_duration CHECK (duration_minutes IS NULL OR duration_minutes >= 0)
);

-- Reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,
    helpful_votes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(recipe_id, user_id) -- One review per user per recipe
);

-- User favorites table
CREATE TABLE user_favorites (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, recipe_id)
);

-- Indexes for performance optimization

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Ingredients table indexes
CREATE INDEX idx_ingredients_name ON ingredients(name);
CREATE INDEX idx_ingredients_category ON ingredients(category);

-- Recipes table indexes
CREATE INDEX idx_recipes_title ON recipes(title);
CREATE INDEX idx_recipes_category_id ON recipes(category_id);
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX idx_recipes_prep_time ON recipes(prep_time);
CREATE INDEX idx_recipes_cook_time ON recipes(cook_time);
CREATE INDEX idx_recipes_total_time ON recipes(total_time);
CREATE INDEX idx_recipes_servings ON recipes(servings);
CREATE INDEX idx_recipes_created_at ON recipes(created_at);
CREATE INDEX idx_recipes_is_ai_generated ON recipes(is_ai_generated);

-- Recipe ingredients table indexes
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);

-- Recipe instructions table indexes
CREATE INDEX idx_recipe_instructions_recipe_id ON recipe_instructions(recipe_id);
CREATE INDEX idx_recipe_instructions_step_number ON recipe_instructions(recipe_id, step_number);

-- Reviews table indexes
CREATE INDEX idx_reviews_recipe_id ON reviews(recipe_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);

-- User favorites table indexes
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_recipe_id ON user_favorites(recipe_id);

-- Full-text search indexes for better search performance
CREATE INDEX idx_recipes_title_fulltext ON recipes USING gin(to_tsvector('english', title));
CREATE INDEX idx_recipes_description_fulltext ON recipes USING gin(to_tsvector('english', description));
CREATE INDEX idx_ingredients_name_fulltext ON ingredients USING gin(to_tsvector('english', name));

-- Composite indexes for common queries
CREATE INDEX idx_recipes_category_created ON recipes(category_id, created_at DESC);
CREATE INDEX idx_recipes_user_created ON recipes(user_id, created_at DESC);
CREATE INDEX idx_reviews_recipe_rating ON reviews(recipe_id, rating DESC);

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to relevant tables
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON ingredients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO categories (name, description) VALUES
    ('Breakfast', 'Morning meals and breakfast dishes'),
    ('Lunch', 'Midday meals and light dishes'),
    ('Dinner', 'Evening meals and main courses'),
    ('Dessert', 'Sweet treats and desserts'),
    ('Appetizer', 'Starters and small plates'),
    ('Snack', 'Quick bites and snacks'),
    ('Beverage', 'Drinks and beverages'),
    ('Vegetarian', 'Plant-based dishes'),
    ('Vegan', 'Completely plant-based dishes'),
    ('Gluten-Free', 'Dishes without gluten'),
    ('Low-Carb', 'Low carbohydrate dishes'),
    ('Healthy', 'Nutritious and health-focused dishes');

-- Insert sample ingredients for testing
INSERT INTO ingredients (name, category, common_unit, nutrition_data) VALUES
    ('Flour', 'Baking', 'cup', '{"calories": 455, "protein": 13, "carbs": 95, "fat": 1.2}'),
    ('Sugar', 'Baking', 'cup', '{"calories": 774, "protein": 0, "carbs": 200, "fat": 0}'),
    ('Eggs', 'Dairy', 'piece', '{"calories": 70, "protein": 6, "carbs": 0.6, "fat": 5}'),
    ('Milk', 'Dairy', 'cup', '{"calories": 150, "protein": 8, "carbs": 12, "fat": 8}'),
    ('Butter', 'Dairy', 'tablespoon', '{"calories": 102, "protein": 0.1, "carbs": 0, "fat": 11.5}'),
    ('Salt', 'Seasoning', 'teaspoon', '{"calories": 0, "protein": 0, "carbs": 0, "fat": 0}'),
    ('Black Pepper', 'Seasoning', 'teaspoon', '{"calories": 5, "protein": 0.2, "carbs": 1.4, "fat": 0.1}'),
    ('Olive Oil', 'Oil', 'tablespoon', '{"calories": 119, "protein": 0, "carbs": 0, "fat": 13.5}'),
    ('Onion', 'Vegetable', 'piece', '{"calories": 44, "protein": 1.2, "carbs": 10.3, "fat": 0.1}'),
    ('Garlic', 'Vegetable', 'clove', '{"calories": 4, "protein": 0.2, "carbs": 1, "fat": 0}'),
    ('Tomato', 'Vegetable', 'piece', '{"calories": 22, "protein": 1.1, "carbs": 4.8, "fat": 0.2}'),
    ('Chicken Breast', 'Meat', 'pound', '{"calories": 735, "protein": 138, "carbs": 0, "fat": 16}'),
    ('Ground Beef', 'Meat', 'pound', '{"calories": 1152, "protein": 96, "carbs": 0, "fat": 80}'),
    ('Rice', 'Grain', 'cup', '{"calories": 716, "protein": 14.7, "carbs": 148, "fat": 1.1}'),
    ('Pasta', 'Grain', 'cup', '{"calories": 220, "protein": 8, "carbs": 44, "fat": 1.1}');

COMMENT ON DATABASE "learning_my_recipes" IS 'Database for Learning My Recipes application - Educational full-stack project';
COMMENT ON TABLE categories IS 'Recipe categories for organization';
COMMENT ON TABLE users IS 'User accounts and profiles';
COMMENT ON TABLE ingredients IS 'Master list of ingredients with nutritional data';
COMMENT ON TABLE recipes IS 'Recipe records with metadata and instructions';
COMMENT ON TABLE recipe_ingredients IS 'Junction table linking recipes to ingredients with quantities';
COMMENT ON TABLE recipe_instructions IS 'Step-by-step recipe instructions';
COMMENT ON TABLE reviews IS 'User reviews and ratings for recipes';
COMMENT ON TABLE user_favorites IS 'User favorite recipes tracking';