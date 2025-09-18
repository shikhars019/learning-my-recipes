/**
 * Services Index
 * 
 * Central export file for all API services.
 * This provides a convenient way to import services throughout the application.
 * 
 * Educational Notes:
 * - Demonstrates barrel export pattern for services
 * - Simplifies imports across the application
 * - Provides clear service organization
 * - Includes API client for direct use when needed
 */

// API Client
export { default as apiClient, ApiClient, API_BASE_URL, API_ERRORS, getErrorType } from './api';

// Service modules
export { default as recipeService } from './recipeService';
export { default as userService } from './userService';
export { default as shoppingListService } from './shoppingListService';

// Named exports for convenience
export { recipeService } from './recipeService';
export { userService } from './userService';
export { shoppingListService } from './shoppingListService';

/**
 * Combined services object for easy access
 */
export const services = {
  recipe: require('./recipeService').default,
  user: require('./userService').default,
  shoppingList: require('./shoppingListService').default,
};

export default services;