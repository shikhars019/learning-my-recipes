-- Migration: Create Ingredients Table
-- Description: Create ingredients table with advanced features for normalization, categorization, and nutrition data
-- Date: 2024-01-20
-- Version: 005

-- Create custom types for ingredients
CREATE TYPE ingredient_season AS ENUM ('spring', 'summer', 'autumn', 'winter');
CREATE TYPE ingredient_allergen AS ENUM (
    'gluten', 'dairy', 'eggs', 'fish', 'shellfish', 'tree_nuts', 
    'peanuts', 'wheat', 'soy', 'sesame', 'mustard', 'celery', 
    'lupin', 'molluscs', 'sulfites'
);

-- Create ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(100) NOT NULL, -- Computed normalized version for duplicate detection
    category VARCHAR(50),
    description TEXT,
    
    -- Nutritional information (per 100g)
    nutritional_info JSONB DEFAULT '{}'::jsonb,
    
    -- Allergen information
    allergens ingredient_allergen[] DEFAULT '{}',
    
    -- Storage and usage
    storage_tips VARCHAR(300),
    season ingredient_season[] DEFAULT '{}',
    is_organic BOOLEAN DEFAULT false,
    is_perishable BOOLEAN DEFAULT true,
    shelf_life_days INTEGER,
    
    -- Tagging and categorization
    tags TEXT[] DEFAULT '{}',
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Status and metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for ingredients
CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
CREATE INDEX IF NOT EXISTS idx_ingredients_normalized_name ON ingredients(normalized_name);
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);
CREATE INDEX IF NOT EXISTS idx_ingredients_is_active ON ingredients(is_active);
CREATE INDEX IF NOT EXISTS idx_ingredients_usage_count ON ingredients(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_ingredients_last_used ON ingredients(last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingredients_created_at ON ingredients(created_at);

-- Create text search index for name and description
CREATE INDEX IF NOT EXISTS idx_ingredients_text_search ON ingredients 
USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Create JSONB index for nutritional info searches
CREATE INDEX IF NOT EXISTS idx_ingredients_nutrition_gin ON ingredients USING gin(nutritional_info);

-- Create GIN indexes for arrays
CREATE INDEX IF NOT EXISTS idx_ingredients_allergens_gin ON ingredients USING gin(allergens);
CREATE INDEX IF NOT EXISTS idx_ingredients_season_gin ON ingredients USING gin(season);
CREATE INDEX IF NOT EXISTS idx_ingredients_tags_gin ON ingredients USING gin(tags);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ingredients_active_category ON ingredients(category, is_active);
CREATE INDEX IF NOT EXISTS idx_ingredients_active_name ON ingredients(name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ingredients_active_normalized ON ingredients(normalized_name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ingredients_usage_active ON ingredients(usage_count DESC, is_active) WHERE is_active = true;

-- Create partial indexes for specific queries
CREATE INDEX IF NOT EXISTS idx_ingredients_organic ON ingredients(is_organic) WHERE is_organic = true;
CREATE INDEX IF NOT EXISTS idx_ingredients_perishable ON ingredients(is_perishable) WHERE is_perishable = true;

-- Add constraints
ALTER TABLE ingredients 
ADD CONSTRAINT chk_ingredients_name_not_empty CHECK (LENGTH(TRIM(name)) > 0);

ALTER TABLE ingredients 
ADD CONSTRAINT chk_ingredients_normalized_name_not_empty CHECK (LENGTH(TRIM(normalized_name)) > 0);

ALTER TABLE ingredients 
ADD CONSTRAINT chk_ingredients_usage_count_positive CHECK (usage_count >= 0);

ALTER TABLE ingredients 
ADD CONSTRAINT chk_ingredients_shelf_life_positive CHECK (shelf_life_days IS NULL OR shelf_life_days >= 0);

ALTER TABLE ingredients 
ADD CONSTRAINT chk_ingredients_shelf_life_reasonable CHECK (shelf_life_days IS NULL OR shelf_life_days <= 3650);

-- Add unique constraint for active ingredients with same normalized name
CREATE UNIQUE INDEX idx_ingredients_unique_normalized_active 
ON ingredients(normalized_name) 
WHERE is_active = true;

-- Create function to normalize ingredient names
CREATE OR REPLACE FUNCTION normalize_ingredient_name(input_name TEXT)
RETURNS TEXT AS $$
BEGIN
    IF input_name IS NULL OR TRIM(input_name) = '' THEN
        RETURN '';
    END IF;
    
    RETURN LOWER(
        TRIM(
            -- Replace multiple spaces/special chars with single space
            regexp_replace(
                -- Remove special characters but keep spaces, hyphens, apostrophes
                regexp_replace(
                    input_name, 
                    '[^\w\s\-'']', 
                    ' ', 
                    'g'
                ), 
                '\s+', 
                ' ', 
                'g'
            )
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to update updated_at and normalized_name
CREATE OR REPLACE FUNCTION update_ingredients_metadata()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.normalized_name = normalize_ingredient_name(NEW.name);
    
    -- Validate nutritional info structure if provided
    IF NEW.nutritional_info IS NOT NULL AND NEW.nutritional_info != '{}'::jsonb THEN
        -- Check for valid numeric values in nutritional info
        IF EXISTS (
            SELECT 1 FROM jsonb_each(NEW.nutritional_info) 
            WHERE key IN (
                'calories_per_100g', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 
                'sugar_g', 'sodium_mg', 'potassium_mg', 'vitamin_c_mg', 'calcium_mg', 'iron_mg'
            ) 
            AND (
                jsonb_typeof(value) != 'number' 
                OR (value::numeric < 0) 
                OR (key LIKE '%_g' AND value::numeric > 100)
                OR (key = 'calories_per_100g' AND value::numeric > 10000)
                OR (key LIKE '%_mg' AND value::numeric > 50000)
            )
        ) THEN
            RAISE EXCEPTION 'Invalid nutritional information: values must be positive numbers within reasonable ranges';
        END IF;
    END IF;
    
    -- Validate tags array
    IF NEW.tags IS NOT NULL AND array_length(NEW.tags, 1) > 10 THEN
        RAISE EXCEPTION 'Maximum 10 tags allowed per ingredient';
    END IF;
    
    -- Clean tags array (remove empty and trim)
    IF NEW.tags IS NOT NULL THEN
        NEW.tags = array_remove(
            array_agg(DISTINCT TRIM(tag)) FILTER (WHERE TRIM(tag) != ''), 
            NULL
        )
        FROM unnest(NEW.tags) AS tag;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for metadata updates
DROP TRIGGER IF EXISTS trg_ingredients_update_metadata ON ingredients;
CREATE TRIGGER trg_ingredients_update_metadata
    BEFORE INSERT OR UPDATE ON ingredients
    FOR EACH ROW
    EXECUTE FUNCTION update_ingredients_metadata();

-- Create function to track ingredient usage
CREATE OR REPLACE FUNCTION track_ingredient_usage(ingredient_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE ingredients 
    SET 
        usage_count = usage_count + 1,
        last_used_at = NOW(),
        updated_at = NOW()
    WHERE id = ingredient_uuid AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ingredient not found or inactive: %', ingredient_uuid;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to search ingredients with advanced filtering
CREATE OR REPLACE FUNCTION search_ingredients(
    search_query TEXT DEFAULT NULL,
    category_filter TEXT DEFAULT NULL,
    allergen_filters ingredient_allergen[] DEFAULT NULL,
    season_filters ingredient_season[] DEFAULT NULL,
    is_organic_filter BOOLEAN DEFAULT NULL,
    is_perishable_filter BOOLEAN DEFAULT NULL,
    tag_filters TEXT[] DEFAULT NULL,
    include_inactive BOOLEAN DEFAULT FALSE,
    sort_by TEXT DEFAULT 'name',
    sort_order TEXT DEFAULT 'asc',
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    name VARCHAR,
    normalized_name VARCHAR,
    category VARCHAR,
    description TEXT,
    nutritional_info JSONB,
    allergens ingredient_allergen[],
    storage_tips VARCHAR,
    season ingredient_season[],
    is_organic BOOLEAN,
    is_perishable BOOLEAN,
    shelf_life_days INTEGER,
    tags TEXT[],
    usage_count INTEGER,
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    search_rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.name,
        i.normalized_name,
        i.category,
        i.description,
        i.nutritional_info,
        i.allergens,
        i.storage_tips,
        i.season,
        i.is_organic,
        i.is_perishable,
        i.shelf_life_days,
        i.tags,
        i.usage_count,
        i.last_used_at,
        i.is_active,
        i.created_at,
        i.updated_at,
        CASE 
            WHEN search_query IS NULL THEN 0.0
            ELSE ts_rank(to_tsvector('english', i.name || ' ' || COALESCE(i.description, '')), plainto_tsquery('english', search_query))
        END::REAL as search_rank
    FROM ingredients i
    WHERE 
        (include_inactive = TRUE OR i.is_active = TRUE)
        AND (search_query IS NULL OR (
            to_tsvector('english', i.name || ' ' || COALESCE(i.description, '')) @@ plainto_tsquery('english', search_query)
            OR i.name ILIKE '%' || search_query || '%'
            OR i.normalized_name LIKE '%' || normalize_ingredient_name(search_query) || '%'
        ))
        AND (category_filter IS NULL OR i.category = category_filter)
        AND (allergen_filters IS NULL OR allergen_filters && i.allergens)
        AND (season_filters IS NULL OR season_filters && i.season)
        AND (is_organic_filter IS NULL OR i.is_organic = is_organic_filter)
        AND (is_perishable_filter IS NULL OR i.is_perishable = is_perishable_filter)
        AND (tag_filters IS NULL OR tag_filters && i.tags)
    ORDER BY
        CASE 
            WHEN sort_by = 'name' AND sort_order = 'asc' THEN i.name
            WHEN sort_by = 'category' AND sort_order = 'asc' THEN i.category
        END ASC,
        CASE 
            WHEN sort_by = 'name' AND sort_order = 'desc' THEN i.name
            WHEN sort_by = 'category' AND sort_order = 'desc' THEN i.category
        END DESC,
        CASE 
            WHEN sort_by = 'created_at' AND sort_order = 'asc' THEN i.created_at
            WHEN sort_by = 'last_used' AND sort_order = 'asc' THEN i.last_used_at
        END ASC,
        CASE 
            WHEN sort_by = 'created_at' AND sort_order = 'desc' THEN i.created_at
            WHEN sort_by = 'last_used' AND sort_order = 'desc' THEN i.last_used_at
        END DESC,
        CASE 
            WHEN sort_by = 'usage_count' AND sort_order = 'asc' THEN i.usage_count
        END ASC,
        CASE 
            WHEN sort_by = 'usage_count' AND sort_order = 'desc' THEN i.usage_count
        END DESC,
        CASE 
            WHEN search_query IS NOT NULL THEN ts_rank(to_tsvector('english', i.name || ' ' || COALESCE(i.description, '')), plainto_tsquery('english', search_query))
        END DESC,
        i.name ASC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Create function for ingredient autocomplete
CREATE OR REPLACE FUNCTION autocomplete_ingredients(
    search_term TEXT,
    category_filter TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE(
    id UUID,
    name VARCHAR,
    category VARCHAR,
    usage_count INTEGER,
    match_type TEXT,
    relevance_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.name,
        i.category,
        i.usage_count,
        CASE 
            WHEN i.name ILIKE search_term || '%' THEN 'prefix'
            WHEN i.name ILIKE '%' || search_term || '%' THEN 'contains'
            ELSE 'fuzzy'
        END as match_type,
        (
            -- Exact prefix match gets highest score
            CASE WHEN i.name ILIKE search_term || '%' THEN 100.0 ELSE 0.0 END +
            -- Name contains search term
            CASE WHEN i.name ILIKE '%' || search_term || '%' THEN 50.0 ELSE 0.0 END +
            -- Normalize usage count to 0-20 range and add to score
            LEAST(20.0, i.usage_count::REAL / GREATEST(1, (SELECT MAX(usage_count) FROM ingredients WHERE is_active = true)::REAL) * 20.0) +
            -- Full text search relevance
            ts_rank(to_tsvector('english', i.name), plainto_tsquery('english', search_term)) * 30.0
        )::REAL as relevance_score
    FROM ingredients i
    WHERE 
        i.is_active = TRUE
        AND (
            i.name ILIKE '%' || search_term || '%'
            OR i.normalized_name LIKE '%' || normalize_ingredient_name(search_term) || '%'
            OR to_tsvector('english', i.name) @@ plainto_tsquery('english', search_term)
        )
        AND (category_filter IS NULL OR i.category = category_filter)
    ORDER BY relevance_score DESC, i.usage_count DESC, i.name ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create view for ingredient statistics
CREATE OR REPLACE VIEW ingredient_stats AS
SELECT 
    i.category,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE is_active = true) as active_count,
    COUNT(*) FILTER (WHERE is_organic = true) as organic_count,
    COUNT(*) FILTER (WHERE is_perishable = true) as perishable_count,
    AVG(usage_count) FILTER (WHERE is_active = true) as avg_usage_count,
    MAX(usage_count) as max_usage_count,
    COUNT(*) FILTER (WHERE last_used_at > NOW() - INTERVAL '30 days') as used_recently_count
FROM ingredients i
GROUP BY i.category
ORDER BY active_count DESC;

-- Create function to get ingredient categories with counts
CREATE OR REPLACE FUNCTION get_ingredient_categories()
RETURNS TABLE(
    category VARCHAR,
    count BIGINT,
    active_count BIGINT,
    most_used_ingredient VARCHAR,
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(i.category, 'Uncategorized') as category,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE i.is_active = true) as active_count,
        (
            SELECT i2.name 
            FROM ingredients i2 
            WHERE COALESCE(i2.category, 'Uncategorized') = COALESCE(i.category, 'Uncategorized') 
              AND i2.is_active = true
            ORDER BY i2.usage_count DESC, i2.name ASC 
            LIMIT 1
        ) as most_used_ingredient,
        MAX(i.updated_at) as last_updated
    FROM ingredients i
    GROUP BY COALESCE(i.category, 'Uncategorized')
    ORDER BY active_count DESC, category ASC;
END;
$$ LANGUAGE plpgsql;

-- Insert some common ingredients as examples
INSERT INTO ingredients (name, category, description, allergens, season, is_organic, tags) VALUES
    ('Tomato', 'Vegetables', 'Fresh red tomatoes, rich in lycopene and vitamin C', '{}', '{summer}', false, '{fresh, vegetable, vitamin-c}'),
    ('Chicken Breast', 'Meat & Poultry', 'Lean protein source, boneless and skinless', '{}', '{}', false, '{protein, lean, meat}'),
    ('Olive Oil', 'Oils & Vinegars', 'Extra virgin olive oil for cooking and dressings', '{}', '{}', true, '{healthy-fat, cooking, organic}'),
    ('Garlic', 'Herbs & Spices', 'Fresh garlic cloves for flavoring', '{}', '{summer, autumn}', false, '{aromatic, spice, flavor}'),
    ('Onion', 'Vegetables', 'Yellow cooking onions', '{}', '{autumn, winter}', false, '{vegetable, base, aromatic}'),
    ('Basil', 'Herbs & Spices', 'Fresh basil leaves', '{}', '{summer}', false, '{herb, fresh, aromatic}'),
    ('Mozzarella', 'Dairy & Eggs', 'Fresh mozzarella cheese', '{dairy}', '{}', false, '{cheese, dairy, protein}'),
    ('Flour', 'Pantry Staples', 'All-purpose wheat flour', '{gluten, wheat}', '{}', false, '{baking, staple, gluten}'),
    ('Eggs', 'Dairy & Eggs', 'Large chicken eggs', '{eggs}', '{}', false, '{protein, baking, breakfast}'),
    ('Salmon', 'Fish & Seafood', 'Fresh Atlantic salmon fillet', '{fish}', '{}', false, '{fish, omega-3, protein}')
ON CONFLICT DO NOTHING;

-- Grant permissions (adjust as needed for your user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ingredients TO your_app_user;
-- GRANT SELECT ON ingredient_stats TO your_app_user;
-- GRANT USAGE ON TYPE ingredient_season TO your_app_user;
-- GRANT USAGE ON TYPE ingredient_allergen TO your_app_user;

COMMENT ON TABLE ingredients IS 'Comprehensive ingredients catalog with normalization and advanced search capabilities';
COMMENT ON COLUMN ingredients.normalized_name IS 'Auto-generated normalized version of name for duplicate detection';
COMMENT ON COLUMN ingredients.nutritional_info IS 'JSONB containing nutritional values per 100g (calories_per_100g, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, potassium_mg, vitamin_c_mg, calcium_mg, iron_mg)';
COMMENT ON COLUMN ingredients.allergens IS 'Array of common allergens present in this ingredient';
COMMENT ON COLUMN ingredients.season IS 'Array of seasons when this ingredient is typically available';
COMMENT ON COLUMN ingredients.usage_count IS 'Number of times this ingredient has been used in recipes';
COMMENT ON COLUMN ingredients.last_used_at IS 'Timestamp when this ingredient was last used';
COMMENT ON FUNCTION normalize_ingredient_name(TEXT) IS 'Normalizes ingredient names for consistent duplicate detection';
COMMENT ON FUNCTION search_ingredients IS 'Advanced ingredient search with filtering and full-text search capabilities';
COMMENT ON FUNCTION autocomplete_ingredients IS 'Fast autocomplete search for ingredient names with relevance scoring';
COMMENT ON VIEW ingredient_stats IS 'Statistical summary of ingredients by category';