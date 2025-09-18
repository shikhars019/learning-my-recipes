import apiClient from './api';

/**
 * Shopping List Service
 * 
 * Handles all shopping list and ingredient management API calls
 * including CRUD operations for shopping lists and ingredient tracking.
 * 
 * Educational Notes:
 * - Manages shopping list functionality
 * - Handles ingredient quantity calculations
 * - Provides list sharing and collaboration features
 * - Demonstrates list management patterns
 */

export const shoppingListService = {
  /**
   * Get all shopping lists for the current user
   */
  async getShoppingLists(params = {}) {
    const { page = 1, limit = 20, sortBy = 'updatedAt', sortOrder = 'desc' } = params;

    return apiClient.get('/shopping-lists', {
      page,
      limit,
      sortBy,
      sortOrder,
    });
  },

  /**
   * Get a specific shopping list by ID
   */
  async getShoppingList(listId) {
    if (!listId) {
      throw new Error('Shopping list ID is required');
    }

    return apiClient.get(`/shopping-lists/${listId}`);
  },

  /**
   * Create a new shopping list
   */
  async createShoppingList(listData) {
    const {
      name,
      description = '',
      items = [],
      isShared = false,
      ...otherData
    } = listData;

    if (!name || name.trim().length === 0) {
      throw new Error('Shopping list name is required');
    }

    const shoppingList = {
      name: name.trim(),
      description: description.trim(),
      items: Array.isArray(items) ? items : [],
      isShared,
      ...otherData,
    };

    return apiClient.post('/shopping-lists', shoppingList);
  },

  /**
   * Update a shopping list
   */
  async updateShoppingList(listId, listData) {
    if (!listId) {
      throw new Error('Shopping list ID is required');
    }

    return apiClient.put(`/shopping-lists/${listId}`, listData);
  },

  /**
   * Delete a shopping list
   */
  async deleteShoppingList(listId) {
    if (!listId) {
      throw new Error('Shopping list ID is required');
    }

    return apiClient.delete(`/shopping-lists/${listId}`);
  },

  /**
   * Add item to shopping list
   */
  async addItem(listId, itemData) {
    if (!listId) {
      throw new Error('Shopping list ID is required');
    }

    const {
      name,
      quantity = 1,
      unit = '',
      category = 'other',
      notes = '',
      priority = 'medium',
      ...otherData
    } = itemData;

    if (!name || name.trim().length === 0) {
      throw new Error('Item name is required');
    }

    const item = {
      name: name.trim(),
      quantity: Number(quantity) || 1,
      unit: unit.trim(),
      category,
      notes: notes.trim(),
      priority,
      isCompleted: false,
      ...otherData,
    };

    return apiClient.post(`/shopping-lists/${listId}/items`, item);
  },

  /**
   * Update an item in the shopping list
   */
  async updateItem(listId, itemId, itemData) {
    if (!listId || !itemId) {
      throw new Error('Shopping list ID and item ID are required');
    }

    return apiClient.put(`/shopping-lists/${listId}/items/${itemId}`, itemData);
  },

  /**
   * Delete an item from the shopping list
   */
  async deleteItem(listId, itemId) {
    if (!listId || !itemId) {
      throw new Error('Shopping list ID and item ID are required');
    }

    return apiClient.delete(`/shopping-lists/${listId}/items/${itemId}`);
  },

  /**
   * Toggle item completion status
   */
  async toggleItemCompletion(listId, itemId, isCompleted) {
    if (!listId || !itemId) {
      throw new Error('Shopping list ID and item ID are required');
    }

    return apiClient.patch(`/shopping-lists/${listId}/items/${itemId}`, {
      isCompleted: Boolean(isCompleted),
    });
  },

  /**
   * Mark all items as completed/uncompleted
   */
  async toggleAllItemsCompletion(listId, isCompleted) {
    if (!listId) {
      throw new Error('Shopping list ID is required');
    }

    return apiClient.patch(`/shopping-lists/${listId}/items/toggle-all`, {
      isCompleted: Boolean(isCompleted),
    });
  },

  /**
   * Clear completed items from the shopping list
   */
  async clearCompletedItems(listId) {
    if (!listId) {
      throw new Error('Shopping list ID is required');
    }

    return apiClient.delete(`/shopping-lists/${listId}/items/completed`);
  },

  /**
   * Add recipe ingredients to shopping list
   */
  async addRecipeToList(listId, recipeId, servings) {
    if (!listId || !recipeId) {
      throw new Error('Shopping list ID and recipe ID are required');
    }

    const data = {
      recipeId,
      servings: Number(servings) || 1,
    };

    return apiClient.post(`/shopping-lists/${listId}/recipes`, data);
  },

  /**
   * Remove recipe ingredients from shopping list
   */
  async removeRecipeFromList(listId, recipeId) {
    if (!listId || !recipeId) {
      throw new Error('Shopping list ID and recipe ID are required');
    }

    return apiClient.delete(`/shopping-lists/${listId}/recipes/${recipeId}`);
  },

  /**
   * Get shopping list recipes
   */
  async getListRecipes(listId) {
    if (!listId) {
      throw new Error('Shopping list ID is required');
    }

    return apiClient.get(`/shopping-lists/${listId}/recipes`);
  },

  /**
   * Share shopping list with another user
   */
  async shareList(listId, email, permission = 'view') {
    if (!listId || !email) {
      throw new Error('Shopping list ID and email are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    const validPermissions = ['view', 'edit', 'admin'];
    if (!validPermissions.includes(permission)) {
      throw new Error('Invalid permission. Must be view, edit, or admin');
    }

    return apiClient.post(`/shopping-lists/${listId}/share`, {
      email: email.trim().toLowerCase(),
      permission,
    });
  },

  /**
   * Update sharing permissions
   */
  async updateSharingPermission(listId, userId, permission) {
    if (!listId || !userId || !permission) {
      throw new Error('Shopping list ID, user ID, and permission are required');
    }

    const validPermissions = ['view', 'edit', 'admin'];
    if (!validPermissions.includes(permission)) {
      throw new Error('Invalid permission. Must be view, edit, or admin');
    }

    return apiClient.put(`/shopping-lists/${listId}/share/${userId}`, {
      permission,
    });
  },

  /**
   * Remove user from shared list
   */
  async removeUserFromList(listId, userId) {
    if (!listId || !userId) {
      throw new Error('Shopping list ID and user ID are required');
    }

    return apiClient.delete(`/shopping-lists/${listId}/share/${userId}`);
  },

  /**
   * Get list sharing information
   */
  async getListSharing(listId) {
    if (!listId) {
      throw new Error('Shopping list ID is required');
    }

    return apiClient.get(`/shopping-lists/${listId}/share`);
  },

  /**
   * Get shared lists (lists shared with current user)
   */
  async getSharedLists(params = {}) {
    const { page = 1, limit = 20 } = params;

    return apiClient.get('/shopping-lists/shared', {
      page,
      limit,
    });
  },

  /**
   * Duplicate a shopping list
   */
  async duplicateList(listId, newName) {
    if (!listId) {
      throw new Error('Shopping list ID is required');
    }

    return apiClient.post(`/shopping-lists/${listId}/duplicate`, {
      name: newName?.trim() || `Copy of ${listId}`,
    });
  },

  /**
   * Get shopping list templates
   */
  async getListTemplates() {
    return apiClient.get('/shopping-lists/templates');
  },

  /**
   * Create shopping list from template
   */
  async createFromTemplate(templateId, customName) {
    if (!templateId) {
      throw new Error('Template ID is required');
    }

    return apiClient.post('/shopping-lists/from-template', {
      templateId,
      name: customName?.trim() || undefined,
    });
  },

  /**
   * Get ingredient suggestions based on partial input
   */
  async getIngredientSuggestions(query, params = {}) {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    const { limit = 10, category } = params;

    return apiClient.get('/shopping-lists/ingredient-suggestions', {
      q: query.trim(),
      limit,
      category,
    });
  },

  /**
   * Get popular ingredients
   */
  async getPopularIngredients(params = {}) {
    const { limit = 20, category } = params;

    return apiClient.get('/shopping-lists/popular-ingredients', {
      limit,
      category,
    });
  },

  /**
   * Get ingredient categories
   */
  async getIngredientCategories() {
    return apiClient.get('/shopping-lists/categories');
  },

  /**
   * Optimize shopping list (group by store sections)
   */
  async optimizeList(listId, storeLayout = 'default') {
    if (!listId) {
      throw new Error('Shopping list ID is required');
    }

    return apiClient.post(`/shopping-lists/${listId}/optimize`, {
      storeLayout,
    });
  },

  /**
   * Get list statistics
   */
  async getListStats(listId) {
    if (!listId) {
      throw new Error('Shopping list ID is required');
    }

    return apiClient.get(`/shopping-lists/${listId}/stats`);
  },

  /**
   * Export shopping list (PDF, text, etc.)
   */
  async exportList(listId, format = 'pdf') {
    if (!listId) {
      throw new Error('Shopping list ID is required');
    }

    const validFormats = ['pdf', 'txt', 'csv'];
    if (!validFormats.includes(format)) {
      throw new Error('Invalid format. Must be pdf, txt, or csv');
    }

    return apiClient.get(`/shopping-lists/${listId}/export`, {
      format,
    });
  },
};

export default shoppingListService;