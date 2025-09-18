/**
 * Database seeding script
 * Creates sample recipes with ingredients for testing
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../..', '.env') });

// Database connection
const dbPool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learning_my_recipes',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

const sampleRecipes = [
  {
    title: 'Spaghetti Carbonara',
    description: 'Classic Italian pasta dish with eggs, cheese, and pancetta',
    instructions: `1. Bring a large pot of salted water to boil and cook spaghetti according to package directions.
2. While pasta cooks, heat a large skillet over medium heat. Add diced pancetta and cook until crispy, about 5-7 minutes.
3. In a bowl, whisk together eggs, grated Parmesan cheese, and black pepper.
4. Drain pasta, reserving 1 cup pasta water. Add hot pasta to the skillet with pancetta.
5. Remove from heat and quickly stir in egg mixture, adding pasta water as needed to create a creamy sauce.
6. Serve immediately with extra Parmesan and black pepper.`,
    total_time_minutes: 30,
    servings: 4,
    is_public: true,
    ingredients: [
      { name: 'Spaghetti', quantity: '1', unit: 'lb', preparation: null, optional: false },
      { name: 'Pancetta', quantity: '8', unit: 'oz', preparation: 'diced', optional: false },
      { name: 'Large eggs', quantity: '4', unit: 'whole', preparation: null, optional: false },
      { name: 'Parmesan cheese', quantity: '1', unit: 'cup', preparation: 'grated', optional: false },
      { name: 'Black pepper', quantity: '1', unit: 'tsp', preparation: 'freshly ground', optional: false },
      { name: 'Salt', quantity: null, unit: 'to taste', preparation: null, optional: false }
    ]
  },
  {
    title: 'Chicken Stir Fry',
    description: 'Quick and healthy chicken stir fry with vegetables',
    instructions: `1. Cut chicken breast into thin strips and season with salt and pepper.
2. Heat oil in a large wok or skillet over high heat.
3. Add chicken and stir-fry for 3-4 minutes until cooked through. Remove and set aside.
4. Add vegetables to the same pan and stir-fry for 2-3 minutes until crisp-tender.
5. Return chicken to pan and add sauce mixture.
6. Stir-fry for another minute until everything is coated and heated through.
7. Serve immediately over rice.`,
    total_time_minutes: 20,
    servings: 2,
    is_public: true,
    ingredients: [
      { name: 'Chicken breast', quantity: '1', unit: 'lb', preparation: 'cut into strips', optional: false },
      { name: 'Bell peppers', quantity: '2', unit: 'whole', preparation: 'sliced', optional: false },
      { name: 'Broccoli', quantity: '1', unit: 'cup', preparation: 'florets', optional: false },
      { name: 'Carrots', quantity: '2', unit: 'whole', preparation: 'sliced', optional: false },
      { name: 'Vegetable oil', quantity: '2', unit: 'tbsp', preparation: null, optional: false },
      { name: 'Soy sauce', quantity: '3', unit: 'tbsp', preparation: null, optional: false },
      { name: 'Garlic', quantity: '2', unit: 'cloves', preparation: 'minced', optional: false },
      { name: 'Ginger', quantity: '1', unit: 'tsp', preparation: 'grated', optional: true }
    ]
  },
  {
    title: 'Chocolate Chip Cookies',
    description: 'Classic homemade chocolate chip cookies that are crispy on the outside and chewy on the inside',
    instructions: `1. Preheat oven to 375°F (190°C).
2. In a bowl, cream together butter and both sugars until light and fluffy.
3. Beat in eggs one at a time, then stir in vanilla.
4. In a separate bowl, whisk together flour, baking soda, and salt.
5. Gradually mix dry ingredients into wet ingredients until just combined.
6. Stir in chocolate chips.
7. Drop rounded tablespoons of dough onto ungreased baking sheets.
8. Bake for 9-11 minutes or until golden brown.
9. Cool on baking sheet for 2 minutes before removing to wire rack.`,
    total_time_minutes: 45,
    servings: 24,
    is_public: true,
    ingredients: [
      { name: 'All-purpose flour', quantity: '2.25', unit: 'cups', preparation: null, optional: false },
      { name: 'Baking soda', quantity: '1', unit: 'tsp', preparation: null, optional: false },
      { name: 'Salt', quantity: '1', unit: 'tsp', preparation: null, optional: false },
      { name: 'Butter', quantity: '1', unit: 'cup', preparation: 'softened', optional: false },
      { name: 'Brown sugar', quantity: '0.75', unit: 'cup', preparation: 'packed', optional: false },
      { name: 'White sugar', quantity: '0.25', unit: 'cup', preparation: null, optional: false },
      { name: 'Large eggs', quantity: '2', unit: 'whole', preparation: null, optional: false },
      { name: 'Vanilla extract', quantity: '2', unit: 'tsp', preparation: null, optional: false },
      { name: 'Chocolate chips', quantity: '2', unit: 'cups', preparation: null, optional: false }
    ]
  }
];

async function seedDatabase() {
  const client = await dbPool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Starting database seeding...');
    
    // Clear existing data
    console.log('Clearing existing data...');
    await client.query('DELETE FROM recipe_ingredients');
    await client.query('DELETE FROM ingredients');
    await client.query('DELETE FROM recipes');
    
    console.log('Seeding recipes and ingredients...');
    
    for (const recipeData of sampleRecipes) {
      // Insert recipe - convert instructions to array and use correct column names
      const instructionsArray = recipeData.instructions.split('\n').filter(line => line.trim());
      
      // Calculate prep and cook time (assuming total time is mostly cook time)
      const totalTime = recipeData.total_time_minutes;
      const prepTime = Math.floor(totalTime * 0.3); // 30% prep time  
      const cookTime = totalTime - prepTime; // remaining cook time
      
      const recipeQuery = `
        INSERT INTO recipes (title, description, instructions, prep_time, cook_time, total_time, servings)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;
      
      const recipeResult = await client.query(recipeQuery, [
        recipeData.title,
        recipeData.description,
        instructionsArray,
        prepTime,
        cookTime, 
        totalTime,
        recipeData.servings
      ]);
      
      const recipeId = recipeResult.rows[0].id;
      console.log(`Created recipe: ${recipeData.title} (ID: ${recipeId})`);
      
      // Insert ingredients
      for (let i = 0; i < recipeData.ingredients.length; i++) {
        const ingredient = recipeData.ingredients[i];
        
        // First, insert or get ingredient in master ingredients table
        const ingredientQuery = `
          INSERT INTO ingredients (name, category)
          VALUES ($1, $2)
          ON CONFLICT (name) DO UPDATE SET 
            category = COALESCE(ingredients.category, EXCLUDED.category),
            updated_at = NOW()
          RETURNING id
        `;
        
        // Determine ingredient category based on name (basic categorization)
        let category = 'other';
        const name = ingredient.name.toLowerCase();
        if (name.includes('chicken') || name.includes('beef') || name.includes('pork') || name.includes('fish') || name.includes('egg')) {
          category = 'protein';
        } else if (name.includes('pepper') || name.includes('carrot') || name.includes('broccoli') || name.includes('garlic')) {
          category = 'vegetable';
        } else if (name.includes('flour') || name.includes('sugar') || name.includes('baking')) {
          category = 'baking';
        } else if (name.includes('oil') || name.includes('butter')) {
          category = 'fat';
        } else if (name.includes('cheese') || name.includes('milk')) {
          category = 'dairy';
        }
        
        const ingredientResult = await client.query(ingredientQuery, [
          ingredient.name,
          category
        ]);
        const ingredientId = ingredientResult.rows[0].id;
        
        // Then, insert recipe_ingredient relationship with correct column names
        const recipeIngredientQuery = `
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, preparation, optional)
          VALUES ($1, $2, $3, $4, $5, $6)
        `;
        
        await client.query(recipeIngredientQuery, [
          recipeId,
          ingredientId,
          ingredient.quantity,
          ingredient.unit,
          ingredient.preparation,
          ingredient.optional || false
        ]);
      }
      
      console.log(`Added ${recipeData.ingredients.length} ingredients for ${recipeData.title}`);
    }
    
    await client.query('COMMIT');
    console.log('Database seeding completed successfully!');
    
    // Show summary
    const recipesCount = await client.query('SELECT COUNT(*) FROM recipes');
    const ingredientsCount = await client.query('SELECT COUNT(*) FROM ingredients');
    const relationshipsCount = await client.query('SELECT COUNT(*) FROM recipe_ingredients');
    
    console.log('\n=== Seeding Summary ===');
    console.log(`Recipes created: ${recipesCount.rows[0].count}`);
    console.log(`Ingredients created: ${ingredientsCount.rows[0].count}`);
    console.log(`Recipe-ingredient relationships: ${relationshipsCount.rows[0].count}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run seeding
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };