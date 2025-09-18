/**
 * API Configuration
 * 
 * Base configuration for API calls including base URL, headers,
 * and common request/response handling.
 * 
 * Educational Notes:
 * - Centralizes API configuration
 * - Provides consistent error handling
 * - Implements request/response interceptors
 * - Demonstrates modern fetch API patterns
 */

// API Base URL - in production this would come from environment variables
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Default headers for API requests
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

/**
 * Custom fetch wrapper with enhanced error handling and response processing
 */
class ApiClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
    this.defaultHeaders = { ...DEFAULT_HEADERS };
  }

  /**
   * Get authentication token from localStorage
   */
  getAuthToken() {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        return userData.token; // Assuming token is stored in user object
      } catch (error) {
        console.error('Failed to parse user data:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Get headers with authentication if available
   */
  getHeaders(customHeaders = {}) {
    const headers = { ...this.defaultHeaders, ...customHeaders };
    
    const token = this.getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    return headers;
  }

  /**
   * Build full URL from endpoint
   */
  buildUrl(endpoint) {
    return `${this.baseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  }

  /**
   * Process API response
   */
  async processResponse(response) {
    const contentType = response.headers.get('content-type');
    
    // Handle different response types
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Handle HTTP error status codes
    if (!response.ok) {
      const error = new Error(data.message || data || `HTTP Error: ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  /**
   * Generic request method
   */
  async request(endpoint, options = {}) {
    try {
      const url = this.buildUrl(endpoint);
      const headers = this.getHeaders(options.headers);
      
      const config = {
        ...options,
        headers,
      };

      // Add body for POST/PUT/PATCH requests
      if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
      }

      console.log(`API Request: ${config.method || 'GET'} ${url}`);
      
      const response = await fetch(url, config);
      const data = await this.processResponse(response);
      
      console.log(`API Response: ${response.status}`, data);
      
      return {
        success: true,
        data,
        status: response.status,
      };
    } catch (error) {
      console.error(`API Error: ${error.message}`, error);
      
      return {
        success: false,
        error: error.message,
        status: error.status || 500,
        data: error.data || null,
      };
    }
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}) {
    const url = new URL(this.buildUrl(endpoint));
    
    // Add query parameters
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    return this.request(url.pathname + url.search, {
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data,
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data,
    });
  }

  /**
   * PATCH request
   */
  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: data,
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * Upload file with FormData
   */
  async upload(endpoint, formData) {
    return this.request(endpoint, {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData, let browser set it
        ...this.getHeaders(),
        'Content-Type': undefined,
      },
      body: formData,
    });
  }
}

// Create and export a default API client instance
const apiClient = new ApiClient();

/**
 * Recipe API Functions
 */
export const recipeApi = {
  // Get all recipes with optional pagination and filters
  async getRecipes(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/api/recipes?${queryString}` : '/api/recipes';
    return await apiClient.get(url);
  },

  // Get a single recipe by ID
  async getRecipe(id) {
    return await apiClient.get(`/api/recipes/${id}`);
  },

  // Create a new recipe
  async createRecipe(recipeData) {
    return await apiClient.post('/api/recipes', recipeData);
  },

  // Update an existing recipe
  async updateRecipe(id, recipeData) {
    return await apiClient.put(`/api/recipes/${id}`, recipeData);
  },

  // Delete a recipe
  async deleteRecipe(id) {
    return await apiClient.delete(`/api/recipes/${id}`);
  },

  // Search recipes
  async searchRecipes(query, filters = {}) {
    const params = new URLSearchParams();
    
    // Add search query if provided
    if (query && query.trim()) {
      params.append('search', query.trim());
    }
    
    // Add flat filter parameters that the backend expects
    if (filters.categories && filters.categories.length > 0) {
      params.append('category_id', filters.categories[0]); // Take first category for now
    }
    
    if (filters.difficulty && filters.difficulty !== '') {
      params.append('difficulty_level', filters.difficulty);
    }
    
    if (filters.ingredients && filters.ingredients.length > 0) {
      // For ingredient-based searches, use the ingredients parameter
      filters.ingredients.forEach(ingredient => {
        params.append('ingredients', ingredient);
      });
    }
    
    // Add pagination parameters
    if (filters.page) {
      params.append('page', filters.page);
    }
    if (filters.limit) {
      params.append('limit', filters.limit);
    }
    
    return await apiClient.get(`/api/recipes?${params.toString()}`);
  },

  // Get recipe categories
  async getCategories() {
    return await apiClient.get('/api/categories');
  },
};

/**
 * Ingredients API
 * 
 * Handles ingredient-related operations including search and autocomplete
 */
export const ingredientApi = {
  // Get all ingredients with optional filtering
  async getAll(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.category) {
        params.append('category', filters.category);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.limit) {
        params.append('limit', filters.limit);
      }
      if (filters.page) {
        params.append('page', filters.page);
      }
      
      const queryString = params.toString();
      const url = `/api/ingredients${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      throw error;
    }
  },

  // Create a new ingredient
  async create(ingredientData) {
    try {
      const response = await apiClient.post('/api/ingredients', ingredientData);
      return response.data;
    } catch (error) {
      console.error('Error creating ingredient:', error);
      throw error;
    }
  },

  // Search ingredients by name (autocomplete)
  async searchByName(ingredientNames) {
    try {
      if (!ingredientNames || ingredientNames.length === 0) {
        return [];
      }

      // Search for each ingredient name and collect IDs
      const ingredientIds = [];
      
      for (const name of ingredientNames) {
        if (!name || !name.trim()) continue;
        
        const response = await apiClient.get(`/api/ingredients/autocomplete?q=${encodeURIComponent(name.trim())}&limit=1`);
        
        if (response.data && response.data.length > 0) {
          // Take the first (most relevant) match
          const ingredient = response.data[0];
          if (ingredient.id) {
            ingredientIds.push(ingredient.id);
          }
        }
      }
      
      return ingredientIds;
    } catch (error) {
      console.error('Error searching ingredients by name:', error);
      return [];
    }
  },

  // Autocomplete search for ingredient selection
  async autocomplete(query, limit = 10) {
    try {
      if (!query || !query.trim()) {
        return [];
      }
      
      try {
        // Try the autocomplete endpoint first
        const response = await apiClient.get(`/api/ingredients/autocomplete?q=${encodeURIComponent(query.trim())}&limit=${limit}`);
        return response.data || [];
      } catch (autocompleteError) {
        console.warn('Autocomplete endpoint failed, falling back to regular search:', autocompleteError);
        
        // Fallback to regular search
        const result = await this.getAll({ 
          search: query.trim(),
          limit: limit 
        });
        
        if (result.success && result.data && result.data.ingredients) {
          return result.data.ingredients;
        }
        return [];
      }
    } catch (error) {
      console.error('Error in ingredient search:', error);
      return [];
    }
  }
};

export default apiClient;
export { ApiClient, API_BASE_URL };

/**
 * Common API error types for consistent error handling
 */
export const API_ERRORS = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
};

/**
 * Map HTTP status codes to error types
 */
export function getErrorType(status) {
  switch (status) {
    case 401:
      return API_ERRORS.UNAUTHORIZED;
    case 403:
      return API_ERRORS.FORBIDDEN;
    case 404:
      return API_ERRORS.NOT_FOUND;
    case 400:
    case 422:
      return API_ERRORS.VALIDATION_ERROR;
    case 500:
    case 502:
    case 503:
      return API_ERRORS.SERVER_ERROR;
    default:
      return API_ERRORS.NETWORK_ERROR;
  }
}