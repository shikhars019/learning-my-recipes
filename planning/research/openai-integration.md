# OpenAI Integration Research for Recipe Generation

## Overview
This document researches OpenAI integration patterns for generating recipes based on available ingredients, focusing on basic prompt engineering suitable for educational purposes.

## OpenAI Integration Approaches

### 1. Library and Setup Requirements

#### Core Dependencies
```javascript
// Node.js backend
{
  "dependencies": {
    "openai": "^4.20.0",        // Official OpenAI SDK
    "dotenv": "^16.3.0",        // Environment variables
    "express-rate-limit": "^7.1.0", // Rate limiting
    "express-validator": "^7.0.0"   // Input validation
  }
}
```

#### Environment Configuration
```env
# .env file
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=10     # Per window per IP
```

### 2. Basic Integration Pattern

#### OpenAI Service Module
```javascript
// services/openaiService.js
const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 1000;
    this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7;
  }

  async generateRecipe(ingredients, preferences = {}) {
    try {
      const prompt = this.buildPrompt(ingredients, preferences);
      
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt()
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      });

      const response = completion.choices[0].message.content;
      return this.parseRecipeResponse(response);
      
    } catch (error) {
      throw this.handleOpenAIError(error);
    }
  }

  getSystemPrompt() {
    return `You are a helpful cooking assistant that creates detailed recipes based on available ingredients.

Guidelines:
- Create practical, easy-to-follow recipes
- Use only the ingredients provided when possible
- Suggest common pantry items (salt, pepper, oil) if needed
- Provide clear step-by-step instructions
- Include cooking times and serving information
- Format your response consistently

Always respond in this exact format:
RECIPE NAME: [Recipe name]
PREP TIME: [X minutes]
COOK TIME: [X minutes]
SERVINGS: [X people]
DIFFICULTY: [Easy/Medium/Hard]

INGREDIENTS:
- [Ingredient 1 with quantity]
- [Ingredient 2 with quantity]
...

INSTRUCTIONS:
1. [First step]
2. [Second step]
...

TIPS:
[Optional cooking tips or variations]`;
  }

  buildPrompt(ingredients, preferences) {
    let prompt = `Create a recipe using these available ingredients: ${ingredients.join(', ')}.\n\n`;

    // Add preferences if provided
    if (preferences.cuisineType) {
      prompt += `Cuisine style: ${preferences.cuisineType}\n`;
    }

    if (preferences.mealType) {
      prompt += `Meal type: ${preferences.mealType}\n`;
    }

    if (preferences.difficulty) {
      prompt += `Difficulty level: ${preferences.difficulty}\n`;
    }

    if (preferences.maxTime) {
      prompt += `Maximum total cooking time: ${preferences.maxTime} minutes\n`;
    }

    if (preferences.dietaryRestrictions && preferences.dietaryRestrictions.length > 0) {
      prompt += `Dietary restrictions: ${preferences.dietaryRestrictions.join(', ')}\n`;
    }

    prompt += '\nPlease create a detailed recipe following the format specified in your instructions.';
    
    return prompt;
  }

  parseRecipeResponse(response) {
    const lines = response.split('\n').map(line => line.trim()).filter(line => line);
    const recipe = {
      source: 'AI Generated',
      generatedAt: new Date().toISOString(),
      rawResponse: response
    };

    let currentSection = null;
    let ingredients = [];
    let instructions = [];
    let tips = [];

    for (const line of lines) {
      if (line.startsWith('RECIPE NAME:')) {
        recipe.name = line.replace('RECIPE NAME:', '').trim();
      } else if (line.startsWith('PREP TIME:')) {
        const prepMatch = line.match(/(\d+)/);
        recipe.prepTimeMinutes = prepMatch ? parseInt(prepMatch[1]) : null;
      } else if (line.startsWith('COOK TIME:')) {
        const cookMatch = line.match(/(\d+)/);
        recipe.cookTimeMinutes = cookMatch ? parseInt(cookMatch[1]) : null;
      } else if (line.startsWith('SERVINGS:')) {
        const servingMatch = line.match(/(\d+)/);
        recipe.servings = servingMatch ? parseInt(servingMatch[1]) : null;
      } else if (line.startsWith('DIFFICULTY:')) {
        recipe.difficulty = line.replace('DIFFICULTY:', '').trim().toLowerCase();
      } else if (line === 'INGREDIENTS:') {
        currentSection = 'ingredients';
      } else if (line === 'INSTRUCTIONS:') {
        currentSection = 'instructions';
      } else if (line === 'TIPS:') {
        currentSection = 'tips';
      } else if (line.startsWith('-') && currentSection === 'ingredients') {
        ingredients.push(line.replace('-', '').trim());
      } else if (line.match(/^\d+\./) && currentSection === 'instructions') {
        instructions.push(line.replace(/^\d+\.\s*/, '').trim());
      } else if (currentSection === 'tips' && line) {
        tips.push(line);
      }
    }

    recipe.ingredients = ingredients;
    recipe.instructions = instructions.join('\n');
    recipe.tips = tips.join(' ');

    return recipe;
  }

  handleOpenAIError(error) {
    // Map OpenAI errors to user-friendly messages
    if (error.code === 'insufficient_quota') {
      return new Error('AI service temporarily unavailable. Please try again later.');
    }
    
    if (error.code === 'rate_limit_exceeded') {
      return new Error('Too many requests. Please wait a moment before trying again.');
    }
    
    if (error.code === 'invalid_api_key') {
      return new Error('AI service configuration error.');
    }

    if (error.status === 400) {
      return new Error('Invalid request. Please check your ingredients list.');
    }

    return new Error('AI service error. Please try again.');
  }
}

module.exports = new OpenAIService();
```

### 3. Express Route Implementation

#### AI Controller
```javascript
// controllers/aiController.js
const { body, validationResult } = require('express-validator');
const openaiService = require('../services/openaiService');
const rateLimit = require('express-rate-limit');

// Rate limiting for AI endpoint
const aiRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many AI requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

class AIController {
  // Input validation middleware
  static validateGenerateRequest = [
    body('ingredients')
      .isArray({ min: 1 })
      .withMessage('Ingredients must be a non-empty array'),
    body('ingredients.*')
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Each ingredient must be a string between 1-100 characters'),
    body('preferences.cuisineType')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 50 }),
    body('preferences.mealType')
      .optional()
      .isString()
      .trim()
      .isIn(['breakfast', 'lunch', 'dinner', 'snack', 'dessert']),
    body('preferences.difficulty')
      .optional()
      .isString()
      .trim()
      .isIn(['easy', 'medium', 'hard']),
    body('preferences.maxTime')
      .optional()
      .isInt({ min: 5, max: 300 })
      .withMessage('Max time must be between 5-300 minutes'),
    body('preferences.dietaryRestrictions')
      .optional()
      .isArray()
      .withMessage('Dietary restrictions must be an array'),
  ];

  static async generateRecipe(req, res, next) {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { ingredients, preferences = {} } = req.body;

      // Validate API key is configured
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({
          error: 'AI service not configured',
          message: 'Recipe generation is temporarily unavailable'
        });
      }

      // Generate recipe using OpenAI
      const recipe = await openaiService.generateRecipe(ingredients, preferences);

      res.json({
        success: true,
        recipe,
        requestInfo: {
          ingredients,
          preferences,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      // Log error for monitoring
      console.error('AI Recipe Generation Error:', {
        error: error.message,
        ingredients: req.body.ingredients,
        preferences: req.body.preferences,
        timestamp: new Date().toISOString()
      });

      res.status(500).json({
        error: error.message || 'Failed to generate recipe',
        suggestion: 'Please try again with different ingredients or check your internet connection'
      });
    }
  }

  static async getAIStatus(req, res) {
    try {
      const isConfigured = !!process.env.OPENAI_API_KEY;
      
      res.json({
        available: isConfigured,
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        rateLimit: {
          windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
          maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Unable to check AI service status' });
    }
  }
}

module.exports = { AIController, aiRateLimit };
```

#### Express Routes
```javascript
// routes/ai.js
const express = require('express');
const { AIController, aiRateLimit } = require('../controllers/aiController');

const router = express.Router();

// Apply rate limiting to AI endpoints
router.use(aiRateLimit);

// AI recipe generation endpoint
router.post('/generate-recipe', 
  AIController.validateGenerateRequest,
  AIController.generateRecipe
);

// AI service status endpoint
router.get('/status', AIController.getAIStatus);

module.exports = router;
```

### 4. Frontend Integration

#### React Hook for AI Recipe Generation
```jsx
// hooks/useAIRecipeGeneration.js
import { useState } from 'react';

const useAIRecipeGeneration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recipe, setRecipe] = useState(null);

  const generateRecipe = async (ingredients, preferences = {}) => {
    setLoading(true);
    setError(null);
    setRecipe(null);

    try {
      const response = await fetch('/api/ai/generate-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredients,
          preferences
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate recipe');
      }

      setRecipe(data.recipe);
      return data.recipe;

    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearRecipe = () => {
    setRecipe(null);
    setError(null);
  };

  return {
    generateRecipe,
    clearRecipe,
    loading,
    error,
    recipe
  };
};

export default useAIRecipeGeneration;
```

#### React Component for AI Recipe Generation
```jsx
// components/AIRecipeGenerator.jsx
import React, { useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button,
  Chip, Typography, CircularProgress, Alert,
  Autocomplete, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { AutoAwesome } from '@mui/icons-material';
import useAIRecipeGeneration from '../hooks/useAIRecipeGeneration';

const AIRecipeGenerator = ({ availableIngredients = [] }) => {
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [preferences, setPreferences] = useState({
    cuisineType: '',
    mealType: '',
    difficulty: '',
    maxTime: '',
    dietaryRestrictions: []
  });

  const { generateRecipe, loading, error, recipe } = useAIRecipeGeneration();

  const handleGenerate = async () => {
    if (selectedIngredients.length === 0) {
      return;
    }

    try {
      await generateRecipe(selectedIngredients, preferences);
    } catch (err) {
      // Error is handled by the hook
      console.error('Recipe generation failed:', err);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesome color="primary" />
            AI Recipe Generator
          </Typography>

          {/* Ingredient Selection */}
          <Box sx={{ mb: 3 }}>
            <Autocomplete
              multiple
              options={availableIngredients}
              value={selectedIngredients}
              onChange={(event, newValue) => setSelectedIngredients(newValue)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Ingredients"
                  placeholder="Choose ingredients you have available"
                  helperText="Select at least one ingredient to generate a recipe"
                />
              )}
            />
          </Box>

          {/* Preferences */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
            <FormControl size="small">
              <InputLabel>Cuisine Type</InputLabel>
              <Select
                value={preferences.cuisineType}
                label="Cuisine Type"
                onChange={(e) => setPreferences(prev => ({ ...prev, cuisineType: e.target.value }))}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="italian">Italian</MenuItem>
                <MenuItem value="asian">Asian</MenuItem>
                <MenuItem value="mexican">Mexican</MenuItem>
                <MenuItem value="mediterranean">Mediterranean</MenuItem>
                <MenuItem value="american">American</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small">
              <InputLabel>Meal Type</InputLabel>
              <Select
                value={preferences.mealType}
                label="Meal Type"
                onChange={(e) => setPreferences(prev => ({ ...prev, mealType: e.target.value }))}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="breakfast">Breakfast</MenuItem>
                <MenuItem value="lunch">Lunch</MenuItem>
                <MenuItem value="dinner">Dinner</MenuItem>
                <MenuItem value="snack">Snack</MenuItem>
                <MenuItem value="dessert">Dessert</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small">
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={preferences.difficulty}
                label="Difficulty"
                onChange={(e) => setPreferences(prev => ({ ...prev, difficulty: e.target.value }))}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="easy">Easy</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="hard">Hard</MenuItem>
              </Select>
            </FormControl>

            <TextField
              size="small"
              label="Max Time (minutes)"
              type="number"
              value={preferences.maxTime}
              onChange={(e) => setPreferences(prev => ({ ...prev, maxTime: e.target.value }))}
              inputProps={{ min: 5, max: 300 }}
            />
          </Box>

          {/* Generate Button */}
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={loading || selectedIngredients.length === 0}
            startIcon={loading ? <CircularProgress size={20} /> : <AutoAwesome />}
            fullWidth
            sx={{ mb: 2 }}
          >
            {loading ? 'Generating Recipe...' : 'Generate Recipe'}
          </Button>

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Generated Recipe Display */}
          {recipe && (
            <Card variant="outlined" sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {recipe.name}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {recipe.prepTimeMinutes && (
                    <Chip label={`Prep: ${recipe.prepTimeMinutes}m`} size="small" />
                  )}
                  {recipe.cookTimeMinutes && (
                    <Chip label={`Cook: ${recipe.cookTimeMinutes}m`} size="small" />
                  )}
                  {recipe.servings && (
                    <Chip label={`Serves: ${recipe.servings}`} size="small" />
                  )}
                  {recipe.difficulty && (
                    <Chip label={recipe.difficulty} size="small" color="secondary" />
                  )}
                </Box>

                {recipe.ingredients && recipe.ingredients.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Ingredients:</Typography>
                    {recipe.ingredients.map((ingredient, index) => (
                      <Typography key={index} variant="body2" sx={{ ml: 1 }}>
                        • {ingredient}
                      </Typography>
                    ))}
                  </Box>
                )}

                {recipe.instructions && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Instructions:</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                      {recipe.instructions}
                    </Typography>
                  </Box>
                )}

                {recipe.tips && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Tips:</Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                      {recipe.tips}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AIRecipeGenerator;
```

## Educational Benefits

### 1. Key Learning Concepts
- **API Integration**: Working with external AI services
- **Prompt Engineering**: Crafting effective prompts for AI
- **Error Handling**: Managing API failures and rate limits
- **Input Validation**: Sanitizing user input for AI requests
- **Rate Limiting**: Preventing API abuse
- **Response Parsing**: Processing AI-generated text

### 2. Best Practices Demonstrated
- **Security**: API key management and validation
- **Performance**: Rate limiting and error recovery
- **User Experience**: Loading states and error messages
- **Code Organization**: Service layer pattern
- **Testing**: Mockable AI service for unit tests

### 3. Progressive Implementation
- **Branch 4**: Basic AI integration with simple prompts
- **Branch 5**: Enhanced features with preferences and better parsing

This implementation provides a solid foundation for teaching AI integration while maintaining simplicity and educational value suitable for graduate-level learning.