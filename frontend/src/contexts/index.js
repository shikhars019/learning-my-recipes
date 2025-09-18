/**
 * Context Index
 * 
 * Central export file for all application contexts.
 * This provides a convenient way to import contexts throughout the application.
 * 
 * Educational Notes:
 * - Demonstrates barrel export pattern
 * - Simplifies imports across the application
 * - Provides clear context organization
 */

// Context providers
export { RecipeProvider, useRecipes } from './RecipeContext';
export { UserProvider, useUser } from './UserContext';
export { SearchProvider, useSearch } from './SearchContext';
export { NotificationProvider, useNotifications, NOTIFICATION_TYPES } from './NotificationContext';

// Context objects (for advanced use cases)
export { default as RecipeContext } from './RecipeContext';
export { default as UserContext } from './UserContext';
export { default as SearchContext } from './SearchContext';
export { default as NotificationContext } from './NotificationContext';