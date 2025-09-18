/**
 * OpenAI Service
 * 
 * Handles AI-powered recipe generation using OpenAI's GPT models.
 * Generates recipes based on provided ingredients with proper error handling.
 */

const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    this.openai = null;
    this.isConfigured = false;
    
    // Initialize OpenAI client if API key is provided
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        organization: 'org-H41ebCFlfg4s04h45zr6BmnF',
      });
      this.isConfigured = true;
      console.log('✅ OpenAI service initialized with organization');
    } else {
      console.log('⚠️ OpenAI API key not configured. AI recipe generation will be unavailable.');
    }
  }

  /**
   * Check if OpenAI service is properly configured
   */
  isAvailable() {
    return this.isConfigured;
  }

  /**
   * Generate a recipe based on provided ingredients
   * @param {Array<string>} ingredients - List of ingredient names
   * @param {string} cuisineType - Optional cuisine preference
   * @param {string} mealType - Optional meal type (breakfast, lunch, dinner, snack)
   * @returns {Promise<Object>} Generated recipe object
   */
  async generateRecipe(ingredients, cuisineType = null, mealType = null) {
    if (!this.isAvailable()) {
      throw new Error('OpenAI service is not configured. Please check your API key.');
    }

    if (!ingredients || ingredients.length === 0) {
      throw new Error('At least one ingredient is required to generate a recipe.');
    }

    // Validate ingredients array
    const validIngredients = ingredients.filter(ingredient => 
      ingredient && typeof ingredient === 'string' && ingredient.trim().length > 0
    );

    if (validIngredients.length === 0) {
      throw new Error('Please provide valid ingredient names.');
    }

    try {
      const prompt = this.buildPrompt(validIngredients, cuisineType, mealType);
      
      console.log(`🤖 Generating recipe for ingredients: ${validIngredients.join(', ')}`);
      console.log('📤 Request parameters:');
      console.log(`Model: ${process.env.OPENAI_MODEL || 'gpt-3.5-turbo'}`);
      console.log(`Max completion tokens: ${parseInt(process.env.OPENAI_MAX_TOKENS) || 1000}`);
      console.log(`Prompt length: ${prompt.length} characters`);
      
      const requestParams = {
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional chef and recipe developer. Generate creative, practical recipes that are easy to follow.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
        temperature: 1, // Creative but not too random
      };
      
      const response = await this.openai.chat.completions.create(requestParams);

      // Log the complete raw response for debugging
      console.log('🔍 RAW OpenAI Response:');
      console.log(JSON.stringify(response, null, 2));

      // Check response structure
      console.log('🔍 Response structure analysis:');
      console.log('Response exists:', !!response);
      console.log('Choices array exists:', !!response?.choices);
      console.log('Choices array length:', response?.choices?.length);
      console.log('First choice exists:', !!response?.choices?.[0]);
      console.log('Message exists:', !!response?.choices?.[0]?.message);
      console.log('Content exists:', !!response?.choices?.[0]?.message?.content);

      const recipeText = response.choices[0]?.message?.content;
      
      // Log the extracted recipe text
      console.log('📝 Extracted Recipe Text:');
      console.log('Recipe text type:', typeof recipeText);
      console.log('Recipe text length:', recipeText?.length);
      console.log('Recipe text content:', recipeText);
      
      if (!recipeText || recipeText.trim() === '') {
        console.error('❌ Empty or missing recipe content from OpenAI');
        throw new Error('No recipe content received from OpenAI');
      }

      // Parse the response into structured data
      const parsedRecipe = this.parseRecipeResponse(recipeText, validIngredients);
      
      console.log(`✅ Recipe generated successfully: ${parsedRecipe.title}`);
      
      return parsedRecipe;

    } catch (error) {
      console.error('❌ OpenAI API Error Details:');
      console.error('Error message:', error.message);
      console.error('Error status:', error.status);
      console.error('Error code:', error.code);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      
      // Handle different types of errors
      if (error.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your configuration.');
      } else if (error.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      } else if (error.status === 500) {
        throw new Error('OpenAI service is temporarily unavailable. Please try again later.');
      } else {
        throw new Error(`Failed to generate recipe: ${error.message}`);
      }
    }
  }

  /**
   * Build the prompt for recipe generation
   * @private
   */
  buildPrompt(ingredients, cuisineType, mealType) {
    let prompt = `Create a recipe using: ${ingredients.join(', ')}`;

    if (cuisineType) {
      prompt += ` (${cuisineType} style)`;
    }

    if (mealType) {
      prompt += ` for ${mealType}`;
    }

    prompt += `\n\nFormat:
TITLE: [Recipe Name]
DESCRIPTION: [Brief description]
DIFFICULTY: Easy/Medium/Hard
PREP_TIME: [X minutes]
COOK_TIME: [X minutes]
SERVINGS: [X people]

INGREDIENTS:
- [Ingredient with quantity]
- [Additional ingredients as needed]

INSTRUCTIONS:
1. [Step 1]
2. [Step 2]
3. [Continue...]

TIPS: [Optional tips]`;

    return prompt;
  }

  /**
   * Parse the OpenAI response into structured recipe data
   * @private
   */
  parseRecipeResponse(recipeText, originalIngredients) {
    try {
      const lines = recipeText.split('\n').map(line => line.trim()).filter(line => line);
      
      const recipe = {
        title: 'AI Generated Recipe',
        description: 'A delicious recipe generated by AI',
        difficulty_level: 'Medium',
        prep_time: 15,
        cook_time: 30,
        servings: 4,
        ingredients: [],
        instructions: [],
        tips: '',
        source: 'AI Generated',
        generated_from_ingredients: originalIngredients,
        generated_at: new Date().toISOString()
      };

      let currentSection = '';
      let instructionStep = 1;

      for (const line of lines) {
        if (line.startsWith('TITLE:')) {
          recipe.title = line.replace('TITLE:', '').trim();
        } else if (line.startsWith('DESCRIPTION:')) {
          recipe.description = line.replace('DESCRIPTION:', '').trim();
        } else if (line.startsWith('DIFFICULTY:')) {
          recipe.difficulty_level = line.replace('DIFFICULTY:', '').trim();
        } else if (line.startsWith('PREP_TIME:')) {
          const prepTime = line.replace('PREP_TIME:', '').trim().match(/\d+/);
          recipe.prep_time = prepTime ? parseInt(prepTime[0]) : 15;
        } else if (line.startsWith('COOK_TIME:')) {
          const cookTime = line.replace('COOK_TIME:', '').trim().match(/\d+/);
          recipe.cook_time = cookTime ? parseInt(cookTime[0]) : 30;
        } else if (line.startsWith('SERVINGS:')) {
          const servings = line.replace('SERVINGS:', '').trim().match(/\d+/);
          recipe.servings = servings ? parseInt(servings[0]) : 4;
        } else if (line === 'INGREDIENTS:') {
          currentSection = 'ingredients';
        } else if (line === 'INSTRUCTIONS:') {
          currentSection = 'instructions';
        } else if (line.startsWith('TIPS:')) {
          recipe.tips = line.replace('TIPS:', '').trim();
          currentSection = '';
        } else if (currentSection === 'ingredients' && line.startsWith('-')) {
          recipe.ingredients.push(line.replace('-', '').trim());
        } else if (currentSection === 'instructions' && /^\d+\./.test(line)) {
          recipe.instructions.push(line.replace(/^\d+\./, '').trim());
        } else if (currentSection === 'instructions' && line && !line.startsWith('TIPS:')) {
          // Continue instruction if it doesn't start with a number
          if (recipe.instructions.length > 0) {
            recipe.instructions[recipe.instructions.length - 1] += ' ' + line;
          }
        }
      }

      // Ensure we have at least some basic content
      if (recipe.ingredients.length === 0) {
        recipe.ingredients = originalIngredients.map(ing => `1 cup ${ing}`);
      }

      if (recipe.instructions.length === 0) {
        recipe.instructions = [
          'Prepare all ingredients according to the ingredient list.',
          'Combine ingredients following your preferred cooking method.',
          'Cook until done and season to taste.',
          'Serve and enjoy!'
        ];
      }

      return recipe;

    } catch (error) {
      console.error('Error parsing recipe response:', error);
      
      // Return a basic recipe structure if parsing fails
      return {
        title: 'AI Generated Recipe',
        description: 'A recipe generated with your selected ingredients',
        difficulty_level: 'Medium',
        prep_time: 15,
        cook_time: 30,
        servings: 4,
        ingredients: originalIngredients.map(ing => `1 cup ${ing}`),
        instructions: [
          'Prepare all ingredients.',
          'Combine and cook as desired.',
          'Season to taste and serve.'
        ],
        tips: 'Adjust quantities and cooking times to your preference.',
        source: 'AI Generated',
        generated_from_ingredients: originalIngredients,
        generated_at: new Date().toISOString(),
        raw_response: recipeText
      };
    }
  }
}

// Export singleton instance
module.exports = new OpenAIService();