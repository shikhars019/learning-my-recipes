import apiClient from './api';

/**
 * Recipe Service
 * 
 * Handles all recipe-related API calls including CRUD operations,
 * search, filtering, and media uploads.
 * 
 * Educational Notes:
 * - Implements complete CRUD operations
 * - Handles file uploads for recipe images
 * - Provides search and filtering capabilities
 * - Demonstrates API service layer patterns
 */

export const recipeService = {
  /**
   * Get all recipes with optional filters and pagination
   */
  async getRecipes(params = {}) {
    const {
      page = 1,
      limit = 20,
      category,
      difficulty,
      maxCookingTime,
      dietary,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      ...filters
    } = params;

    return apiClient.get('/api/recipes', {
      page,
      limit,
      category,
      difficulty,
      maxCookingTime,
      dietary: Array.isArray(dietary) ? dietary.join(',') : dietary,
      sortBy,
      sortOrder,
      ...filters,
    });
  },

  /**
   * Get a single recipe by ID
   */
  async getRecipe(id) {
    if (!id) {
      throw new Error('Recipe ID is required');
    }
    return apiClient.get(`/api/recipes/${id}`);
  },

  /**
   * Create a new recipe
   */
  async createRecipe(recipeData) {
    const {
      title,
      description,
      ingredients,
      instructions,
      cookingTime,
      servings,
      difficulty,
      category,
      dietary = [],
      tags = [],
      image,
      ...otherData
    } = recipeData;

    // Validate required fields
    if (!title || !ingredients || !instructions) {
      throw new Error('Title, ingredients, and instructions are required');
    }

    const recipe = {
      title: title.trim(),
      description: description?.trim() || '',
      ingredients: Array.isArray(ingredients) ? ingredients : [],
      instructions: Array.isArray(instructions) ? instructions : [],
      cookingTime: Number(cookingTime) || 30,
      servings: Number(servings) || 4,
      difficulty: difficulty || 'medium',
      category: category || 'other',
      dietary: Array.isArray(dietary) ? dietary : [],
      tags: Array.isArray(tags) ? tags : [],
      ...otherData,
    };

    return apiClient.post('/recipes', recipe);
  },

  /**
   * Update an existing recipe
   */
  async updateRecipe(id, recipeData) {
    if (!id) {
      throw new Error('Recipe ID is required');
    }

    return apiClient.put(`/recipes/${id}`, recipeData);
  },

  /**
   * Partially update a recipe
   */
  async patchRecipe(id, updates) {
    if (!id) {
      throw new Error('Recipe ID is required');
    }

    return apiClient.patch(`/recipes/${id}`, updates);
  },

  /**
   * Delete a recipe
   */
  async deleteRecipe(id) {
    if (!id) {
      throw new Error('Recipe ID is required');
    }

    return apiClient.delete(`/recipes/${id}`);
  },

  /**
   * Search recipes by query
   */
  async searchRecipes(query, params = {}) {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    const {
      page = 1,
      limit = 20,
      sortBy = 'relevance',
      sortOrder = 'desc',
      ...filters
    } = params;

    return apiClient.get('/recipes/search', {
      q: query.trim(),
      page,
      limit,
      sortBy,
      sortOrder,
      ...filters,
    });
  },

  /**
   * Get recipe suggestions based on ingredients
   */
  async getRecipeSuggestions(ingredients = []) {
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      throw new Error('At least one ingredient is required');
    }

    return apiClient.post('/recipes/suggestions', {
      ingredients: ingredients.map(ing => ing.trim()).filter(Boolean),
    });
  },

  /**
   * Get popular/trending recipes
   */
  async getPopularRecipes(params = {}) {
    const { limit = 10, timeframe = 'week' } = params;

    return apiClient.get('/recipes/popular', {
      limit,
      timeframe, // 'day', 'week', 'month', 'all'
    });
  },

  /**
   * Get recent recipes
   */
  async getRecentRecipes(params = {}) {
    const { limit = 10 } = params;

    return apiClient.get('/recipes/recent', { limit });
  },

  /**
   * Get recipes by category
   */
  async getRecipesByCategory(category, params = {}) {
    if (!category) {
      throw new Error('Category is required');
    }

    const { page = 1, limit = 20 } = params;

    return apiClient.get(`/recipes/category/${category}`, {
      page,
      limit,
      ...params,
    });
  },

  /**
   * Get recipes by user ID
   */
  async getUserRecipes(userId, params = {}) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const { page = 1, limit = 20 } = params;

    return apiClient.get(`/recipes/user/${userId}`, {
      page,
      limit,
      ...params,
    });
  },

  /**
   * Upload recipe image
   */
  async uploadRecipeImage(recipeId, imageFile) {
    if (!recipeId) {
      throw new Error('Recipe ID is required');
    }

    if (!imageFile) {
      throw new Error('Image file is required');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(imageFile.type)) {
      throw new Error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (imageFile.size > maxSize) {
      throw new Error('File size too large. Please upload an image smaller than 5MB.');
    }

    const formData = new FormData();
    formData.append('image', imageFile);

    return apiClient.upload(`/recipes/${recipeId}/image`, formData);
  },

  /**
   * Delete recipe image
   */
  async deleteRecipeImage(recipeId) {
    if (!recipeId) {
      throw new Error('Recipe ID is required');
    }

    return apiClient.delete(`/recipes/${recipeId}/image`);
  },

  /**
   * Rate a recipe
   */
  async rateRecipe(recipeId, rating) {
    if (!recipeId) {
      throw new Error('Recipe ID is required');
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      throw new Error('Rating must be a number between 1 and 5');
    }

    return apiClient.post(`/recipes/${recipeId}/rating`, {
      rating: Math.round(rating), // Ensure integer rating
    });
  },

  /**
   * Add recipe to favorites
   */
  async addToFavorites(recipeId) {
    if (!recipeId) {
      throw new Error('Recipe ID is required');
    }

    return apiClient.post(`/recipes/${recipeId}/favorite`);
  },

  /**
   * Remove recipe from favorites
   */
  async removeFromFavorites(recipeId) {
    if (!recipeId) {
      throw new Error('Recipe ID is required');
    }

    return apiClient.delete(`/recipes/${recipeId}/favorite`);
  },

  /**
   * Get user's favorite recipes
   */
  async getFavoriteRecipes(params = {}) {
    const { page = 1, limit = 20 } = params;

    return apiClient.get('/recipes/favorites', {
      page,
      limit,
      ...params,
    });
  },

  /**
   * Add comment to recipe
   */
  async addComment(recipeId, comment) {
    if (!recipeId) {
      throw new Error('Recipe ID is required');
    }

    if (!comment || comment.trim().length === 0) {
      throw new Error('Comment text is required');
    }

    return apiClient.post(`/recipes/${recipeId}/comments`, {
      text: comment.trim(),
    });
  },

  /**
   * Get recipe comments
   */
  async getComments(recipeId, params = {}) {
    if (!recipeId) {
      throw new Error('Recipe ID is required');
    }

    const { page = 1, limit = 20 } = params;

    return apiClient.get(`/recipes/${recipeId}/comments`, {
      page,
      limit,
    });
  },

  /**
   * Delete a comment
   */
  async deleteComment(recipeId, commentId) {
    if (!recipeId || !commentId) {
      throw new Error('Recipe ID and Comment ID are required');
    }

    return apiClient.delete(`/recipes/${recipeId}/comments/${commentId}`);
  },

  /**
   * Get recipe categories
   */
  async getCategories() {
    return apiClient.get('/recipes/categories');
  },

  /**
   * Get available dietary options
   */
  async getDietaryOptions() {
    return apiClient.get('/recipes/dietary-options');
  },

  /**
   * Get recipe statistics
   */
  async getRecipeStats(recipeId) {
    if (!recipeId) {
      throw new Error('Recipe ID is required');
    }

    return apiClient.get(`/recipes/${recipeId}/stats`);
  },

  /**
   * Report a recipe (for moderation)
   */
  async reportRecipe(recipeId, reason, description = '') {
    if (!recipeId) {
      throw new Error('Recipe ID is required');
    }

    if (!reason) {
      throw new Error('Report reason is required');
    }

    return apiClient.post(`/recipes/${recipeId}/report`, {
      reason,
      description: description.trim(),
    });
  },
};

export default recipeService;