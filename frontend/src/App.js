import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

// Layout Components
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/common/ErrorBoundary';

// Page Components
import HomePage from './pages/HomePage';
import RecipeListPage from './pages/RecipeListPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import CreateRecipePage from './pages/CreateRecipePage';
import EditRecipePage from './pages/EditRecipePage';
import SearchPage from './pages/SearchPage';
import IngredientsPage from './pages/IngredientsPage';
import ShoppingListPage from './pages/ShoppingListPage';
import FavoritesPage from './pages/FavoritesPage';
import NotFoundPage from './pages/NotFoundPage';

/**
 * Main App Component
 * 
 * This is the root component that sets up the routing structure
 * and provides the main layout for the My Recipes application.
 * 
 * Educational Notes:
 * - Uses React Router v6 for client-side routing
 * - Implements nested routing with layout wrapper
 * - Includes error boundaries for better error handling
 * - Mobile-first responsive design
 */
function App() {
  return (
    <ErrorBoundary>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Routes>
          {/* Main application routes with layout */}
          <Route path="/" element={<AppLayout />}>
            {/* Home page - Recipe discovery and overview */}
            <Route index element={<HomePage />} />
            
            {/* Recipe related routes */}
            <Route path="recipes" element={<RecipeListPage />} />
            <Route path="recipes/create" element={<CreateRecipePage />} />
            <Route path="recipes/:id" element={<RecipeDetailPage />} />
            <Route path="recipes/:id/edit" element={<EditRecipePage />} />
            <Route path="create-recipe" element={<CreateRecipePage />} />
            
            {/* Search and discovery */}
            <Route path="search" element={<SearchPage />} />
            <Route path="ingredients" element={<IngredientsPage />} />
            
            {/* User features */}
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="shopping-list" element={<ShoppingListPage />} />
            
            {/* Redirect old paths */}
            <Route path="home" element={<Navigate to="/" replace />} />
          </Route>
          
          {/* 404 Not Found */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Box>
    </ErrorBoundary>
  );
}

export default App;