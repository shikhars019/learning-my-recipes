import React, { useEffect } from 'react';
import { Container, Typography, Grid, Card, CardContent, CardMedia, Button, Box, Chip } from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { useRecipes } from '../contexts/RecipeContext';
import { recipeApi } from '../services/api';
import RecipeAvatar from '../components/RecipeAvatar';

function HomePage() {
  const { recipes, loading, error } = useRecipes();

  console.log('HomePage Debug:', { 
    recipes, 
    loading, 
    error,
    recipesLength: recipes?.length,
    recipesType: typeof recipes,
    recipesArray: Array.isArray(recipes)
  });



  if (loading) {
    return (
      <Container>
        <Typography>Loading recipes...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Hero Section */}
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h2" component="h1" gutterBottom color="primary">
          Welcome to My Recipes
        </Typography>
        <Typography variant="h5" component="p" sx={{ mb: 4, color: 'text.secondary' }}>
          Discover, create, and share amazing recipes
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<AddIcon />}
            size="large"
            href="/recipes/create"
          >
            Create Recipe
          </Button>
          <Button 
            variant="outlined" 
            color="primary"
            startIcon={<SearchIcon />}
            size="large"
            href="/search"
          >
            Search by Ingredients
          </Button>
        </Box>
      </Box>

      {/* Featured Recipes Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h2" gutterBottom>
          Featured Recipes
        </Typography>
        {recipes && recipes.length > 0 ? (
          <Grid container spacing={3}>
            {recipes.slice(0, 6).map((recipe) => (
            <Grid item xs={12} sm={6} md={4} key={recipe.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'scale(1.02)' }
                }}
              >
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
                    <Chip label={`${(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)} min`} size="small" />
                    <Chip label={recipe.difficulty_level || 'medium'} size="small" color="secondary" />
                    <Chip label={`${recipe.servings} servings`} size="small" />
                  </Box>
                  <Button variant="contained" color="primary" fullWidth href={`/recipes/${recipe.id}`}>
                    View Recipe
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
          </Grid>
        ) : (
          <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No recipes available yet. <Button color="primary" href="/recipes/create">Create your first recipe!</Button>
          </Typography>
        )}
      </Box>
    </Container>
  );
}

export default HomePage;