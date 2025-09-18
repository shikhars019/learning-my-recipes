import { useState, useCallback } from 'react';
import { useNotifications } from '../contexts/NotificationContext';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem('recipe-favorites');
      const parsed = stored ? JSON.parse(stored) : [];
      console.log('useFavorites: Loaded favorites from localStorage:', stored);
      console.log('useFavorites: Parsed favorites:', parsed);
      
      // Handle both formats: array of IDs (legacy) and array of objects (new)
      if (parsed.length > 0 && typeof parsed[0] === 'string') {
        console.log('useFavorites: Found legacy format (array of IDs), returning empty array for now');
        // Legacy format - return empty array since FavoritesPage will fetch the data using the IDs
        return [];
      }
      
      return parsed;
    } catch (error) {
      console.warn('Failed to load favorites from localStorage:', error);
      return [];
    }
  });
  
  const { showSuccess, showError } = useNotifications();

  const addToFavorites = useCallback((recipe) => {
    try {
      const updatedFavorites = [...favorites, { ...recipe, addedAt: new Date().toISOString() }];
      setFavorites(updatedFavorites);
      localStorage.setItem('recipe-favorites', JSON.stringify(updatedFavorites));
      showSuccess(`${recipe.title} added to favorites!`);
    } catch (error) {
      console.error('Failed to add to favorites:', error);
      showError('Failed to add recipe to favorites');
    }
  }, [favorites, showSuccess, showError]);

  const removeFromFavorites = useCallback((recipeId) => {
    try {
      const updatedFavorites = favorites.filter(fav => fav.id !== recipeId);
      setFavorites(updatedFavorites);
      localStorage.setItem('recipe-favorites', JSON.stringify(updatedFavorites));
      showSuccess('Recipe removed from favorites');
    } catch (error) {
      console.error('Failed to remove from favorites:', error);
      showError('Failed to remove recipe from favorites');
    }
  }, [favorites, showSuccess, showError]);

  const toggleFavorite = useCallback((recipe) => {
    const isFavorite = favorites.some(fav => fav.id === recipe.id);
    if (isFavorite) {
      removeFromFavorites(recipe.id);
    } else {
      addToFavorites(recipe);
    }
  }, [favorites, addToFavorites, removeFromFavorites]);

  const isFavorite = useCallback((recipeId) => {
    return favorites.some(fav => fav.id === recipeId);
  }, [favorites]);

  const clearFavorites = useCallback(() => {
    try {
      setFavorites([]);
      localStorage.removeItem('recipe-favorites');
      showSuccess('All favorites cleared');
    } catch (error) {
      console.error('Failed to clear favorites:', error);
      showError('Failed to clear favorites');
    }
  }, [showSuccess, showError]);

  return {
    favorites,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    clearFavorites,
    favoritesCount: favorites.length
  };
};