import React, { createContext, useContext, useReducer, useCallback, useMemo, useRef } from 'react';

/**
 * Search Context
 * 
 * Manages search functionality, filters, and search history
 * throughout the application.
 * 
 * Educational Notes:
 * - Implements complex search state management
 * - Handles search history with localStorage
 * - Provides advanced filtering and sorting capabilities
 * - Demonstrates debounced search patterns
 */

// Initial state
const initialState = {
  query: '',
  results: [],
  isSearching: false,
  hasSearched: false,
  error: null,
  searchHistory: JSON.parse(localStorage.getItem('search-history') || '[]'),
  popularSearches: [
    'pasta',
    'chicken',
    'vegetarian',
    'dessert',
    'quick meals',
    'healthy',
    'Italian',
    'Mexican',
  ],
  filters: {
    categories: [],
    ingredients: [],
    dietary: [],
    difficulty: '',
    cookingTime: {
      min: 0,
      max: 180, // in minutes
    },
    servings: {
      min: 1,
      max: 12,
    },
    rating: {
      min: 0,
      max: 5,
    },
    excludeIngredients: [],
  },
  sortOptions: {
    field: 'relevance', // relevance, rating, cookingTime, difficulty, name, dateCreated
    direction: 'desc', // asc, desc
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false,
  },
  suggestions: [],
  recentSearches: JSON.parse(localStorage.getItem('recent-searches') || '[]'),
};

// Action types
const SEARCH_ACTIONS = {
  SET_QUERY: 'SET_QUERY',
  SET_SEARCHING: 'SET_SEARCHING',
  SET_RESULTS: 'SET_RESULTS',
  APPEND_RESULTS: 'APPEND_RESULTS',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  ADD_TO_HISTORY: 'ADD_TO_HISTORY',
  CLEAR_HISTORY: 'CLEAR_HISTORY',
  SET_FILTERS: 'SET_FILTERS',
  CLEAR_FILTERS: 'CLEAR_FILTERS',
  SET_SORT: 'SET_SORT',
  SET_PAGE: 'SET_PAGE',
  RESET_PAGINATION: 'RESET_PAGINATION',
  SET_SUGGESTIONS: 'SET_SUGGESTIONS',
  CLEAR_SUGGESTIONS: 'CLEAR_SUGGESTIONS',
  CLEAR_SEARCH: 'CLEAR_SEARCH',
  ADD_TO_RECENT_SEARCHES: 'ADD_TO_RECENT_SEARCHES',
  CLEAR_RECENT_SEARCHES: 'CLEAR_RECENT_SEARCHES',
};

// Reducer function
function searchReducer(state, action) {
  switch (action.type) {
    case SEARCH_ACTIONS.SET_QUERY:
      return {
        ...state,
        query: action.payload,
      };

    case SEARCH_ACTIONS.SET_SEARCHING:
      return {
        ...state,
        isSearching: action.payload,
        error: action.payload ? null : state.error,
      };

    case SEARCH_ACTIONS.SET_RESULTS:
      return {
        ...state,
        results: action.payload.results,
        pagination: {
          ...state.pagination,
          total: action.payload.total,
          hasMore: action.payload.hasMore,
        },
        isSearching: false,
        hasSearched: true,
        error: null,
      };

    case SEARCH_ACTIONS.APPEND_RESULTS:
      return {
        ...state,
        results: [...state.results, ...action.payload.results],
        pagination: {
          ...state.pagination,
          page: state.pagination.page + 1,
          total: action.payload.total,
          hasMore: action.payload.hasMore,
        },
        isSearching: false,
      };

    case SEARCH_ACTIONS.SET_ERROR:
      return {
        ...state,
        isSearching: false,
        error: action.payload,
      };

    case SEARCH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case SEARCH_ACTIONS.ADD_TO_HISTORY: {
      const newHistory = [
        action.payload,
        ...state.searchHistory.filter(item => item !== action.payload)
      ].slice(0, 50); // Keep last 50 searches
      localStorage.setItem('search-history', JSON.stringify(newHistory));
      return {
        ...state,
        searchHistory: newHistory,
      };
    }

    case SEARCH_ACTIONS.CLEAR_HISTORY:
      localStorage.removeItem('search-history');
      return {
        ...state,
        searchHistory: [],
      };

    case SEARCH_ACTIONS.SET_FILTERS:
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload,
        },
        pagination: {
          ...state.pagination,
          page: 1, // Reset to first page when filters change
        },
      };

    case SEARCH_ACTIONS.CLEAR_FILTERS:
      return {
        ...state,
        filters: initialState.filters,
        pagination: {
          ...state.pagination,
          page: 1,
        },
      };

    case SEARCH_ACTIONS.SET_SORT:
      return {
        ...state,
        sortOptions: action.payload,
        pagination: {
          ...state.pagination,
          page: 1, // Reset to first page when sort changes
        },
      };

    case SEARCH_ACTIONS.SET_PAGE:
      return {
        ...state,
        pagination: {
          ...state.pagination,
          page: action.payload,
        },
      };

    case SEARCH_ACTIONS.RESET_PAGINATION:
      return {
        ...state,
        pagination: {
          ...state.pagination,
          page: 1,
        },
      };

    case SEARCH_ACTIONS.SET_SUGGESTIONS:
      return {
        ...state,
        suggestions: action.payload,
      };

    case SEARCH_ACTIONS.CLEAR_SUGGESTIONS:
      return {
        ...state,
        suggestions: [],
      };

    case SEARCH_ACTIONS.CLEAR_SEARCH:
      return {
        ...state,
        query: '',
        results: [],
        hasSearched: false,
        suggestions: [],
        pagination: {
          ...initialState.pagination,
        },
      };

    case SEARCH_ACTIONS.ADD_TO_RECENT_SEARCHES: {
      const newRecentSearches = [
        action.payload,
        ...state.recentSearches.filter(search => search.query !== action.payload.query)
      ].slice(0, 10); // Keep last 10 searches
      localStorage.setItem('recent-searches', JSON.stringify(newRecentSearches));
      return {
        ...state,
        recentSearches: newRecentSearches,
      };
    }

    case SEARCH_ACTIONS.CLEAR_RECENT_SEARCHES:
      localStorage.removeItem('recent-searches');
      return {
        ...state,
        recentSearches: [],
      };

    default:
      return state;
  }
}

// Create context
const SearchContext = createContext(undefined);

// Provider component
export function SearchProvider({ children }) {
  const [state, dispatch] = useReducer(searchReducer, initialState);
  const lastSearchRef = useRef('');

  // Memoized computed values
  const activeFiltersCount = useMemo(() => {
    const { filters } = state;
    let count = 0;
    
    if (filters.categories.length > 0) count++;
    if (filters.ingredients.length > 0) count++;
    if (filters.dietary.length > 0) count++;
    if (filters.difficulty) count++;
    if (filters.cookingTime.min > 0 || filters.cookingTime.max < 180) count++;
    if (filters.servings.min > 1 || filters.servings.max < 12) count++;
    if (filters.rating.min > 0 || filters.rating.max < 5) count++;
    if (filters.excludeIngredients.length > 0) count++;
    
    return count;
  }, [state.filters]);

  const hasActiveFilters = useMemo(() => {
    return activeFiltersCount > 0;
  }, [activeFiltersCount]);

  // Action creators
  const actions = {
    setQuery: useCallback((query) => {
      dispatch({ type: SEARCH_ACTIONS.SET_QUERY, payload: query });
    }, []),

    setSearching: useCallback((isSearching) => {
      dispatch({ type: SEARCH_ACTIONS.SET_SEARCHING, payload: isSearching });
    }, []),

    setResults: useCallback((results, total, hasMore) => {
      dispatch({
        type: SEARCH_ACTIONS.SET_RESULTS,
        payload: { results, total, hasMore }
      });
    }, []),

    appendResults: useCallback((results, total, hasMore) => {
      dispatch({
        type: SEARCH_ACTIONS.APPEND_RESULTS,
        payload: { results, total, hasMore }
      });
    }, []),

    setError: useCallback((error) => {
      dispatch({ type: SEARCH_ACTIONS.SET_ERROR, payload: error });
    }, []),

    clearError: useCallback(() => {
      dispatch({ type: SEARCH_ACTIONS.CLEAR_ERROR });
    }, []),

    addToHistory: useCallback((query) => {
      if (query && query.trim()) {
        dispatch({ type: SEARCH_ACTIONS.ADD_TO_HISTORY, payload: query.trim() });
      }
    }, []),

    clearHistory: useCallback(() => {
      dispatch({ type: SEARCH_ACTIONS.CLEAR_HISTORY });
    }, []),

    setFilters: useCallback((filters) => {
      dispatch({ type: SEARCH_ACTIONS.SET_FILTERS, payload: filters });
    }, []),

    clearFilters: useCallback(() => {
      dispatch({ type: SEARCH_ACTIONS.CLEAR_FILTERS });
    }, []),

    setSortOptions: useCallback((field, direction = 'desc') => {
      dispatch({
        type: SEARCH_ACTIONS.SET_SORT,
        payload: { field, direction }
      });
    }, []),

    setPage: useCallback((page) => {
      dispatch({ type: SEARCH_ACTIONS.SET_PAGE, payload: page });
    }, []),

    resetPagination: useCallback(() => {
      dispatch({ type: SEARCH_ACTIONS.RESET_PAGINATION });
    }, []),

    setSuggestions: useCallback((suggestions) => {
      dispatch({ type: SEARCH_ACTIONS.SET_SUGGESTIONS, payload: suggestions });
    }, []),

    clearSuggestions: useCallback(() => {
      dispatch({ type: SEARCH_ACTIONS.CLEAR_SUGGESTIONS });
    }, []),

    clearSearch: useCallback(() => {
      dispatch({ type: SEARCH_ACTIONS.CLEAR_SEARCH });
    }, []),

    addToRecentSearches: useCallback((query, filters = {}) => {
      const searchEntry = {
        query,
        filters,
        timestamp: new Date().toISOString(),
      };
      dispatch({ type: SEARCH_ACTIONS.ADD_TO_RECENT_SEARCHES, payload: searchEntry });
    }, []),

    clearRecentSearches: useCallback(() => {
      dispatch({ type: SEARCH_ACTIONS.CLEAR_RECENT_SEARCHES });
    }, []),

    // Convenience methods
    search: useCallback(async (query, options = {}) => {
      const { append = false, ...searchOptions } = options;
      
      // Create a unique search key to prevent duplicate requests
      const searchKey = `${query || ''}-${JSON.stringify(state.filters)}`;
      
      // Skip if this exact search was just performed
      if (searchKey === lastSearchRef.current && !append) {
        console.log('Skipping duplicate search:', searchKey);
        return { success: true, results: state.results };
      }
      
      try {
        console.log('Performing search:', searchKey);
        lastSearchRef.current = searchKey;
        dispatch({ type: SEARCH_ACTIONS.SET_SEARCHING, payload: true });
        
        if (query && query.trim()) {
          dispatch({ type: SEARCH_ACTIONS.ADD_TO_HISTORY, payload: query.trim() });
          actions.addToRecentSearches(query.trim(), state.filters);
        }

        // Call the actual API
        const { recipeApi } = await import('../services/api');
        const response = query && query.trim() 
          ? await recipeApi.searchRecipes(query, state.filters)
          : await recipeApi.getRecipes(state.filters);
        
        // Fix: Extract recipes from the correct path in the response
        const mockResults = response.data?.recipes || response.recipes || [];

        const action = append ? SEARCH_ACTIONS.APPEND_RESULTS : SEARCH_ACTIONS.SET_RESULTS;
        dispatch({
          type: action,
          payload: {
            results: mockResults,
            total: mockResults.length,
            hasMore: false,
          }
        });

        return { success: true, results: mockResults };
      } catch (error) {
        dispatch({ type: SEARCH_ACTIONS.SET_ERROR, payload: error.message });
        return { success: false, error: error.message };
      }
    }, [state.filters]),

    loadMore: useCallback(async () => {
      if (!state.pagination.hasMore || state.isSearching) {
        return;
      }
      
      return actions.search(state.query, { append: true });
    }, [state.query, state.pagination.hasMore, state.isSearching]),
  };

  const value = {
    ...state,
    ...actions,
    // Add aliases for backward compatibility
    searchQuery: state.query,
    setSearchQuery: actions.setQuery,
    searchRecipes: actions.search,
    activeFiltersCount,
    hasActiveFilters,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}

// Custom hook to use the search context
export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}

export default SearchContext;