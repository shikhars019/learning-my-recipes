import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { recipeApi } from '../services/api';

/**
 * Recipe Context
 * 
 * Manages recipe-related state throughout the application including
 * recipe data, favorites, and recipe management operations.
 * 
 * Educational Notes:
 * - Uses useReducer for complex state management
 * - Implements Context API pattern for global state
 * - Provides actions for CRUD operations
 * - Demonstrates React performance optimization patterns
 */

// Initial state
const initialState = {
  recipes: [],
  currentRecipe: null,
  favorites: JSON.parse(localStorage.getItem('recipe-favorites') || '[]'),
  recentlyViewed: JSON.parse(localStorage.getItem('recently-viewed') || '[]'),
  loading: false,
  error: null,
  filters: {
    category: '',
    difficulty: '',
    cookingTime: '',
    dietary: [],
  },
  sortBy: 'name', // name, rating, cookingTime, dateCreated
  sortOrder: 'asc', // asc, desc
};

// Action types
const RECIPE_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_RECIPES: 'SET_RECIPES',
  ADD_RECIPE: 'ADD_RECIPE',
  UPDATE_RECIPE: 'UPDATE_RECIPE',
  DELETE_RECIPE: 'DELETE_RECIPE',
  SET_CURRENT_RECIPE: 'SET_CURRENT_RECIPE',
  ADD_TO_FAVORITES: 'ADD_TO_FAVORITES',
  REMOVE_FROM_FAVORITES: 'REMOVE_FROM_FAVORITES',
  ADD_TO_RECENTLY_VIEWED: 'ADD_TO_RECENTLY_VIEWED',
  SET_FILTERS: 'SET_FILTERS',
  CLEAR_FILTERS: 'CLEAR_FILTERS',
  SET_SORT: 'SET_SORT',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Reducer function
function recipeReducer(state, action) {
  switch (action.type) {
    case RECIPE_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
        error: action.payload ? null : state.error,
      };

    case RECIPE_ACTIONS.SET_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case RECIPE_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case RECIPE_ACTIONS.SET_RECIPES:
      return {
        ...state,
        recipes: action.payload,
        loading: false,
        error: null,
      };

    case RECIPE_ACTIONS.ADD_RECIPE:
      return {
        ...state,
        recipes: [action.payload, ...state.recipes],
        loading: false,
        error: null,
      };

    case RECIPE_ACTIONS.UPDATE_RECIPE:
      return {
        ...state,
        recipes: state.recipes.map(recipe =>
          recipe.id === action.payload.id ? action.payload : recipe
        ),
        currentRecipe: state.currentRecipe?.id === action.payload.id
          ? action.payload
          : state.currentRecipe,
        loading: false,
        error: null,
      };

    case RECIPE_ACTIONS.DELETE_RECIPE:
      return {
        ...state,
        recipes: state.recipes.filter(recipe => recipe.id !== action.payload),
        currentRecipe: state.currentRecipe?.id === action.payload
          ? null
          : state.currentRecipe,
        favorites: state.favorites.filter(id => id !== action.payload),
        loading: false,
        error: null,
      };

    case RECIPE_ACTIONS.SET_CURRENT_RECIPE:
      return {
        ...state,
        currentRecipe: action.payload,
        loading: false,
        error: null,
      };

    case RECIPE_ACTIONS.ADD_TO_FAVORITES: {
      const newFavorites = [...state.favorites, action.payload];
      localStorage.setItem('recipe-favorites', JSON.stringify(newFavorites));
      return {
        ...state,
        favorites: newFavorites,
      };
    }

    case RECIPE_ACTIONS.REMOVE_FROM_FAVORITES: {
      const newFavorites = state.favorites.filter(id => id !== action.payload);
      localStorage.setItem('recipe-favorites', JSON.stringify(newFavorites));
      return {
        ...state,
        favorites: newFavorites,
      };
    }

    case RECIPE_ACTIONS.ADD_TO_RECENTLY_VIEWED: {
      const filtered = state.recentlyViewed.filter(id => id !== action.payload);
      const newRecentlyViewed = [action.payload, ...filtered].slice(0, 10); // Keep last 10
      localStorage.setItem('recently-viewed', JSON.stringify(newRecentlyViewed));
      return {
        ...state,
        recentlyViewed: newRecentlyViewed,
      };
    }

    case RECIPE_ACTIONS.SET_FILTERS:
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload,
        },
      };

    case RECIPE_ACTIONS.CLEAR_FILTERS:
      return {
        ...state,
        filters: initialState.filters,
      };

    case RECIPE_ACTIONS.SET_SORT:
      return {
        ...state,
        sortBy: action.payload.sortBy,
        sortOrder: action.payload.sortOrder,
      };

    default:
      return state;
  }
}

// Create context
const RecipeContext = createContext(undefined);

// Provider component
export function RecipeProvider({ children }) {
  const [state, dispatch] = useReducer(recipeReducer, initialState);

  // Action creators
  const actions = {
    setLoading: useCallback((loading) => {
      dispatch({ type: RECIPE_ACTIONS.SET_LOADING, payload: loading });
    }, []),

    setError: useCallback((error) => {
      dispatch({ type: RECIPE_ACTIONS.SET_ERROR, payload: error });
    }, []),

    clearError: useCallback(() => {
      dispatch({ type: RECIPE_ACTIONS.CLEAR_ERROR });
    }, []),

    setRecipes: useCallback((recipes) => {
      dispatch({ type: RECIPE_ACTIONS.SET_RECIPES, payload: recipes });
    }, []),

    addRecipe: useCallback((recipe) => {
      dispatch({ type: RECIPE_ACTIONS.ADD_RECIPE, payload: recipe });
    }, []),

    updateRecipe: useCallback((recipe) => {
      dispatch({ type: RECIPE_ACTIONS.UPDATE_RECIPE, payload: recipe });
    }, []),

    deleteRecipe: useCallback((recipeId) => {
      dispatch({ type: RECIPE_ACTIONS.DELETE_RECIPE, payload: recipeId });
    }, []),

    setCurrentRecipe: useCallback((recipe) => {
      dispatch({ type: RECIPE_ACTIONS.SET_CURRENT_RECIPE, payload: recipe });
    }, []),

    addToFavorites: useCallback((recipeId) => {
      dispatch({ type: RECIPE_ACTIONS.ADD_TO_FAVORITES, payload: recipeId });
    }, []),

    removeFromFavorites: useCallback((recipeId) => {
      dispatch({ type: RECIPE_ACTIONS.REMOVE_FROM_FAVORITES, payload: recipeId });
    }, []),

    toggleFavorite: useCallback((recipeId) => {
      if (state.favorites.includes(recipeId)) {
        dispatch({ type: RECIPE_ACTIONS.REMOVE_FROM_FAVORITES, payload: recipeId });
      } else {
        dispatch({ type: RECIPE_ACTIONS.ADD_TO_FAVORITES, payload: recipeId });
      }
    }, [state.favorites]),

    addToRecentlyViewed: useCallback((recipeId) => {
      dispatch({ type: RECIPE_ACTIONS.ADD_TO_RECENTLY_VIEWED, payload: recipeId });
    }, []),

    setFilters: useCallback((filters) => {
      dispatch({ type: RECIPE_ACTIONS.SET_FILTERS, payload: filters });
    }, []),

    clearFilters: useCallback(() => {
      dispatch({ type: RECIPE_ACTIONS.CLEAR_FILTERS });
    }, []),

    setSorting: useCallback((sortBy, sortOrder) => {
      dispatch({
        type: RECIPE_ACTIONS.SET_SORT,
        payload: { sortBy, sortOrder }
      });
    }, []),

    // Fetch recipes from API
    fetchRecipes: useCallback(async (params = {}) => {
      dispatch({ type: RECIPE_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: RECIPE_ACTIONS.CLEAR_ERROR });
      
      try {
        const response = await recipeApi.getRecipes(params);
        // Fix: Extract recipes from the correct path in the response
        const recipes = response.data?.recipes || response.recipes || [];
        dispatch({ type: RECIPE_ACTIONS.SET_RECIPES, payload: recipes });
      } catch (error) {
        console.error('Failed to fetch recipes:', error);
        dispatch({ type: RECIPE_ACTIONS.SET_ERROR, payload: error.message });
      } finally {
        dispatch({ type: RECIPE_ACTIONS.SET_LOADING, payload: false });
      }
    }, []),

    // Get single recipe by ID
    getRecipeById: useCallback(async (id) => {
      dispatch({ type: RECIPE_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: RECIPE_ACTIONS.CLEAR_ERROR });
      
      try {
        const response = await recipeApi.getRecipe(id);
        // Extract the recipe from the nested response structure
        const recipe = response.data?.recipe || response.recipe || response.data || response;
        dispatch({ type: RECIPE_ACTIONS.SET_CURRENT_RECIPE, payload: recipe });
        return recipe;
      } catch (error) {
        console.error('Failed to fetch recipe:', error);
        dispatch({ type: RECIPE_ACTIONS.SET_ERROR, payload: error.message });
        throw error;
      } finally {
        dispatch({ type: RECIPE_ACTIONS.SET_LOADING, payload: false });
      }
    }, []),

    // Create new recipe
    createRecipe: useCallback(async (recipeData) => {
      dispatch({ type: RECIPE_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: RECIPE_ACTIONS.CLEAR_ERROR });
      
      try {
        const response = await recipeApi.createRecipe(recipeData);
        const newRecipe = response.data || response;
        dispatch({ type: RECIPE_ACTIONS.ADD_RECIPE, payload: newRecipe });
        return newRecipe;
      } catch (error) {
        console.error('Failed to create recipe:', error);
        dispatch({ type: RECIPE_ACTIONS.SET_ERROR, payload: error.message });
        throw error;
      } finally {
        dispatch({ type: RECIPE_ACTIONS.SET_LOADING, payload: false });
      }
    }, []),

    // Update existing recipe
    updateRecipe: useCallback(async (id, recipeData) => {
      dispatch({ type: RECIPE_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: RECIPE_ACTIONS.CLEAR_ERROR });
      
      try {
        const response = await recipeApi.updateRecipe(id, recipeData);
        const updatedRecipe = response.data || response;
        dispatch({ type: RECIPE_ACTIONS.UPDATE_RECIPE, payload: updatedRecipe });
        return updatedRecipe;
      } catch (error) {
        console.error('Failed to update recipe:', error);
        dispatch({ type: RECIPE_ACTIONS.SET_ERROR, payload: error.message });
        throw error;
      } finally {
        dispatch({ type: RECIPE_ACTIONS.SET_LOADING, payload: false });
      }
    }, []),
  };

  // Fetch recipes on component mount
  useEffect(() => {
    actions.fetchRecipes();
  }, []); // Remove dependency to prevent re-fetching

  const value = {
    ...state,
    ...actions,
  };

  return (
    <RecipeContext.Provider value={value}>
      {children}
    </RecipeContext.Provider>
  );
}

// Custom hook to use the recipe context
export function useRecipes() {
  const context = useContext(RecipeContext);
  if (context === undefined) {
    throw new Error('useRecipes must be used within a RecipeProvider');
  }
  return context;
}

export default RecipeContext;