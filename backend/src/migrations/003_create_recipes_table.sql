-- Migration: Create Recipes Table
-- Description: Create recipes table with comprehensive recipe management features
-- Date: 2024-01-20
-- Version: 003

CREATE TABLE IF NOT EXISTS recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    instructions JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of instruction steps
    prep_time INTEGER, -- Preparation time in minutes
    cook_time INTEGER, -- Cooking time in minutes
    total_time INTEGER GENERATED ALWAYS AS (prep_time + cook_time) STORED,
    servings INTEGER,
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    cuisine VARCHAR(50),
    image_url TEXT,
    video_url TEXT,
    source VARCHAR(100), -- Where the recipe came from
    source_url TEXT, -- URL of original recipe if applicable
    
    -- Nutritional information
    nutritional_info JSONB DEFAULT '{}'::jsonb,
    
    -- Dietary and preference tags
    dietary_tags TEXT[] DEFAULT '{}', -- Array of dietary restrictions/preferences
    
    -- Recipe metadata
    is_public BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    rating_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    
    -- User relationship
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title);
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON recipes(cuisine);
CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX IF NOT EXISTS idx_recipes_prep_time ON recipes(prep_time);
CREATE INDEX IF NOT EXISTS idx_recipes_cook_time ON recipes(cook_time);
CREATE INDEX IF NOT EXISTS idx_recipes_servings ON recipes(servings);
CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON recipes(is_public);
CREATE INDEX IF NOT EXISTS idx_recipes_is_featured ON recipes(is_featured);
CREATE INDEX IF NOT EXISTS idx_recipes_rating ON recipes(rating);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_recipes_search ON recipes USING gin(
    (setweight(to_tsvector('english', title), 'A') ||
     setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
     setweight(to_tsvector('english', coalesce(cuisine, '')), 'C'))
);

-- Index on dietary tags array
CREATE INDEX IF NOT EXISTS idx_recipes_dietary_tags ON recipes USING gin(dietary_tags);

-- Create trigger for updating updated_at
DROP TRIGGER IF EXISTS update_recipes_updated_at ON recipes;
CREATE TRIGGER update_recipes_updated_at
    BEFORE UPDATE ON recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();