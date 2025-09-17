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
CREATE INDEX IF NOT EXISTS idx_categories_hierarchy ON categories(parent_id, level, sort_order) WHERE is_active = true;

-- Add constraints for data integrity
ALTER TABLE categories 
    ADD CONSTRAINT check_category_level CHECK (level >= 0 AND level <= 3);

ALTER TABLE categories 
    ADD CONSTRAINT check_category_sort_order CHECK (sort_order >= 0);

ALTER TABLE categories 
    ADD CONSTRAINT check_category_name_not_empty CHECK (length(trim(name)) > 0);

ALTER TABLE categories 
    ADD CONSTRAINT check_category_slug_format CHECK (slug ~ '^[a-z0-9-]+$');

ALTER TABLE categories 
    ADD CONSTRAINT check_category_color_format CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$');

-- Create trigger for updating updated_at
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate URL-friendly slugs
CREATE OR REPLACE FUNCTION generate_category_slug(category_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN lower(
        regexp_replace(
            regexp_replace(
                regexp_replace(trim(category_name), '[^\w\s-]', '', 'g'),
                '\s+', '-', 'g'
            ),
            '-+', '-', 'g'
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate slug if not provided
CREATE OR REPLACE FUNCTION set_category_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_category_slug(NEW.name);
        
        -- Ensure slug uniqueness
        WHILE EXISTS(SELECT 1 FROM categories WHERE slug = NEW.slug AND id != COALESCE(NEW.id, gen_random_uuid())) LOOP
            NEW.slug := NEW.slug || '-' || extract(epoch from now())::integer;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating slugs
DROP TRIGGER IF EXISTS category_slug_generation ON categories;
CREATE TRIGGER category_slug_generation
    BEFORE INSERT OR UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION set_category_slug();

-- Add table and column comments
COMMENT ON TABLE categories IS 'Hierarchical categories for organizing recipes and ingredients';
COMMENT ON COLUMN categories.level IS 'Nesting level: 1=root, 2=subcategory, 3=sub-subcategory';
COMMENT ON COLUMN categories.slug IS 'URL-friendly identifier generated from name';
COMMENT ON COLUMN categories.parent_id IS 'References parent category for hierarchical structure';
COMMENT ON COLUMN categories.sort_order IS 'Display order within the same level';
COMMENT ON COLUMN categories.color IS 'Hex color code for UI theming';
COMMENT ON COLUMN categories.icon IS 'Icon identifier for UI display';