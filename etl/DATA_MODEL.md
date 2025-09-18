# My Recipes - Database Schema Documentation

> **Generated on:** September 18, 2025  
> **Database:** PostgreSQL 16  
> **Schema Version:** 1.0  
> **Source:** Actual database schema introspection

## Overview

This document provides a comprehensive overview of the My Recipes database schema, including all tables, columns, data types, constraints, and relationships. The schema is designed to support a full-featured recipe management platform with ingredient tracking, categorization, and version control.

## Database Tables

### 1. Categories Table

**Purpose:** Hierarchical categorization system for recipes

```sql
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL UNIQUE,
    slug            VARCHAR(255) NOT NULL UNIQUE,
    description     TEXT,
    parent_id       UUID REFERENCES categories(id) ON DELETE CASCADE,
    level           INTEGER NOT NULL DEFAULT 0,
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Constraints:**
- `categories_max_level`: Level must be ≤ 5 (prevents infinite nesting)
- `categories_no_self_reference`: ID cannot equal parent_id
- `categories_slug_format`: Slug must match pattern `^[a-z0-9-]+$`

**Indexes:**
- Primary key on `id`
- Unique constraints on `name` and `slug`
- B-tree indexes on `is_active`, `parent_id`, `slug`

**Triggers:**
- `update_categories_updated_at`: Auto-updates `updated_at` on modification

---

### 2. Ingredients Table

**Purpose:** Master list of all available ingredients with nutritional information

```sql
CREATE TABLE ingredients (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) NOT NULL,
    category        VARCHAR(100),
    common_unit     VARCHAR(50),
    nutrition_data  JSONB,
    allergen_info   TEXT[],
    storage_tips    TEXT,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Special Data Types:**
- `JSONB`: Structured nutrition data (calories, macronutrients, etc.)
- `TEXT[]`: Array of allergen information

**Constraints:**
- `ingredients_normalized_name_format`: Normalized name must be lowercase and trimmed
- `ingredients_nutrition_valid`: Nutrition data must contain valid calorie information

**Indexes:**
- Primary key on `id`
- B-tree indexes on `is_active`, `category`, `normalized_name`
- GIN index on `name` for full-text search (English configuration)

**Triggers:**
- `update_ingredients_updated_at`: Auto-updates `updated_at` on modification

---

### 3. Recipes Table

**Purpose:** Core recipe information and metadata

```sql
CREATE TABLE recipes (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    instructions     JSONB NOT NULL,
    prep_time        INTEGER,
    cook_time        INTEGER,
    total_time       INTEGER GENERATED ALWAYS AS (COALESCE(prep_time, 0) + COALESCE(cook_time, 0)) STORED,
    servings         INTEGER DEFAULT 4,
    difficulty_level VARCHAR(20) DEFAULT 'medium',
    category_id      UUID REFERENCES categories(id),
    cuisine_type     VARCHAR(100),
    dietary_tags     TEXT[],
    image_url        TEXT,
    source_url       TEXT,
    is_public        BOOLEAN DEFAULT true,
    is_active        BOOLEAN DEFAULT true,
    created_at       TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Special Features:**
- `total_time`: Computed column (prep_time + cook_time)
- `instructions`: JSONB array of step-by-step instructions
- `dietary_tags`: Array for dietary restrictions/preferences

**Constraints:**
- `recipes_cook_time_positive`: Cook time must be ≥ 0 or NULL
- `recipes_prep_time_positive`: Prep time must be ≥ 0 or NULL
- `recipes_servings_positive`: Servings must be > 0
- `recipes_difficulty_valid`: Must be one of: 'easy', 'medium', 'hard', 'expert'
- `recipes_instructions_valid`: Instructions must be a non-empty JSON array

**Indexes:**
- Primary key on `id`
- B-tree indexes on various fields for filtering/sorting
- GIN indexes on `title` and `description` for full-text search
- GIN index on `dietary_tags` for array operations

**Triggers:**
- `update_recipes_updated_at`: Auto-updates `updated_at` on modification

---

### 4. Recipe Ingredients Table

**Purpose:** Junction table linking recipes to ingredients with quantities

```sql
CREATE TABLE recipe_ingredients (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id          UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id      UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity           NUMERIC(10,3),
    unit               VARCHAR(50),
    preparation_notes  TEXT,
    is_optional        BOOLEAN DEFAULT false,
    sort_order         INTEGER DEFAULT 0,
    created_at         TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Special Data Types:**
- `NUMERIC(10,3)`: High-precision decimal for quantities (up to 9,999,999.999)

**Constraints:**
- `recipe_ingredients_quantity_positive`: Quantity must be > 0 or NULL
- `recipe_ingredients_unique`: Unique constraint on (recipe_id, ingredient_id)

**Indexes:**
- Primary key on `id`
- B-tree indexes on `recipe_id`, `ingredient_id`
- Composite index on `recipe_id, sort_order` for ordered ingredient lists

---

### 5. Recipe Versions Table

**Purpose:** Version history tracking for recipe modifications

```sql
CREATE TABLE recipe_versions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id        UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    version_number   INTEGER NOT NULL,
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    instructions     JSONB NOT NULL,
    prep_time        INTEGER,
    cook_time        INTEGER,
    servings         INTEGER,
    difficulty_level VARCHAR(20),
    change_notes     TEXT,
    created_at       TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Constraints:**
- `recipe_versions_cook_time_positive`: Cook time must be ≥ 0 or NULL
- `recipe_versions_prep_time_positive`: Prep time must be ≥ 0 or NULL
- `recipe_versions_servings_positive`: Servings must be > 0 or NULL
- `recipe_versions_version_positive`: Version number must be > 0
- `recipe_versions_unique`: Unique constraint on (recipe_id, version_number)

**Indexes:**
- Primary key on `id`
- B-tree index on `recipe_id`
- Composite index on `recipe_id, version_number`

---

## Relationships

### Entity Relationship Diagram (Text)

```
Categories (1:N) ──┐
                   │
                   └─→ Recipes (1:N) ──┬─→ Recipe_Ingredients (N:1) ─→ Ingredients
                                       │
                                       └─→ Recipe_Versions (1:N)
                                       
Categories (Self-Referential)
```

### Foreign Key Relationships

1. **categories.parent_id** → **categories.id**
   - Self-referential for hierarchical categories
   - CASCADE DELETE

2. **recipes.category_id** → **categories.id**
   - Recipe belongs to a category
   - SET NULL on category deletion

3. **recipe_ingredients.recipe_id** → **recipes.id**
   - CASCADE DELETE (ingredients removed when recipe deleted)

4. **recipe_ingredients.ingredient_id** → **ingredients.id**
   - CASCADE DELETE (recipe connections removed when ingredient deleted)

5. **recipe_versions.recipe_id** → **recipes.id**
   - CASCADE DELETE (versions removed when recipe deleted)

---

## Data Types Reference

| PostgreSQL Type | Description | Usage in Schema |
|----------------|-------------|-----------------|
| `UUID` | Universally Unique Identifier | Primary keys, foreign keys |
| `VARCHAR(n)` | Variable character string | Names, short text fields |
| `TEXT` | Unlimited text | Long descriptions, notes |
| `JSONB` | Binary JSON | Structured data (instructions, nutrition) |
| `TEXT[]` | Text array | Lists (allergens, dietary tags) |
| `NUMERIC(10,3)` | High-precision decimal | Ingredient quantities |
| `INTEGER` | 32-bit integer | Time values, counts, sort orders |
| `BOOLEAN` | True/false | Flags and status indicators |
| `TIMESTAMP WITHOUT TIME ZONE` | Date and time | Creation/modification timestamps |

---

## Performance Optimizations

### Indexing Strategy

1. **Full-Text Search**: GIN indexes on recipe titles/descriptions and ingredient names
2. **Array Operations**: GIN indexes on dietary_tags and allergen_info arrays
3. **Filtering**: B-tree indexes on commonly filtered fields (is_active, difficulty_level, etc.)
4. **Sorting**: Composite indexes for common sort operations
5. **Foreign Keys**: All foreign key columns are indexed for join performance

### Constraints Benefits

1. **Data Integrity**: Check constraints ensure valid data ranges and formats
2. **Referential Integrity**: Foreign keys maintain relationships
3. **Business Rules**: Custom constraints enforce application logic at database level

### Computed Columns

- `recipes.total_time`: Automatically calculated, indexed for fast sorting

---

## Sample Data Patterns

### Categories Hierarchy Example
```
Meals (level 0)
├── Breakfast (level 1)
├── Lunch (level 1)
├── Dinner (level 1)
│   ├── Main Courses (level 2)
│   ├── Side Dishes (level 2)
│   └── Desserts (level 2)
└── Snacks (level 1)
```

### Nutrition Data JSONB Example
```json
{
  "calories": 250,
  "protein": 12.5,
  "carbohydrates": 30.2,
  "fat": 8.1,
  "fiber": 4.5,
  "sugar": 15.3,
  "sodium": 450,
  "servings_per_container": 1
}
```

### Instructions JSONB Example
```json
[
  {
    "step": 1,
    "instruction": "Preheat oven to 350°F (175°C)",
    "time_minutes": 5
  },
  {
    "step": 2,
    "instruction": "Mix dry ingredients in large bowl",
    "time_minutes": 3
  },
  {
    "step": 3,
    "instruction": "Combine wet ingredients separately",
    "time_minutes": 2
  }
]
```

---

## Schema Evolution Notes

### Version 1.0 Features
- UUID-based primary keys for distributed systems compatibility
- JSONB for flexible structured data storage
- Full-text search capabilities
- Hierarchical category system
- Recipe versioning system
- Comprehensive constraint system

### Future Considerations
- User management and authentication tables
- Recipe ratings and reviews system
- Shopping list functionality
- Meal planning features
- Recipe sharing and social features

---

## Migration and ETL Notes

### Data Loading Patterns
1. **Categories**: Load hierarchically (parents before children)
2. **Ingredients**: Batch load with normalized names
3. **Recipes**: Load with proper instruction JSON formatting
4. **Recipe Ingredients**: Ensure recipe and ingredient exist before linking

### UUID Generation
- All primary keys use `uuid_generate_v4()` function
- Requires `uuid-ossp` PostgreSQL extension
- Provides globally unique identifiers

### JSONB Best Practices
- Validate JSON structure before insertion
- Use appropriate GIN indexes for query performance
- Consider using JSON Schema validation in application layer

---

*This documentation was generated from the actual database schema on September 18, 2025.*