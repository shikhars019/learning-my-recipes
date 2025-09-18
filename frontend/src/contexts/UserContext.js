import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

/**
 * User Context
 * 
 * Manages user authentication, profile data, and user-related state
 * throughout the application.
 * 
 * Educational Notes:
 * - Implements authentication state management
 * - Handles localStorage for session persistence
 * - Provides user profile and preference management
 * - Demonstrates secure state management patterns
 */

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  preferences: {
    theme: 'light',
    language: 'en',
    units: 'metric', // metric or imperial
    defaultServings: 4,
    dietary: [],
    allergies: [],
    skillLevel: 'beginner', // beginner, intermediate, advanced
  },
  profile: {
    displayName: '',
    bio: '',
    favoriteRecipes: [],
    createdRecipes: [],
    followers: 0,
    following: 0,
  },
};

// Action types
const USER_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  UPDATE_PREFERENCES: 'UPDATE_PREFERENCES',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_USER: 'SET_USER',
};

// Reducer function
function userReducer(state, action) {
  switch (action.type) {
    case USER_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
        error: action.payload ? null : state.error,
      };

    case USER_ACTIONS.SET_ERROR:
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };

    case USER_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case USER_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        preferences: {
          ...state.preferences,
          ...action.payload.preferences,
        },
        profile: {
          ...state.profile,
          ...action.payload.profile,
        },
      };

    case USER_ACTIONS.LOGOUT:
      return {
        ...initialState,
        preferences: {
          ...initialState.preferences,
          theme: state.preferences.theme, // Preserve theme preference
          language: state.preferences.language, // Preserve language preference
        },
      };

    case USER_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
      };

    case USER_ACTIONS.UPDATE_PROFILE:
      return {
        ...state,
        profile: {
          ...state.profile,
          ...action.payload,
        },
        user: state.user ? {
          ...state.user,
          ...action.payload,
        } : null,
      };

    case USER_ACTIONS.UPDATE_PREFERENCES:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload,
        },
      };

    default:
      return state;
  }
}

// Create context
const UserContext = createContext(undefined);

// Provider component
export function UserProvider({ children }) {
  const [state, dispatch] = useReducer(userReducer, initialState);

  // Load user data from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedPreferences = localStorage.getItem('user-preferences');
    
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        dispatch({ type: USER_ACTIONS.SET_USER, payload: user });
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('user');
      }
    }

    if (storedPreferences) {
      try {
        const preferences = JSON.parse(storedPreferences);
        dispatch({ type: USER_ACTIONS.UPDATE_PREFERENCES, payload: preferences });
      } catch (error) {
        console.error('Failed to parse stored preferences:', error);
        localStorage.removeItem('user-preferences');
      }
    }
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('user-preferences', JSON.stringify(state.preferences));
  }, [state.preferences]);

  // Action creators
  const actions = {
    setLoading: useCallback((loading) => {
      dispatch({ type: USER_ACTIONS.SET_LOADING, payload: loading });
    }, []),

    setError: useCallback((error) => {
      dispatch({ type: USER_ACTIONS.SET_ERROR, payload: error });
    }, []),

    clearError: useCallback(() => {
      dispatch({ type: USER_ACTIONS.CLEAR_ERROR });
    }, []),

    login: useCallback(async (credentials) => {
      try {
        dispatch({ type: USER_ACTIONS.SET_LOADING, payload: true });
        
        // In a real app, this would be an API call
        // For now, simulate authentication
        const mockUser = {
          id: '1',
          email: credentials.email,
          displayName: credentials.email.split('@')[0],
          avatar: null,
        };

        const mockProfile = {
          displayName: mockUser.displayName,
          bio: '',
          favoriteRecipes: [],
          createdRecipes: [],
          followers: 0,
          following: 0,
        };

        localStorage.setItem('user', JSON.stringify(mockUser));
        
        dispatch({
          type: USER_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: mockUser,
            profile: mockProfile,
            preferences: state.preferences,
          },
        });

        return { success: true };
      } catch (error) {
        dispatch({ type: USER_ACTIONS.SET_ERROR, payload: error.message });
        return { success: false, error: error.message };
      }
    }, [state.preferences]),

    logout: useCallback(() => {
      localStorage.removeItem('user');
      dispatch({ type: USER_ACTIONS.LOGOUT });
    }, []),

    updateProfile: useCallback((profileData) => {
      dispatch({ type: USER_ACTIONS.UPDATE_PROFILE, payload: profileData });
      
      // Update user in localStorage
      if (state.user) {
        const updatedUser = { ...state.user, ...profileData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    }, [state.user]),

    updatePreferences: useCallback((preferences) => {
      dispatch({ type: USER_ACTIONS.UPDATE_PREFERENCES, payload: preferences });
    }, []),

    // Convenience methods for specific preference updates
    setTheme: useCallback((theme) => {
      dispatch({
        type: USER_ACTIONS.UPDATE_PREFERENCES,
        payload: { theme }
      });
    }, []),

    setLanguage: useCallback((language) => {
      dispatch({
        type: USER_ACTIONS.UPDATE_PREFERENCES,
        payload: { language }
      });
    }, []),

    setUnits: useCallback((units) => {
      dispatch({
        type: USER_ACTIONS.UPDATE_PREFERENCES,
        payload: { units }
      });
    }, []),

    updateDietaryRestrictions: useCallback((dietary) => {
      dispatch({
        type: USER_ACTIONS.UPDATE_PREFERENCES,
        payload: { dietary }
      });
    }, []),

    updateAllergies: useCallback((allergies) => {
      dispatch({
        type: USER_ACTIONS.UPDATE_PREFERENCES,
        payload: { allergies }
      });
    }, []),

    setSkillLevel: useCallback((skillLevel) => {
      dispatch({
        type: USER_ACTIONS.UPDATE_PREFERENCES,
        payload: { skillLevel }
      });
    }, []),

    // Helper methods
    isRecipeFavorited: useCallback((recipeId) => {
      return state.profile.favoriteRecipes.includes(recipeId);
    }, [state.profile.favoriteRecipes]),

    hasCreatedRecipe: useCallback((recipeId) => {
      return state.profile.createdRecipes.includes(recipeId);
    }, [state.profile.createdRecipes]),

    addCreatedRecipe: useCallback((recipeId) => {
      const createdRecipes = [...state.profile.createdRecipes, recipeId];
      dispatch({
        type: USER_ACTIONS.UPDATE_PROFILE,
        payload: { createdRecipes }
      });
    }, [state.profile.createdRecipes]),
  };

  const value = {
    ...state,
    ...actions,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

// Custom hook to use the user context
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

export default UserContext;