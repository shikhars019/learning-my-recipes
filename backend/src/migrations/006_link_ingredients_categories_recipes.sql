-- Migration: Link Ingredients and Categories with Recipes
-- Description: Update recipe-ingredient relationships and add foreign key constraints
-- Date: 2024-01-20
-- Version: 006

-- First, let's add a foreign key reference from recipes to categories
-- Check if category_id column exists in recipes table, if not add it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recipes' AND column_name = 'category_id') THEN
        ALTER TABLE recipes ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_recipes_category_id ON recipes(category_id);
    END IF;
END $$;

-- Update the existing recipe_ingredients table to reference our ingredients table
-- If it exists, we'll modify it; if not, we'll create it
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
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_name ON recipe_ingredients(ingredient_name);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_display_order ON recipe_ingredients(recipe_id, display_order);

-- Add constraints
ALTER TABLE recipe_ingredients 
ADD CONSTRAINT chk_recipe_ingredients_amount_positive 
CHECK (amount IS NULL OR amount > 0);

ALTER TABLE recipe_ingredients 
ADD CONSTRAINT chk_recipe_ingredients_name_not_empty 
CHECK (LENGTH(TRIM(ingredient_name)) > 0);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_recipe_ingredients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recipe_ingredients_updated_at ON recipe_ingredients;
CREATE TRIGGER trg_recipe_ingredients_updated_at
    BEFORE UPDATE ON recipe_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION update_recipe_ingredients_updated_at();

-- Function to automatically match ingredient names to ingredient IDs
CREATE OR REPLACE FUNCTION match_ingredient_by_name()
RETURNS TRIGGER AS $$
BEGIN
    -- If ingredient_id is not provided, try to find matching ingredient
    IF NEW.ingredient_id IS NULL AND NEW.ingredient_name IS NOT NULL THEN
        SELECT id INTO NEW.ingredient_id
        FROM ingredients 
        WHERE normalize_ingredient_name(name) = normalize_ingredient_name(NEW.ingredient_name)
          AND is_active = true
        ORDER BY usage_count DESC
        LIMIT 1;
    END IF;
    
    -- If ingredient_id is provided, get the canonical name
    IF NEW.ingredient_id IS NOT NULL THEN
        SELECT name INTO NEW.ingredient_name
        FROM ingredients 
        WHERE id = NEW.ingredient_id AND is_active = true;
        
        -- Track usage of the ingredient
        PERFORM track_ingredient_usage(NEW.ingredient_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for ingredient matching
DROP TRIGGER IF EXISTS trg_recipe_ingredients_match_ingredient ON recipe_ingredients;
CREATE TRIGGER trg_recipe_ingredients_match_ingredient
    BEFORE INSERT OR UPDATE ON recipe_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION match_ingredient_by_name();

-- Create function to sync recipe ingredient counts
CREATE OR REPLACE FUNCTION update_recipe_ingredient_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update ingredient count in recipes table
    UPDATE recipes 
    SET ingredient_count = (
        SELECT COUNT(*) 
        FROM recipe_ingredients 
        WHERE recipe_id = COALESCE(NEW.recipe_id, OLD.recipe_id)
    )
    WHERE id = COALESCE(NEW.recipe_id, OLD.recipe_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for recipe ingredient count
DROP TRIGGER IF EXISTS trg_update_recipe_ingredient_count ON recipe_ingredients;
CREATE TRIGGER trg_update_recipe_ingredient_count
    AFTER INSERT OR UPDATE OR DELETE ON recipe_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION update_recipe_ingredient_count();

-- Add ingredient_count column to recipes if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recipes' AND column_name = 'ingredient_count') THEN
        ALTER TABLE recipes ADD COLUMN ingredient_count INTEGER DEFAULT 0;
        CREATE INDEX IF NOT EXISTS idx_recipes_ingredient_count ON recipes(ingredient_count);
        
        -- Update existing recipes with ingredient counts
        UPDATE recipes SET ingredient_count = (
            SELECT COUNT(*) 
            FROM recipe_ingredients ri 
            WHERE ri.recipe_id = recipes.id
        );
    END IF;
END $$;

-- Create view for recipe-ingredient details
CREATE OR REPLACE VIEW recipe_ingredient_details AS
SELECT 
    ri.id,
    ri.recipe_id,
    ri.ingredient_id,
    ri.ingredient_name,
    ri.amount,
    ri.unit,
    ri.notes,
    ri.is_optional,
    ri.display_order,
    -- Ingredient details (if linked)
    i.category as ingredient_category,
    i.allergens,
    i.nutritional_info,
    i.is_organic,
    i.is_perishable,
    i.tags as ingredient_tags,
    -- Recipe details
    r.title as recipe_title,
    r.category_id as recipe_category_id,
    ri.created_at,
    ri.updated_at
FROM recipe_ingredients ri
LEFT JOIN ingredients i ON ri.ingredient_id = i.id
LEFT JOIN recipes r ON ri.recipe_id = r.id;

-- Create function to get recipe allergens based on ingredients
CREATE OR REPLACE FUNCTION get_recipe_allergens(recipe_uuid UUID)
RETURNS ingredient_allergen[] AS $$
DECLARE
    recipe_allergens ingredient_allergen[];
BEGIN
    SELECT array_agg(DISTINCT allergen)
    INTO recipe_allergens
    FROM (
        SELECT unnest(i.allergens) as allergen
        FROM recipe_ingredients ri
        JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = recipe_uuid
          AND i.is_active = true
    ) allergen_list;
    
    RETURN COALESCE(recipe_allergens, '{}');
END;
$$ LANGUAGE plpgsql;

-- Create function to get recipe nutritional summary
CREATE OR REPLACE FUNCTION get_recipe_nutrition_summary(recipe_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    nutrition_summary JSONB;
BEGIN
    SELECT jsonb_object_agg(
        nutrient_key,
        ROUND(nutrient_total::numeric, 2)
    )
    INTO nutrition_summary
    FROM (
        SELECT 
            nutrient.key as nutrient_key,
            SUM(
                (nutrient.value::numeric) * 
                COALESCE(ri.amount, 0) / 100.0 -- Convert per 100g to actual amount
            ) as nutrient_total
        FROM recipe_ingredients ri
        JOIN ingredients i ON ri.ingredient_id = i.id
        CROSS JOIN LATERAL jsonb_each(i.nutritional_info) as nutrient
        WHERE ri.recipe_id = recipe_uuid
          AND i.is_active = true
          AND ri.amount IS NOT NULL
          AND nutrient.value IS NOT NULL
        GROUP BY nutrient.key
    ) nutrition_data;
    
    RETURN COALESCE(nutrition_summary, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Create function to find recipes by ingredient
CREATE OR REPLACE FUNCTION find_recipes_by_ingredient(
    ingredient_name_search TEXT,
    include_inactive_recipes BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
    recipe_id UUID,
    recipe_title VARCHAR,
    recipe_category_id UUID,
    ingredient_id UUID,
    ingredient_name VARCHAR,
    amount DECIMAL,
    unit VARCHAR,
    match_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ri.recipe_id,
        r.title as recipe_title,
        r.category_id as recipe_category_id,
        ri.ingredient_id,
        ri.ingredient_name,
        ri.amount,
        ri.unit,
        CASE 
            WHEN ri.ingredient_name ILIKE ingredient_name_search THEN 'exact'
            WHEN ri.ingredient_name ILIKE ingredient_name_search || '%' THEN 'prefix'
            WHEN ri.ingredient_name ILIKE '%' || ingredient_name_search || '%' THEN 'contains'
            ELSE 'fuzzy'
        END as match_type
    FROM recipe_ingredients ri
    JOIN recipes r ON ri.recipe_id = r.id
    WHERE 
        (include_inactive_recipes = TRUE OR r.is_active = TRUE)
        AND (
            ri.ingredient_name ILIKE '%' || ingredient_name_search || '%'
            OR EXISTS (
                SELECT 1 FROM ingredients i 
                WHERE i.id = ri.ingredient_id 
                  AND i.name ILIKE '%' || ingredient_name_search || '%'
            )
        )
    ORDER BY 
        CASE 
            WHEN ri.ingredient_name ILIKE ingredient_name_search THEN 1
            WHEN ri.ingredient_name ILIKE ingredient_name_search || '%' THEN 2
            WHEN ri.ingredient_name ILIKE '%' || ingredient_name_search || '%' THEN 3
            ELSE 4
        END,
        r.title;
END;
$$ LANGUAGE plpgsql;

-- Create function to suggest ingredient substitutions
CREATE OR REPLACE FUNCTION suggest_ingredient_substitutions(
    ingredient_uuid UUID,
    limit_count INTEGER DEFAULT 5
)
RETURNS TABLE(
    substitute_id UUID,
    substitute_name VARCHAR,
    substitute_category VARCHAR,
    similarity_score REAL,
    common_allergens ingredient_allergen[],
    substitution_notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH target_ingredient AS (
        SELECT name, category, allergens, tags
        FROM ingredients 
        WHERE id = ingredient_uuid AND is_active = true
    )
    SELECT 
        i.id as substitute_id,
        i.name as substitute_name,
        i.category as substitute_category,
        (
            -- Category match bonus
            CASE WHEN i.category = ti.category THEN 40.0 ELSE 0.0 END +
            -- Tag overlap bonus (max 30 points)
            LEAST(30.0, cardinality(i.tags & ti.tags) * 10.0) +
            -- Allergen overlap penalty (subtract points for conflicting allergens)
            GREATEST(0.0, 30.0 - cardinality(i.allergens & ti.allergens) * 5.0)
        )::REAL as similarity_score,
        (i.allergens & ti.allergens) as common_allergens,
        CASE 
            WHEN i.category = ti.category THEN 'Same category substitution'
            WHEN i.tags && ti.tags THEN 'Similar characteristics'
            ELSE 'Alternative option'
        END as substitution_notes
    FROM ingredients i, target_ingredient ti
    WHERE i.is_active = true 
      AND i.id != ingredient_uuid
      AND (
          i.category = ti.category 
          OR i.tags && ti.tags
          OR similarity(i.name, ti.name) > 0.3
      )
    ORDER BY similarity_score DESC, i.usage_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for recipe search optimization
CREATE MATERIALIZED VIEW IF NOT EXISTS recipe_search_index AS
SELECT 
    r.id as recipe_id,
    r.title,
    r.description,
    r.category_id,
    array_agg(DISTINCT ri.ingredient_name ORDER BY ri.ingredient_name) as ingredient_names,
    array_agg(DISTINCT i.category ORDER BY i.category) FILTER (WHERE i.category IS NOT NULL) as ingredient_categories,
    array_agg(DISTINCT unnest(i.allergens)) FILTER (WHERE i.allergens IS NOT NULL) as all_allergens,
    array_agg(DISTINCT unnest(i.tags)) FILTER (WHERE i.tags IS NOT NULL) as all_ingredient_tags,
    COUNT(ri.id) as ingredient_count,
    r.prep_time_minutes,
    r.cook_time_minutes,
    r.servings,
    r.difficulty_level,
    r.is_active,
    r.created_at,
    r.updated_at
FROM recipes r
LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
LEFT JOIN ingredients i ON ri.ingredient_id = i.id
WHERE r.is_active = true
GROUP BY r.id, r.title, r.description, r.category_id, r.prep_time_minutes, 
         r.cook_time_minutes, r.servings, r.difficulty_level, r.is_active, 
         r.created_at, r.updated_at;

-- Create indexes on materialized view
CREATE INDEX IF NOT EXISTS idx_recipe_search_category ON recipe_search_index(category_id);
CREATE INDEX IF NOT EXISTS idx_recipe_search_ingredients_gin ON recipe_search_index USING gin(ingredient_names);
CREATE INDEX IF NOT EXISTS idx_recipe_search_allergens_gin ON recipe_search_index USING gin(all_allergens);
CREATE INDEX IF NOT EXISTS idx_recipe_search_tags_gin ON recipe_search_index USING gin(all_ingredient_tags);
CREATE INDEX IF NOT EXISTS idx_recipe_search_text ON recipe_search_index 
    USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || array_to_string(ingredient_names, ' ')));

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_recipe_search_index()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW recipe_search_index;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh search index when recipes or ingredients change
CREATE OR REPLACE FUNCTION schedule_recipe_search_refresh()
RETURNS TRIGGER AS $$
BEGIN
    -- In a production environment, you might queue this for background processing
    -- For now, we'll refresh immediately (consider using pg_notify for async processing)
    PERFORM refresh_recipe_search_index();
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Note: These triggers can be expensive for high-volume inserts
-- Consider disabling them during bulk operations and manually refreshing
DROP TRIGGER IF EXISTS trg_refresh_recipe_search_recipes ON recipes;
CREATE TRIGGER trg_refresh_recipe_search_recipes
    AFTER INSERT OR UPDATE OR DELETE ON recipes
    FOR EACH STATEMENT
    EXECUTE FUNCTION schedule_recipe_search_refresh();

DROP TRIGGER IF EXISTS trg_refresh_recipe_search_ingredients ON recipe_ingredients;
CREATE TRIGGER trg_refresh_recipe_search_ingredients
    AFTER INSERT OR UPDATE OR DELETE ON recipe_ingredients
    FOR EACH STATEMENT
    EXECUTE FUNCTION schedule_recipe_search_refresh();

-- Initial refresh of the materialized view
SELECT refresh_recipe_search_index();

-- Grant permissions (adjust as needed for your user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON recipe_ingredients TO your_app_user;
-- GRANT SELECT ON recipe_ingredient_details TO your_app_user;
-- GRANT SELECT ON recipe_search_index TO your_app_user;

COMMENT ON TABLE recipe_ingredients IS 'Junction table linking recipes to ingredients with amounts and preparation notes';
COMMENT ON COLUMN recipe_ingredients.ingredient_id IS 'Foreign key to ingredients table, nullable for flexibility';
COMMENT ON COLUMN recipe_ingredients.ingredient_name IS 'Ingredient name stored directly for cases where ingredient_id is not available';
COMMENT ON COLUMN recipe_ingredients.display_order IS 'Order in which ingredients should be displayed in the recipe';
COMMENT ON FUNCTION get_recipe_allergens(UUID) IS 'Returns array of all allergens present in a recipe based on its ingredients';
COMMENT ON FUNCTION get_recipe_nutrition_summary(UUID) IS 'Calculates total nutritional values for a recipe based on ingredient amounts';
COMMENT ON FUNCTION find_recipes_by_ingredient(TEXT, BOOLEAN) IS 'Finds recipes containing a specific ingredient name';
COMMENT ON FUNCTION suggest_ingredient_substitutions(UUID, INTEGER) IS 'Suggests alternative ingredients based on category, tags, and characteristics';
COMMENT ON MATERIALIZED VIEW recipe_search_index IS 'Optimized search index for recipe queries including ingredient information';