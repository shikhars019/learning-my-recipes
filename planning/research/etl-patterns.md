# ETL Patterns and Libraries Research for Recipe Data Processing

## Overview
This document researches ETL (Extract, Transform, Load) patterns and libraries suitable for processing recipe data from JSON to PostgreSQL, focusing on intermediate complexity with validation, error handling, and duplicate detection.

## Python ETL Approaches

### 1. Library Comparison

#### Core Dependencies
```python
# requirements.txt
pandas>=1.5.0          # Data manipulation and analysis
psycopg2-binary>=2.9.0 # PostgreSQL adapter
sqlalchemy>=1.4.0      # SQL toolkit and ORM
pydantic>=1.10.0       # Data validation
python-dotenv>=0.20.0  # Environment variable management
loguru>=0.6.0          # Advanced logging
jsonschema>=4.17.0     # JSON schema validation
click>=8.1.0           # CLI interface
```

### 2. ETL Architecture Pattern

#### Project Structure
```
scripts/
├── etl/
│   ├── __init__.py
│   ├── extractors.py       # Data extraction logic
│   ├── transformers.py     # Data transformation and validation
│   ├── loaders.py         # Database loading logic
│   ├── validators.py      # Data validation schemas
│   └── utils.py           # Utility functions
├── data/
│   ├── recipes.json       # Source data
│   └── schema.json        # JSON schema for validation
├── config/
│   ├── database.py        # Database configuration
│   └── settings.py        # ETL settings
├── logs/                  # Log files
├── requirements.txt
└── main.py               # Entry point
```

### 3. Data Extraction Module

```python
# etl/extractors.py
import json
import jsonschema
from pathlib import Path
from typing import List, Dict, Any
from loguru import logger

class RecipeExtractor:
    def __init__(self, data_file: Path, schema_file: Path = None):
        self.data_file = data_file
        self.schema_file = schema_file
        
    def extract(self) -> List[Dict[str, Any]]:
        """Extract recipe data from JSON file with validation."""
        logger.info(f"Extracting data from {self.data_file}")
        
        try:
            with open(self.data_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            # Validate JSON structure if schema provided
            if self.schema_file and self.schema_file.exists():
                self._validate_json_structure(data)
                
            logger.success(f"Successfully extracted {len(data)} recipes")
            return data
            
        except FileNotFoundError:
            logger.error(f"Data file not found: {self.data_file}")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON format: {e}")
            raise
        except jsonschema.ValidationError as e:
            logger.error(f"JSON schema validation failed: {e}")
            raise
            
    def _validate_json_structure(self, data: List[Dict]) -> None:
        """Validate JSON data against schema."""
        with open(self.schema_file, 'r') as f:
            schema = json.load(f)
            
        # Validate each recipe against schema
        for i, recipe in enumerate(data):
            try:
                jsonschema.validate(recipe, schema)
            except jsonschema.ValidationError as e:
                raise jsonschema.ValidationError(
                    f"Recipe {i + 1} validation failed: {e.message}"
                )
```

### 4. Data Transformation and Validation Module

```python
# etl/transformers.py
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, validator, Field
from loguru import logger
import re

class IngredientModel(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    quantity: Optional[float] = Field(None, gt=0)
    unit: Optional[str] = Field(None, max_length=50)
    
    @validator('name')
    def normalize_name(cls, v):
        return v.strip().lower()
        
    @validator('unit')
    def normalize_unit(cls, v):
        if v:
            return v.strip().lower()
        return v

class RecipeModel(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    instructions: str = Field(..., min_length=10)
    prep_time_minutes: int = Field(..., ge=1, le=480)
    cook_time_minutes: int = Field(0, ge=0, le=480)
    servings: int = Field(4, ge=1, le=20)
    difficulty_level: str = Field(..., regex='^(easy|medium|hard)$')
    category: str = Field(..., min_length=1, max_length=100)
    ingredients: List[IngredientModel] = Field(..., min_items=1)
    
    @validator('name')
    def normalize_name(cls, v):
        return v.strip().title()
        
    @validator('difficulty_level')
    def normalize_difficulty(cls, v):
        return v.strip().lower()
        
    @validator('category')
    def normalize_category(cls, v):
        return v.strip().title()
        
    @validator('instructions')
    def clean_instructions(cls, v):
        # Clean up instructions text
        v = re.sub(r'\s+', ' ', v.strip())
        return v

class RecipeTransformer:
    def __init__(self):
        self.validation_errors = []
        self.duplicate_recipes = set()
        
    def transform(self, raw_data: List[Dict[str, Any]]) -> List[RecipeModel]:
        """Transform and validate recipe data."""
        logger.info(f"Transforming {len(raw_data)} recipes")
        
        validated_recipes = []
        seen_names = set()
        
        for i, raw_recipe in enumerate(raw_data):
            try:
                # Validate and transform recipe
                recipe = RecipeModel(**raw_recipe)
                
                # Check for duplicates
                recipe_key = self._generate_recipe_key(recipe)
                if recipe_key in seen_names:
                    self.duplicate_recipes.add(recipe.name)
                    logger.warning(f"Duplicate recipe detected: {recipe.name}")
                    continue
                    
                seen_names.add(recipe_key)
                validated_recipes.append(recipe)
                
            except Exception as e:
                error_msg = f"Recipe {i + 1} ({raw_recipe.get('name', 'Unknown')}): {str(e)}"
                self.validation_errors.append(error_msg)
                logger.error(error_msg)
                continue
                
        logger.info(f"Successfully transformed {len(validated_recipes)} recipes")
        logger.info(f"Validation errors: {len(self.validation_errors)}")
        logger.info(f"Duplicates found: {len(self.duplicate_recipes)}")
        
        return validated_recipes
        
    def _generate_recipe_key(self, recipe: RecipeModel) -> str:
        """Generate unique key for duplicate detection."""
        return f"{recipe.name.lower()}_{recipe.category.lower()}"
        
    def get_transformation_summary(self) -> Dict[str, Any]:
        """Get summary of transformation process."""
        return {
            'validation_errors': self.validation_errors,
            'duplicate_recipes': list(self.duplicate_recipes),
            'error_count': len(self.validation_errors),
            'duplicate_count': len(self.duplicate_recipes)
        }
```

### 5. Database Loading Module

```python
# etl/loaders.py
import psycopg2
from psycopg2.extras import RealDictCursor, execute_batch
from sqlalchemy import create_engine, text
from typing import List, Dict, Any, Optional
from loguru import logger
from contextlib import contextmanager

class DatabaseLoader:
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.engine = create_engine(connection_string)
        
    @contextmanager
    def get_connection(self):
        """Context manager for database connections."""
        conn = None
        try:
            conn = psycopg2.connect(self.connection_string)
            yield conn
            conn.commit()
        except Exception as e:
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()
                
    def load_recipes(self, recipes: List[RecipeModel]) -> Dict[str, int]:
        """Load recipes into database with error handling."""
        logger.info(f"Loading {len(recipes)} recipes to database")
        
        stats = {
            'loaded': 0,
            'skipped': 0,
            'errors': 0
        }
        
        with self.get_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Process categories first
            categories = self._process_categories(cursor, recipes)
            
            # Process ingredients
            ingredients = self._process_ingredients(cursor, recipes)
            
            # Process recipes
            for recipe in recipes:
                try:
                    recipe_id = self._insert_recipe(cursor, recipe, categories)
                    if recipe_id:
                        self._insert_recipe_ingredients(cursor, recipe_id, recipe.ingredients, ingredients)
                        stats['loaded'] += 1
                        logger.debug(f"Loaded recipe: {recipe.name}")
                    else:
                        stats['skipped'] += 1
                        
                except Exception as e:
                    stats['errors'] += 1
                    logger.error(f"Error loading recipe {recipe.name}: {str(e)}")
                    
        logger.success(f"Loading complete: {stats}")
        return stats
        
    def _process_categories(self, cursor, recipes: List[RecipeModel]) -> Dict[str, int]:
        """Process and insert categories, return mapping."""
        categories = {}
        unique_categories = set(recipe.category for recipe in recipes)
        
        for category in unique_categories:
            cursor.execute(
                """
                INSERT INTO categories (name) 
                VALUES (%s) 
                ON CONFLICT (name) DO NOTHING 
                RETURNING id
                """,
                (category,)
            )
            
            result = cursor.fetchone()
            if result:
                categories[category] = result['id']
            else:
                # Category already exists, fetch ID
                cursor.execute("SELECT id FROM categories WHERE name = %s", (category,))
                categories[category] = cursor.fetchone()['id']
                
        logger.info(f"Processed {len(categories)} categories")
        return categories
        
    def _process_ingredients(self, cursor, recipes: List[RecipeModel]) -> Dict[str, int]:
        """Process and insert ingredients, return mapping."""
        ingredients = {}
        unique_ingredients = set()
        
        for recipe in recipes:
            for ingredient in recipe.ingredients:
                unique_ingredients.add(ingredient.name)
                
        for ingredient_name in unique_ingredients:
            cursor.execute(
                """
                INSERT INTO ingredients (name) 
                VALUES (%s) 
                ON CONFLICT (name) DO NOTHING 
                RETURNING id
                """,
                (ingredient_name,)
            )
            
            result = cursor.fetchone()
            if result:
                ingredients[ingredient_name] = result['id']
            else:
                cursor.execute("SELECT id FROM ingredients WHERE name = %s", (ingredient_name,))
                ingredients[ingredient_name] = cursor.fetchone()['id']
                
        logger.info(f"Processed {len(ingredients)} ingredients")
        return ingredients
        
    def _insert_recipe(self, cursor, recipe: RecipeModel, categories: Dict[str, int]) -> Optional[int]:
        """Insert recipe and return ID."""
        try:
            cursor.execute(
                """
                INSERT INTO recipes (
                    name, description, instructions, prep_time_minutes,
                    cook_time_minutes, servings, difficulty_level, category_id
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (name) DO NOTHING
                RETURNING id
                """,
                (
                    recipe.name, recipe.description, recipe.instructions,
                    recipe.prep_time_minutes, recipe.cook_time_minutes,
                    recipe.servings, recipe.difficulty_level,
                    categories[recipe.category]
                )
            )
            
            result = cursor.fetchone()
            return result['id'] if result else None
            
        except Exception as e:
            logger.error(f"Error inserting recipe {recipe.name}: {str(e)}")
            return None
            
    def _insert_recipe_ingredients(self, cursor, recipe_id: int, ingredients: List[IngredientModel], ingredient_map: Dict[str, int]):
        """Insert recipe-ingredient relationships."""
        ingredient_data = [
            (recipe_id, ingredient_map[ing.name], ing.quantity, ing.unit)
            for ing in ingredients
        ]
        
        execute_batch(
            cursor,
            """
            INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
            VALUES (%s, %s, %s, %s)
            """,
            ingredient_data
        )
```

### 6. Main ETL Script

```python
# main.py
import click
from pathlib import Path
from loguru import logger
from datetime import datetime
import sys

from etl.extractors import RecipeExtractor
from etl.transformers import RecipeTransformer
from etl.loaders import DatabaseLoader
from config.database import get_database_url

# Configure logging
logger.remove()
logger.add(sys.stderr, level="INFO")
logger.add(
    "logs/etl_{time:YYYY-MM-DD}.log",
    rotation="1 day",
    retention="30 days",
    level="DEBUG"
)

@click.command()
@click.option('--data-file', '-d', 
              default='data/recipes.json',
              help='Path to recipe JSON file')
@click.option('--schema-file', '-s',
              default='data/schema.json', 
              help='Path to JSON schema file')
@click.option('--dry-run', '-n',
              is_flag=True,
              help='Perform dry run without database loading')
@click.option('--continue-on-error',
              is_flag=True,
              help='Continue processing despite validation errors')
def main(data_file: str, schema_file: str, dry_run: bool, continue_on_error: bool):
    """Recipe ETL Pipeline - Extract, Transform, Load recipe data."""
    
    start_time = datetime.now()
    logger.info("Starting Recipe ETL Pipeline")
    logger.info(f"Data file: {data_file}")
    logger.info(f"Schema file: {schema_file}")
    logger.info(f"Dry run: {dry_run}")
    
    try:
        # Extract
        logger.info("=== EXTRACTION PHASE ===")
        extractor = RecipeExtractor(
            data_file=Path(data_file),
            schema_file=Path(schema_file) if schema_file else None
        )
        raw_data = extractor.extract()
        
        # Transform
        logger.info("=== TRANSFORMATION PHASE ===")
        transformer = RecipeTransformer()
        validated_recipes = transformer.transform(raw_data)
        
        # Check if we should continue with errors
        summary = transformer.get_transformation_summary()
        if summary['error_count'] > 0:
            logger.warning(f"Found {summary['error_count']} validation errors")
            if not continue_on_error:
                logger.error("Stopping due to validation errors. Use --continue-on-error to proceed.")
                sys.exit(1)
                
        # Load
        if not dry_run and validated_recipes:
            logger.info("=== LOADING PHASE ===")
            database_url = get_database_url()
            loader = DatabaseLoader(database_url)
            load_stats = loader.load_recipes(validated_recipes)
            
            logger.success("=== ETL PIPELINE COMPLETED ===")
            logger.info(f"Total recipes processed: {len(raw_data)}")
            logger.info(f"Successfully validated: {len(validated_recipes)}")
            logger.info(f"Loaded to database: {load_stats['loaded']}")
            logger.info(f"Skipped (duplicates): {load_stats['skipped']}")
            logger.info(f"Load errors: {load_stats['errors']}")
            
        elif dry_run:
            logger.info("=== DRY RUN COMPLETED ===")
            logger.info(f"Would process {len(validated_recipes)} recipes")
            logger.info("No data was loaded to database")
            
        else:
            logger.warning("No valid recipes to load")
            
    except Exception as e:
        logger.error(f"ETL Pipeline failed: {str(e)}")
        sys.exit(1)
        
    finally:
        duration = datetime.now() - start_time
        logger.info(f"Pipeline duration: {duration}")

if __name__ == '__main__':
    main()
```

## Educational Benefits

### 1. Key Learning Concepts
- **Data Validation**: Pydantic models for type safety and validation
- **Error Handling**: Comprehensive error handling and logging
- **Database Transactions**: Proper transaction management
- **Code Organization**: Modular ETL architecture
- **CLI Development**: Click library for command-line interfaces
- **Logging**: Professional logging with Loguru

### 2. Best Practices Demonstrated
- **Configuration Management**: Environment variables and settings
- **Data Quality**: Validation, deduplication, error reporting
- **Performance**: Batch processing and connection management
- **Monitoring**: Detailed logging and progress tracking
- **Testing**: Unit tests for each ETL component

### 3. Advanced Features for Learning
- **JSON Schema Validation**: Learn schema-based validation
- **Duplicate Detection**: Business logic implementation
- **Batch Processing**: Efficient database operations
- **Context Managers**: Resource management patterns
- **Type Hints**: Modern Python development practices

This ETL implementation provides intermediate complexity suitable for educational purposes while demonstrating professional-grade data processing patterns and error handling strategies.