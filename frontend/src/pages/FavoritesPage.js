import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent,
  Button,
  Box,
  Chip,
  IconButton,
  CircularProgress
} from '@mui/material';
import { 
  Favorite as FavoriteIcon,
  Share as ShareIcon,
  ShoppingCart as ShoppingCartIcon
} from '@mui/icons-material';
import { useFavorites } from '../hooks/useFavorites';
import RecipeAvatar from '../components/RecipeAvatar';
import { useShoppingList } from '../hooks/useShoppingList';
import { recipeService } from '../services/recipeService';

function FavoritesPage() {
  const { removeFromFavorites } = useFavorites();
  const { addRecipeToShoppingList } = useShoppingList();
  const [favoriteRecipes, setFavoriteRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch full recipe data based on stored IDs
  useEffect(() => {
    const fetchFavoriteRecipes = async () => {
      // Get favorite IDs directly from localStorage
      let favoriteIds = [];
      try {
        const stored = localStorage.getItem('recipe-favorites');
        const parsed = stored ? JSON.parse(stored) : [];
        console.log('FavoritesPage: Raw localStorage data:', stored);
        console.log('FavoritesPage: Parsed localStorage data:', parsed);
        
        if (Array.isArray(parsed)) {
          if (parsed.length === 0) {
            favoriteIds = [];
          } else if (typeof parsed[0] === 'string') {
            // Legacy format: array of recipe IDs
            favoriteIds = parsed;
            console.log('FavoritesPage: Using legacy format - array of IDs');
          } else {
            // New format: array of recipe objects
            favoriteIds = parsed.map(fav => fav.id).filter(Boolean);
            console.log('FavoritesPage: Using new format - extracting IDs from objects');
          }
        }
      } catch (error) {
        console.error('FavoritesPage: Failed to parse localStorage favorites:', error);
        favoriteIds = [];
      }
      
      console.log('FavoritesPage: Final favoriteIds:', favoriteIds);
      
      if (!favoriteIds || favoriteIds.length === 0) {
        console.log('FavoritesPage: No favorite IDs found');
        setFavoriteRecipes([]);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // favoriteIds are already processed above
        console.log('FavoritesPage: Using processed IDs:', favoriteIds);
        
        // Fetch each recipe by ID
        const recipePromises = favoriteIds.map(async (id) => {
          try {
            console.log(`FavoritesPage: Fetching recipe with ID: ${id}`);
            const response = await recipeService.getRecipe(id);
            console.log(`FavoritesPage: Full API response for ${id}:`, response);
            const recipe = response.data?.recipe; // Extract recipe from response.data.recipe
            console.log(`FavoritesPage: Extracted recipe for ${id}:`, recipe);
            console.log(`FavoritesPage: Recipe has title?`, recipe && recipe.title);
            return recipe;
          } catch (error) {
            console.error(`FavoritesPage: Failed to fetch recipe ${id}:`, error);
            return null; // Return null for failed requests
          }
        });
        
        const recipes = await Promise.all(recipePromises);
        console.log('FavoritesPage: All recipe fetch results:', recipes);
        
        // Filter out any failed requests (null values)
        const validRecipes = recipes.filter(recipe => recipe !== null);
        console.log('FavoritesPage: Valid recipes after filtering:', validRecipes);
        
        setFavoriteRecipes(validRecipes);
      } catch (error) {
        console.error('Failed to fetch favorite recipes:', error);
        setError('Failed to load favorite recipes');
      } finally {
        setLoading(false);
      }
    };

    fetchFavoriteRecipes();
  }, []); // Only run once on component mount

  const handleRemoveFavorite = (recipeId) => {
    removeFromFavorites(recipeId);
  };

  const handleAddToShoppingList = (recipe) => {
    addRecipeToShoppingList(recipe);
  };

  const handleShare = async (recipe) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe.title,
          text: recipe.description,
          url: window.location.origin + `/recipes/${recipe.id}`
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback to copying URL to clipboard
      navigator.clipboard.writeText(window.location.origin + `/recipes/${recipe.id}`);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading favorite recipes...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="error" gutterBottom>
            {error}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please try refreshing the page or check your connection.
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!favoriteRecipes || favoriteRecipes.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Your Favorite Recipes
        </Typography>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No favorite recipes yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Start exploring recipes and add them to your favorites by clicking the heart icon.
          </Typography>
          <Button variant="contained" color="primary" href="/recipes">
            Browse Recipes
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Your Favorite Recipes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {favoriteRecipes.length} recipe{favoriteRecipes.length !== 1 ? 's' : ''} saved
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {favoriteRecipes.filter(recipe => recipe && recipe.id).map((recipe) => (
          <Grid item xs={12} sm={6} md={4} key={recipe.id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                position: 'relative',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'scale(1.02)' }
              }}
            >
              <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
                <IconButton
                  onClick={() => handleRemoveFavorite(recipe.id)}
                  sx={{ 
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,1)' }
                  }}
                >
                  <FavoriteIcon color="error" />
                </IconButton>
              </Box>

              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: 120, 
                bgcolor: '#f5f5f5' 
              }}>
                <RecipeAvatar 
                  recipeName={recipe.title} 
                  size={80}
                />
              </Box>
              
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h6" component="h3">
                  {recipe.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {recipe.description}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Chip label={`${(recipe.prep_time || 0) + (recipe.cook_time || 0)} min`} size="small" />
                  <Chip label={recipe.difficulty_level || 'medium'} size="small" color="secondary" />
                  <Chip label={`${recipe.servings || 4} servings`} size="small" />
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button 
                    variant="contained" 
                    color="primary"
                    size="small"
                    href={`/recipes/${recipe.id}`}
                    sx={{ flex: 1 }}
                  >
                    View Recipe
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => handleAddToShoppingList(recipe)}
                    title="Add ingredients to shopping list"
                  >
                    <ShoppingCartIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleShare(recipe)}
                    title="Share recipe"
                  >
                    <ShareIcon />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export default FavoritesPage;