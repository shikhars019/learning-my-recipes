import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { useSnackbar } from 'notistack';

/**
 * Notification Context
 * 
 * Manages application-wide notifications, alerts, and user feedback
 * using notistack for consistent UI patterns.
 * 
 * Educational Notes:
 * - Integrates with notistack for toast notifications
 * - Provides consistent notification patterns
 * - Handles different notification types and priorities
 * - Demonstrates user feedback best practices
 */

// Initial state
const initialState = {
  notifications: [],
  settings: {
    position: {
      vertical: 'bottom',
      horizontal: 'left',
    },
    autoHideDuration: 6000,
    maxSnack: 3,
    preventDuplicate: true,
    showCloseButton: true,
  },
  unreadCount: 0,
};

// Action types
const NOTIFICATION_ACTIONS = {
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  CLEAR_NOTIFICATIONS: 'CLEAR_NOTIFICATIONS',
  MARK_AS_READ: 'MARK_AS_READ',
  MARK_ALL_AS_READ: 'MARK_ALL_AS_READ',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
};

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// Reducer function
function notificationReducer(state, action) {
  switch (action.type) {
    case NOTIFICATION_ACTIONS.ADD_NOTIFICATION: {
      const newNotification = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        read: false,
        ...action.payload,
      };
      
      return {
        ...state,
        notifications: [newNotification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    }

    case NOTIFICATION_ACTIONS.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(
          notification => notification.id !== action.payload
        ),
      };

    case NOTIFICATION_ACTIONS.CLEAR_NOTIFICATIONS:
      return {
        ...state,
        notifications: [],
        unreadCount: 0,
      };

    case NOTIFICATION_ACTIONS.MARK_AS_READ: {
      const updatedNotifications = state.notifications.map(notification =>
        notification.id === action.payload && !notification.read
          ? { ...notification, read: true }
          : notification
      );
      
      const unreadCount = updatedNotifications.filter(n => !n.read).length;
      
      return {
        ...state,
        notifications: updatedNotifications,
        unreadCount,
      };
    }

    case NOTIFICATION_ACTIONS.MARK_ALL_AS_READ:
      return {
        ...state,
        notifications: state.notifications.map(notification => ({
          ...notification,
          read: true,
        })),
        unreadCount: 0,
      };

    case NOTIFICATION_ACTIONS.UPDATE_SETTINGS:
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
        },
      };

    default:
      return state;
  }
}

// Create context
const NotificationContext = createContext(undefined);

// Provider component
export function NotificationProvider({ children }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  // Action creators
  const actions = {
    // Core notification methods
    addNotification: useCallback((notification) => {
      dispatch({ type: NOTIFICATION_ACTIONS.ADD_NOTIFICATION, payload: notification });
    }, []),

    removeNotification: useCallback((id) => {
      dispatch({ type: NOTIFICATION_ACTIONS.REMOVE_NOTIFICATION, payload: id });
    }, []),

    clearNotifications: useCallback(() => {
      dispatch({ type: NOTIFICATION_ACTIONS.CLEAR_NOTIFICATIONS });
    }, []),

    markAsRead: useCallback((id) => {
      dispatch({ type: NOTIFICATION_ACTIONS.MARK_AS_READ, payload: id });
    }, []),

    markAllAsRead: useCallback(() => {
      dispatch({ type: NOTIFICATION_ACTIONS.MARK_ALL_AS_READ });
    }, []),

    updateSettings: useCallback((settings) => {
      dispatch({ type: NOTIFICATION_ACTIONS.UPDATE_SETTINGS, payload: settings });
    }, []),

    // Toast notification methods (using notistack)
    showSuccess: useCallback((message, options = {}) => {
      const key = enqueueSnackbar(message, {
        variant: 'success',
        autoHideDuration: state.settings.autoHideDuration,
        ...options,
      });
      
      // Also add to notification history
      actions.addNotification({
        type: NOTIFICATION_TYPES.SUCCESS,
        message,
        title: 'Success',
        ...options,
      });
      
      return key;
    }, [enqueueSnackbar, state.settings.autoHideDuration]),

    showError: useCallback((message, options = {}) => {
      const key = enqueueSnackbar(message, {
        variant: 'error',
        persist: true, // Errors should persist until manually closed
        ...options,
      });
      
      actions.addNotification({
        type: NOTIFICATION_TYPES.ERROR,
        message,
        title: 'Error',
        persist: true,
        ...options,
      });
      
      return key;
    }, [enqueueSnackbar]),

    showWarning: useCallback((message, options = {}) => {
      const key = enqueueSnackbar(message, {
        variant: 'warning',
        autoHideDuration: state.settings.autoHideDuration * 1.5, // Slightly longer for warnings
        ...options,
      });
      
      actions.addNotification({
        type: NOTIFICATION_TYPES.WARNING,
        message,
        title: 'Warning',
        ...options,
      });
      
      return key;
    }, [enqueueSnackbar, state.settings.autoHideDuration]),

    showInfo: useCallback((message, options = {}) => {
      const key = enqueueSnackbar(message, {
        variant: 'info',
        autoHideDuration: state.settings.autoHideDuration,
        ...options,
      });
      
      actions.addNotification({
        type: NOTIFICATION_TYPES.INFO,
        message,
        title: 'Info',
        ...options,
      });
      
      return key;
    }, [enqueueSnackbar, state.settings.autoHideDuration]),

    // Convenience methods for common scenarios
    showRecipeSaved: useCallback((recipeName) => {
      return actions.showSuccess(`Recipe "${recipeName}" has been saved to your favorites!`);
    }, []),

    showRecipeCreated: useCallback((recipeName) => {
      return actions.showSuccess(`Recipe "${recipeName}" has been created successfully!`);
    }, []),

    showRecipeDeleted: useCallback((recipeName) => {
      return actions.showInfo(`Recipe "${recipeName}" has been deleted.`);
    }, []),

    showLoginSuccess: useCallback((userName) => {
      return actions.showSuccess(`Welcome back, ${userName}!`);
    }, []),

    showLogoutSuccess: useCallback(() => {
      return actions.showInfo('You have been logged out successfully.');
    }, []),

    showNetworkError: useCallback(() => {
      return actions.showError(
        'Network error. Please check your connection and try again.',
        { persist: true }
      );
    }, []),

    showValidationError: useCallback((message) => {
      return actions.showError(`Validation Error: ${message}`);
    }, []),

    showSearchResults: useCallback((count, query) => {
      if (count === 0) {
        return actions.showInfo(`No recipes found for "${query}". Try different keywords.`);
      } else {
        return actions.showSuccess(`Found ${count} recipe${count === 1 ? '' : 's'} for "${query}"`);
      }
    }, []),

    // Advanced notification methods
    showProgressNotification: useCallback((message, progress = 0) => {
      return actions.showInfo(`${message} (${Math.round(progress)}%)`, {
        persist: true,
        action: (key) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '60px', 
              height: '4px', 
              backgroundColor: 'rgba(255,255,255,0.3)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div 
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: '#fff',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        ),
      });
    }, []),

    closeNotification: useCallback((key) => {
      closeSnackbar(key);
    }, [closeSnackbar]),

    closeAllNotifications: useCallback(() => {
      closeSnackbar();
    }, [closeSnackbar]),
  };

  const value = {
    ...state,
    ...actions,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// Custom hook to use the notification context
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;