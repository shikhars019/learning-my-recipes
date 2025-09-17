-- Migration: Link Ingredients and Categories with Recipes (Simplified)
-- Description: Create basic relationship tables and foreign keys
-- Date: 2024-01-20
-- Version: 006

-- Add category_id column to recipes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recipes' AND column_name = 'category_id') THEN
        ALTER TABLE recipes ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_recipes_category_id ON recipes(category_id);
    END IF;
END $$;

-- Create recipe_ingredients table for many-to-many relationship
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
    ingredient_name VARCHAR(100) NOT NULL, -- Keep name for flexibility when ingredient_id is null
    amount DECIMAL(10,3),
    unit VARCHAR(50),
    notes TEXT,
    is_optional BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for recipe_ingredients
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_display_order ON recipe_ingredients(display_order);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_optional ON recipe_ingredients(is_optional);

-- Create trigger for recipe_ingredients updated_at
DROP TRIGGER IF EXISTS update_recipe_ingredients_updated_at ON recipe_ingredients;
CREATE TRIGGER update_recipe_ingredients_updated_at
    BEFORE UPDATE ON recipe_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create ingredient usage tracking table
CREATE TABLE IF NOT EXISTS ingredient_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    usage_type VARCHAR(20) DEFAULT 'recipe' CHECK (usage_type IN ('recipe', 'search', 'view')),
    used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for ingredient_usage
CREATE INDEX IF NOT EXISTS idx_ingredient_usage_ingredient_id ON ingredient_usage(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_usage_recipe_id ON ingredient_usage(recipe_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_usage_type ON ingredient_usage(usage_type);
CREATE INDEX IF NOT EXISTS idx_ingredient_usage_used_at ON ingredient_usage(used_at);

-- Add comments
COMMENT ON TABLE recipe_ingredients IS 'Many-to-many relationship between recipes and ingredients';
COMMENT ON TABLE ingredient_usage IS 'Tracks ingredient usage for analytics and recommendations';

-- Update the category_stats view to include recipe counts now that we have the foreign key
CREATE OR REPLACE VIEW category_stats AS
SELECT 
    c.id,
    c.name,
    c.slug,
    c.level,
    c.is_active,
    COUNT(DISTINCT r.id) as recipe_count,
    COUNT(DISTINCT i.id) as ingredient_count,
    (COUNT(DISTINCT r.id) + COUNT(DISTINCT i.id)) as total_usage,
    COUNT(DISTINCT child.id) as child_count,
    c.created_at,
    c.updated_at
FROM categories c
LEFT JOIN recipes r ON c.id = r.category_id AND r.is_public = true
LEFT JOIN ingredients i ON c.name = i.category AND i.is_active = true
LEFT JOIN categories child ON c.id = child.parent_id AND child.is_active = true
WHERE c.is_active = true
GROUP BY c.id, c.name, c.slug, c.level, c.is_active, c.created_at, c.updated_at;