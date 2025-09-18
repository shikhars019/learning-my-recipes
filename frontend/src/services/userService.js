import apiClient from './api';

/**
 * User Service
 * 
 * Handles all user-related API calls including authentication,
 * profile management, and user preferences.
 * 
 * Educational Notes:
 * - Implements authentication flow
 * - Manages user profile and preferences
 * - Handles password and security operations
 * - Demonstrates secure API patterns
 */

export const userService = {
  /**
   * Register a new user
   */
  async register(userData) {
    const {
      email,
      password,
      confirmPassword,
      displayName,
      firstName,
      lastName,
      ...otherData
    } = userData;

    // Validate required fields
    if (!email || !password || !confirmPassword) {
      throw new Error('Email, password, and password confirmation are required');
    }

    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const user = {
      email: email.trim().toLowerCase(),
      password,
      displayName: displayName?.trim() || email.split('@')[0],
      firstName: firstName?.trim() || '',
      lastName: lastName?.trim() || '',
      ...otherData,
    };

    return apiClient.post('/auth/register', user);
  },

  /**
   * Login user
   */
  async login(credentials) {
    const { email, password, rememberMe = false } = credentials;

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const loginData = {
      email: email.trim().toLowerCase(),
      password,
      rememberMe,
    };

    const result = await apiClient.post('/auth/login', loginData);

    // Store user data and token in localStorage if login successful
    if (result.success && result.data.user && result.data.token) {
      const userData = {
        ...result.data.user,
        token: result.data.token,
      };
      localStorage.setItem('user', JSON.stringify(userData));
    }

    return result;
  },

  /**
   * Logout user
   */
  async logout() {
    try {
      // Call logout endpoint to invalidate server-side session
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if server request fails
      console.warn('Server logout failed:', error.message);
    } finally {
      // Always clear local storage
      localStorage.removeItem('user');
      localStorage.removeItem('user-preferences');
    }

    return { success: true };
  },

  /**
   * Refresh authentication token
   */
  async refreshToken() {
    return apiClient.post('/auth/refresh');
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    if (!email) {
      throw new Error('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    return apiClient.post('/auth/forgot-password', {
      email: email.trim().toLowerCase(),
    });
  },

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword, confirmPassword) {
    if (!token || !newPassword || !confirmPassword) {
      throw new Error('Reset token, new password, and confirmation are required');
    }

    if (newPassword !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    return apiClient.post('/auth/reset-password', {
      token,
      password: newPassword,
      confirmPassword,
    });
  },

  /**
   * Change password (when logged in)
   */
  async changePassword(currentPassword, newPassword, confirmPassword) {
    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new Error('Current password, new password, and confirmation are required');
    }

    if (newPassword !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    return apiClient.put('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
  },

  /**
   * Get current user profile
   */
  async getProfile() {
    return apiClient.get('/users/profile');
  },

  /**
   * Update user profile
   */
  async updateProfile(profileData) {
    const {
      displayName,
      firstName,
      lastName,
      bio,
      location,
      website,
      ...otherData
    } = profileData;

    const updates = {
      displayName: displayName?.trim() || '',
      firstName: firstName?.trim() || '',
      lastName: lastName?.trim() || '',
      bio: bio?.trim() || '',
      location: location?.trim() || '',
      website: website?.trim() || '',
      ...otherData,
    };

    const result = await apiClient.put('/users/profile', updates);

    // Update local storage with new user data
    if (result.success && result.data) {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...currentUser, ...result.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }

    return result;
  },

  /**
   * Upload user avatar
   */
  async uploadAvatar(imageFile) {
    if (!imageFile) {
      throw new Error('Image file is required');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(imageFile.type)) {
      throw new Error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
    }

    // Validate file size (max 2MB for avatar)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (imageFile.size > maxSize) {
      throw new Error('File size too large. Please upload an image smaller than 2MB.');
    }

    const formData = new FormData();
    formData.append('avatar', imageFile);

    const result = await apiClient.upload('/users/avatar', formData);

    // Update local storage with new avatar URL
    if (result.success && result.data.avatarUrl) {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...currentUser, avatarUrl: result.data.avatarUrl };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }

    return result;
  },

  /**
   * Delete user avatar
   */
  async deleteAvatar() {
    const result = await apiClient.delete('/users/avatar');

    // Update local storage to remove avatar URL
    if (result.success) {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      delete currentUser.avatarUrl;
      localStorage.setItem('user', JSON.stringify(currentUser));
    }

    return result;
  },

  /**
   * Get user preferences
   */
  async getPreferences() {
    return apiClient.get('/users/preferences');
  },

  /**
   * Update user preferences
   */
  async updatePreferences(preferences) {
    const result = await apiClient.put('/users/preferences', preferences);

    // Update local storage with new preferences
    if (result.success && result.data) {
      localStorage.setItem('user-preferences', JSON.stringify(result.data));
    }

    return result;
  },

  /**
   * Get user's recipe history
   */
  async getRecipeHistory(params = {}) {
    const { page = 1, limit = 20, type = 'all' } = params;

    return apiClient.get('/users/recipe-history', {
      page,
      limit,
      type, // 'viewed', 'created', 'favorited', 'all'
    });
  },

  /**
   * Get user statistics
   */
  async getUserStats() {
    return apiClient.get('/users/stats');
  },

  /**
   * Follow another user
   */
  async followUser(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    return apiClient.post(`/users/${userId}/follow`);
  },

  /**
   * Unfollow a user
   */
  async unfollowUser(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    return apiClient.delete(`/users/${userId}/follow`);
  },

  /**
   * Get user's followers
   */
  async getFollowers(userId, params = {}) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const { page = 1, limit = 20 } = params;

    return apiClient.get(`/users/${userId}/followers`, {
      page,
      limit,
    });
  },

  /**
   * Get user's following
   */
  async getFollowing(userId, params = {}) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const { page = 1, limit = 20 } = params;

    return apiClient.get(`/users/${userId}/following`, {
      page,
      limit,
    });
  },

  /**
   * Search for users
   */
  async searchUsers(query, params = {}) {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    const { page = 1, limit = 20 } = params;

    return apiClient.get('/users/search', {
      q: query.trim(),
      page,
      limit,
    });
  },

  /**
   * Get user by ID or username
   */
  async getUser(identifier) {
    if (!identifier) {
      throw new Error('User ID or username is required');
    }

    return apiClient.get(`/users/${identifier}`);
  },

  /**
   * Delete user account
   */
  async deleteAccount(password) {
    if (!password) {
      throw new Error('Password is required to delete account');
    }

    const result = await apiClient.delete('/users/account', {
      password,
    });

    // Clear local storage if account deletion successful
    if (result.success) {
      localStorage.removeItem('user');
      localStorage.removeItem('user-preferences');
    }

    return result;
  },

  /**
   * Get account security settings
   */
  async getSecuritySettings() {
    return apiClient.get('/users/security');
  },

  /**
   * Update account security settings
   */
  async updateSecuritySettings(settings) {
    return apiClient.put('/users/security', settings);
  },

  /**
   * Get notification settings
   */
  async getNotificationSettings() {
    return apiClient.get('/users/notifications/settings');
  },

  /**
   * Update notification settings
   */
  async updateNotificationSettings(settings) {
    return apiClient.put('/users/notifications/settings', settings);
  },

  /**
   * Verify email address
   */
  async verifyEmail(token) {
    if (!token) {
      throw new Error('Verification token is required');
    }

    return apiClient.post('/auth/verify-email', { token });
  },

  /**
   * Request email verification
   */
  async requestEmailVerification() {
    return apiClient.post('/auth/request-verification');
  },
};

export default userService;