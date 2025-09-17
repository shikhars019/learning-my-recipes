-- Migration: Create Categories Table
-- Description: Create categories table with hierarchical structure support
-- Date: 2024-01-20
-- Version: 004

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(60) NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    level INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    color VARCHAR(7), -- Hex color code like #FF0000
    icon VARCHAR(50), -- Icon name or CSS class
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for categories
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_level ON categories(level);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_name_active ON categories(name, is_active);
CREATE INDEX IF NOT EXISTS idx_categories_parent_level ON categories(parent_id, level);

-- Create composite index for hierarchical queries
CREATE INDEX IF NOT EXISTS idx_categories_hierarchy ON categories(parent_id, level, sort_order, is_active);

-- Create partial indexes for active categories
CREATE INDEX IF NOT EXISTS idx_categories_active_name ON categories(name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_categories_active_slug ON categories(slug) WHERE is_active = true;

-- Add constraints
ALTER TABLE categories 
ADD CONSTRAINT chk_categories_level_range CHECK (level >= 0 AND level <= 2);

ALTER TABLE categories 
ADD CONSTRAINT chk_categories_sort_order_positive CHECK (sort_order >= 0);

ALTER TABLE categories 
ADD CONSTRAINT chk_categories_name_not_empty CHECK (LENGTH(TRIM(name)) > 0);

ALTER TABLE categories 
ADD CONSTRAINT chk_categories_slug_format CHECK (slug ~ '^[a-z0-9-]+$');

ALTER TABLE categories 
ADD CONSTRAINT chk_categories_color_format CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$');

-- Prevent self-referencing parent
ALTER TABLE categories 
ADD CONSTRAINT chk_categories_no_self_parent CHECK (id != parent_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trg_categories_updated_at ON categories;
CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_categories_updated_at();

-- Create function to validate and set level based on parent
CREATE OR REPLACE FUNCTION set_category_level()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.level = 0;
    ELSE
        -- Get parent level and validate it exists
        SELECT level + 1 INTO NEW.level 
        FROM categories 
        WHERE id = NEW.parent_id AND is_active = true;
        
        IF NEW.level IS NULL THEN
            RAISE EXCEPTION 'Parent category not found or inactive: %', NEW.parent_id;
        END IF;
        
        -- Check maximum nesting level (3 levels: 0, 1, 2)
        IF NEW.level > 2 THEN
            RAISE EXCEPTION 'Maximum category nesting level (3) exceeded';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for level validation
DROP TRIGGER IF EXISTS trg_categories_set_level ON categories;
CREATE TRIGGER trg_categories_set_level
    BEFORE INSERT OR UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION set_category_level();

-- Create function to prevent circular references
CREATE OR REPLACE FUNCTION prevent_category_cycles()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check if parent_id is being updated and is not null
    IF NEW.parent_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.parent_id IS DISTINCT FROM NEW.parent_id) THEN
        -- Check for circular reference using recursive CTE
        IF EXISTS (
            WITH RECURSIVE cycle_check AS (
                -- Start from the new parent
                SELECT id, parent_id, 1 as depth
                FROM categories 
                WHERE id = NEW.parent_id
                
                UNION ALL
                
                -- Follow the parent chain
                SELECT c.id, c.parent_id, cc.depth + 1
                FROM categories c
                JOIN cycle_check cc ON c.id = cc.parent_id
                WHERE cc.depth < 10 -- Prevent infinite loops
            )
            SELECT 1 FROM cycle_check WHERE parent_id = NEW.id
        ) THEN
            RAISE EXCEPTION 'Cannot create circular reference in category hierarchy';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for cycle prevention
DROP TRIGGER IF EXISTS trg_categories_prevent_cycles ON categories;
CREATE TRIGGER trg_categories_prevent_cycles
    BEFORE INSERT OR UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION prevent_category_cycles();

-- Insert default root categories
INSERT INTO categories (name, slug, description, level, sort_order, color, icon) VALUES
    ('Main Dishes', 'main-dishes', 'Primary course recipes including meats, vegetarian mains, and complete meals', 0, 1, '#FF6B35', 'restaurant'),
    ('Appetizers', 'appetizers', 'Starters, finger foods, and small plates to begin meals', 0, 2, '#F7931E', 'local_dining'),
    ('Desserts', 'desserts', 'Sweet treats, cakes, pastries, and after-meal delights', 0, 3, '#FF1744', 'cake'),
    ('Beverages', 'beverages', 'Drinks, cocktails, smoothies, and liquid refreshments', 0, 4, '#2196F3', 'local_bar'),
    ('Sides', 'sides', 'Side dishes, accompaniments, and complementary foods', 0, 5, '#4CAF50', 'restaurant_menu'),
    ('Breakfast', 'breakfast', 'Morning meals, cereals, and breakfast specialties', 0, 6, '#FFC107', 'free_breakfast'),
    ('Snacks', 'snacks', 'Light bites, quick foods, and between-meal options', 0, 7, '#9C27B0', 'fastfood'),
    ('Soups & Stews', 'soups-stews', 'Liquid-based dishes, broths, and hearty stews', 0, 8, '#FF5722', 'soup_kitchen')
ON CONFLICT (slug) DO NOTHING;

-- Create view for category statistics
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
LEFT JOIN recipes r ON c.id = r.category_id
LEFT JOIN ingredients i ON c.name = i.category
LEFT JOIN categories child ON c.id = child.parent_id AND child.is_active = true
WHERE c.is_active = true
GROUP BY c.id, c.name, c.slug, c.level, c.is_active, c.created_at, c.updated_at;

-- Create materialized view for complex hierarchical queries (optional, for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS category_hierarchy AS
WITH RECURSIVE hierarchy AS (
    -- Root categories
    SELECT 
        id, 
        name, 
        slug, 
        parent_id, 
        level, 
        sort_order,
        is_active,
        ARRAY[id] as path,
        name as root_name,
        id as root_id
    FROM categories 
    WHERE parent_id IS NULL AND is_active = true
    
    UNION ALL
    
    -- Child categories
    SELECT 
        c.id, 
        c.name, 
        c.slug, 
        c.parent_id, 
        c.level, 
        c.sort_order,
        c.is_active,
        h.path || c.id,
        h.root_name,
        h.root_id
    FROM categories c
    JOIN hierarchy h ON c.parent_id = h.id
    WHERE c.is_active = true AND c.level <= 2
)
SELECT * FROM hierarchy;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_category_hierarchy_root ON category_hierarchy(root_id);
CREATE INDEX IF NOT EXISTS idx_category_hierarchy_level ON category_hierarchy(level);
CREATE INDEX IF NOT EXISTS idx_category_hierarchy_path ON category_hierarchy USING GIN(path);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_category_hierarchy()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW category_hierarchy;
END;
$$ LANGUAGE plpgsql;

-- Create function to get category breadcrumbs
CREATE OR REPLACE FUNCTION get_category_breadcrumbs(category_id UUID)
RETURNS TABLE(id UUID, name VARCHAR, slug VARCHAR, level INTEGER) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE breadcrumbs AS (
        -- Start with the given category
        SELECT c.id, c.name, c.slug, c.parent_id, c.level
        FROM categories c
        WHERE c.id = category_id AND c.is_active = true
        
        UNION ALL
        
        -- Walk up to parents
        SELECT c.id, c.name, c.slug, c.parent_id, c.level
        FROM categories c
        JOIN breadcrumbs b ON c.id = b.parent_id
        WHERE c.is_active = true
    )
    SELECT b.id, b.name, b.slug, b.level
    FROM breadcrumbs b
    ORDER BY b.level;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed for your user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO your_app_user;
-- GRANT SELECT ON category_stats TO your_app_user;
-- GRANT SELECT ON category_hierarchy TO your_app_user;

COMMENT ON TABLE categories IS 'Hierarchical categories for organizing recipes and ingredients';
COMMENT ON COLUMN categories.level IS 'Nesting level: 0=root, 1=sub-category, 2=sub-sub-category (max 3 levels)';
COMMENT ON COLUMN categories.slug IS 'URL-friendly version of category name';
COMMENT ON COLUMN categories.sort_order IS 'Display order within same level';
COMMENT ON COLUMN categories.color IS 'Hex color code for UI theming';
COMMENT ON COLUMN categories.icon IS 'Icon identifier for UI display';
COMMENT ON VIEW category_stats IS 'Aggregated statistics for each category';
COMMENT ON MATERIALIZED VIEW category_hierarchy IS 'Flattened hierarchical structure for efficient queries';