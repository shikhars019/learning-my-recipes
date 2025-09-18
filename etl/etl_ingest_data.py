#!/usr/bin/env python3
"""
ETL Script for Learning My Recipes Database
Ingests test data from JSON file into PostgreSQL database

This script demonstrates a simple ETL (Extract, Transform, Load) process:
- Extract: Read JSON test data
- Transform: Validate and format data for database
- Load: Insert data into PostgreSQL with proper relationships

Requirements:
pip install psycopg2-binary

Usage:
python etl_ingest_data.py
"""

import json
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
import sys
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('etl_log.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class RecipeETL:
    def __init__(self, db_config):
        """Initialize ETL with database configuration"""
        self.db_config = db_config
        self.conn = None
        self.cursor = None
        
        # Statistics tracking
        self.stats = {
            'categories_processed': 0,
            'categories_inserted': 0,
            'ingredients_processed': 0,
            'ingredients_inserted': 0,
            'recipes_processed': 0,
            'recipes_inserted': 0,
            'recipe_ingredients_inserted': 0,
            'errors': 0
        }

    def connect(self):
        """Establish database connection"""
        try:
            self.conn = psycopg2.connect(**self.db_config)
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            logger.info("Database connection established")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            return False

    def disconnect(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        logger.info("Database connection closed")

    def load_test_data(self, file_path):
        """Load test data from JSON file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                data = json.load(file)
            logger.info(f"Successfully loaded test data from {file_path}")
            return data
        except Exception as e:
            logger.error(f"Failed to load test data: {e}")
            return None

    def get_category_id(self, category_name):
        """Get category ID by name, return None if not found"""
        try:
            self.cursor.execute(
                "SELECT id FROM categories WHERE LOWER(name) = LOWER(%s)",
                (category_name,)
            )
            result = self.cursor.fetchone()
            return result['id'] if result else None
        except Exception as e:
            logger.error(f"Error fetching category ID for {category_name}: {e}")
            return None

    def get_ingredient_id(self, ingredient_name):
        """Get ingredient ID by name, return None if not found"""
        try:
            self.cursor.execute(
                "SELECT id FROM ingredients WHERE LOWER(name) = LOWER(%s)",
                (ingredient_name,)
            )
            result = self.cursor.fetchone()
            return result['id'] if result else None
        except Exception as e:
            logger.error(f"Error fetching ingredient ID for {ingredient_name}: {e}")
            return None

    def process_categories(self, categories_data):
        """Process and insert categories"""
        logger.info("Processing categories...")
        
        for category in categories_data:
            try:
                self.stats['categories_processed'] += 1
                
                # Check if category already exists
                existing_id = self.get_category_id(category['name'])
                if existing_id:
                    logger.info(f"Category '{category['name']}' already exists, skipping")
                    continue
                
                # Insert new category with slug
                slug = category['name'].lower().replace(' ', '-').replace('&', 'and')
                self.cursor.execute("""
                    INSERT INTO categories (name, slug, description)
                    VALUES (%s, %s, %s)
                    RETURNING id
                """, (category['name'], slug, category.get('description', '')))
                
                category_id = self.cursor.fetchone()['id']
                self.stats['categories_inserted'] += 1
                logger.info(f"Inserted category: {category['name']} (ID: {category_id})")
                
            except Exception as e:
                self.stats['errors'] += 1
                logger.error(f"Error processing category {category.get('name', 'Unknown')}: {e}")

    def process_ingredients(self, ingredients_data):
        """Process and insert ingredients"""
        logger.info("Processing ingredients...")
        
        for ingredient in ingredients_data:
            try:
                self.stats['ingredients_processed'] += 1
                
                # Check if ingredient already exists
                existing_id = self.get_ingredient_id(ingredient['name'])
                if existing_id:
                    logger.info(f"Ingredient '{ingredient['name']}' already exists, skipping")
                    continue
                
                # Prepare nutrition data
                nutrition_data = json.dumps(ingredient.get('nutrition_data', {}))
                
                # Insert new ingredient with normalized_name
                normalized_name = ingredient['name'].lower().strip()
                self.cursor.execute("""
                    INSERT INTO ingredients (name, normalized_name, category, common_unit, nutrition_data)
                    VALUES (%s, %s, %s, %s, %s::jsonb)
                    RETURNING id
                """, (
                    ingredient['name'],
                    normalized_name,
                    ingredient.get('category'),
                    ingredient.get('common_unit'),
                    nutrition_data
                ))
                
                ingredient_id = self.cursor.fetchone()['id']
                self.stats['ingredients_inserted'] += 1
                logger.info(f"Inserted ingredient: {ingredient['name']} (ID: {ingredient_id})")
                
            except Exception as e:
                self.stats['errors'] += 1
                logger.error(f"Error processing ingredient {ingredient.get('name', 'Unknown')}: {e}")

    def process_recipes(self, recipes_data):
        """Process and insert recipes with their ingredients"""
        logger.info("Processing recipes...")
        
        for recipe in recipes_data:
            try:
                self.stats['recipes_processed'] += 1
                
                # Check if recipe already exists
                self.cursor.execute(
                    "SELECT id FROM recipes WHERE LOWER(title) = LOWER(%s)",
                    (recipe['title'],)
                )
                existing = self.cursor.fetchone()
                if existing:
                    logger.info(f"Recipe '{recipe['title']}' already exists, skipping")
                    continue
                
                # Get category ID
                category_id = None
                if recipe.get('category'):
                    category_id = self.get_category_id(recipe['category'])
                    if not category_id:
                        logger.warning(f"Category '{recipe['category']}' not found for recipe '{recipe['title']}'")
                
                # Insert recipe
                self.cursor.execute("""
                    INSERT INTO recipes (
                        title, description, prep_time, cook_time,
                        servings, difficulty_level, category_id, instructions
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    recipe['title'],
                    recipe.get('description', ''),
                    recipe.get('prep_time', 0),
                    recipe.get('cook_time', 0),
                    recipe.get('servings', 1),
                    recipe.get('difficulty', 'medium'),
                    category_id,
                    json.dumps(recipe.get('instructions', []))
                ))
                
                recipe_id = self.cursor.fetchone()['id']
                self.stats['recipes_inserted'] += 1
                logger.info(f"Inserted recipe: {recipe['title']} (ID: {recipe_id})")
                
                # Process recipe ingredients
                if recipe.get('ingredients'):
                    self.process_recipe_ingredients(recipe_id, recipe['ingredients'], recipe['title'])
                
            except Exception as e:
                self.stats['errors'] += 1
                logger.error(f"Error processing recipe {recipe.get('title', 'Unknown')}: {e}")

    def process_recipe_ingredients(self, recipe_id, ingredients_data, recipe_title):
        """Process and insert recipe-ingredient relationships"""
        for ingredient_data in ingredients_data:
            try:
                # Get ingredient ID
                ingredient_id = self.get_ingredient_id(ingredient_data['name'])
                if not ingredient_id:
                    logger.warning(f"Ingredient '{ingredient_data['name']}' not found for recipe '{recipe_title}'")
                    continue
                
                # Insert recipe-ingredient relationship
                self.cursor.execute("""
                    INSERT INTO recipe_ingredients (
                        recipe_id, ingredient_id, quantity, unit, preparation_notes
                    )
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    recipe_id,
                    ingredient_id,
                    ingredient_data.get('quantity', 1),
                    ingredient_data.get('unit', ''),
                    ingredient_data.get('preparation', '')
                ))
                
                self.stats['recipe_ingredients_inserted'] += 1
                logger.debug(f"Added ingredient '{ingredient_data['name']}' to recipe '{recipe_title}'")
                
            except Exception as e:
                self.stats['errors'] += 1
                logger.error(f"Error adding ingredient '{ingredient_data.get('name', 'Unknown')}' to recipe '{recipe_title}': {e}")

    def run_etl(self, json_file_path):
        """Run the complete ETL process"""
        logger.info("Starting ETL process...")
        start_time = datetime.now()
        
        # Load test data
        data = self.load_test_data(json_file_path)
        if not data:
            logger.error("Failed to load test data, aborting ETL")
            return False
        
        # Connect to database
        if not self.connect():
            logger.error("Failed to connect to database, aborting ETL")
            return False
        
        try:
            # Start transaction
            self.conn.autocommit = False
            
            # Process in order: categories, ingredients, recipes
            if data.get('categories'):
                self.process_categories(data['categories'])
                self.conn.commit()
                logger.info("Categories processing completed and committed")
            
            if data.get('ingredients'):
                self.process_ingredients(data['ingredients'])
                self.conn.commit()
                logger.info("Ingredients processing completed and committed")
            
            if data.get('recipes'):
                self.process_recipes(data['recipes'])
                self.conn.commit()
                logger.info("Recipes processing completed and committed")
            
            # Calculate duration
            end_time = datetime.now()
            duration = end_time - start_time
            
            # Log final statistics
            self.log_final_stats(duration)
            return True
            
        except Exception as e:
            logger.error(f"ETL process failed: {e}")
            self.conn.rollback()
            return False
        finally:
            self.disconnect()

    def log_final_stats(self, duration):
        """Log final ETL statistics"""
        logger.info("=" * 50)
        logger.info("ETL PROCESS COMPLETED")
        logger.info("=" * 50)
        logger.info(f"Duration: {duration}")
        logger.info(f"Categories processed: {self.stats['categories_processed']}")
        logger.info(f"Categories inserted: {self.stats['categories_inserted']}")
        logger.info(f"Ingredients processed: {self.stats['ingredients_processed']}")
        logger.info(f"Ingredients inserted: {self.stats['ingredients_inserted']}")
        logger.info(f"Recipes processed: {self.stats['recipes_processed']}")
        logger.info(f"Recipes inserted: {self.stats['recipes_inserted']}")
        logger.info(f"Recipe-ingredient relationships: {self.stats['recipe_ingredients_inserted']}")
        logger.info(f"Total errors: {self.stats['errors']}")
        logger.info("=" * 50)

def main():
    """Main ETL execution function"""
    # Database configuration
    db_config = {
        'host': 'localhost',
        'port': 5432,
        'database': 'learning_my_recipes',
        'user': 'postgres',
        'password': ''  # Update with your password if needed
    }
    
    # JSON test data file path
    json_file_path = 'test_data.json'
    
    # Initialize and run ETL
    etl = RecipeETL(db_config)
    success = etl.run_etl(json_file_path)
    
    if success:
        logger.info("ETL process completed successfully!")
        return 0
    else:
        logger.error("ETL process failed!")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)