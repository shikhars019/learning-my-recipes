import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Card, 
  CardMedia, 
  Chip, 
  Button, 
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  IconButton,
  Alert
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  AccessTime as TimeIcon,
  People as PeopleIcon,
  Restaurant as RestaurantIcon
} from '@mui/icons-material';
import { useRecipes } from '../contexts/RecipeContext';
import RecipeAvatar from '../components/RecipeAvatar';

function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    getRecipeById, 
    deleteRecipe, 
    toggleFavorite, 
    currentRecipe: recipe, 
    loading, 
    error 
  } = useRecipes();
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const recipeData = await getRecipeById(id);
        setIsFavorite(recipeData?.is_favorite || false);
      } catch (err) {
        console.error('Error fetching recipe:', err);
      }
    };

    if (id) {
      fetchRecipe();
    }
  }, [id, getRecipeById]);

  // Update favorite state when recipe changes
  useEffect(() => {
    if (recipe) {
      setIsFavorite(recipe.is_favorite || false);
    }
  }, [recipe]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      try {
        await deleteRecipe(id);
        navigate('/recipes');
      } catch (err) {
        console.error('Failed to delete recipe:', err);
      }
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await toggleFavorite(id);
      setIsFavorite(!isFavorite);
    } catch (err) {
      console.error('Failed to update favorite status:', err);
    }
  };

  if (loading) {
    return (
      <Container>
        <Typography>Loading recipe...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!recipe) {
    return (
      <Container>
        <Alert severity="info" sx={{ mt: 2 }}>
          Recipe not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Recipe Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h3" component="h1" sx={{ flex: 1 }}>
            {recipe.title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton 
              onClick={handleToggleFavorite}
              color="error"
              size="large"
            >
              {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            </IconButton>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/recipes/${id}/edit`)}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </Box>
        </Box>

        {recipe.description && (
          <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
            {recipe.description}
          </Typography>
        )}

        {/* Recipe Meta Info */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimeIcon color="primary" />
            <Typography>
              {(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)} minutes total
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleIcon color="primary" />
            <Typography>{recipe.servings || 4} servings</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RestaurantIcon color="primary" />
            <Typography>{recipe.difficulty_level || 'Medium'} difficulty</Typography>
          </Box>
        </Box>

        {/* Tags */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label={recipe.cuisine || 'International'} color="primary" />
          <Chip label={recipe.difficulty_level || 'medium'} color="secondary" />
          {recipe.dietary_tags?.map((tag, index) => (
            <Chip key={index} label={tag} variant="outlined" />
          ))}
        </Box>
      </Box>

      <Grid container spacing={4}>
        {/* Recipe Avatar */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: 400, 
            bgcolor: '#f5f5f5' 
          }}>
            <RecipeAvatar 
              recipeName={recipe.title} 
              size={200}
            />
          </Card>
        </Grid>

        {/* Ingredients */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 'fit-content' }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Ingredients
            </Typography>
            <List>
              {recipe.ingredients?.length > 0 ? (
                recipe.ingredients.map((ingredient, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemText
                      primary={`${ingredient.quantity || ''} ${ingredient.unit || ''} ${ingredient.name}`.trim()}
                      secondary={ingredient.preparation}
                    />
                  </ListItem>
                ))
              ) : (
                <ListItem sx={{ px: 0 }}>
                  <ListItemText primary="No ingredients listed" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Instructions */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Instructions
            </Typography>
            {recipe.instructions?.length > 0 ? (
              <List>
                {recipe.instructions.map((instruction, index) => (
                  <React.Fragment key={index}>
                    <ListItem sx={{ px: 0, alignItems: 'flex-start' }}>
                      <Box sx={{ 
                        minWidth: 32, 
                        height: 32, 
                        borderRadius: '50%', 
                        backgroundColor: 'primary.main', 
                        color: 'white', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        mr: 2,
                        mt: 0.5
                      }}>
                        {index + 1}
                      </Box>
                      <ListItemText
                        primary={instruction.step || instruction}
                        secondary={instruction.notes}
                        primaryTypographyProps={{ variant: 'body1' }}
                      />
                    </ListItem>
                    {index < recipe.instructions.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">No instructions available</Typography>
            )}
          </Paper>
        </Grid>

        {/* Nutritional Information */}
        {recipe.nutritional_info && Object.keys(recipe.nutritional_info).length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" component="h3" gutterBottom>
                Nutritional Information (per serving)
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(recipe.nutritional_info).map(([key, value]) => (
                  <Grid item xs={6} key={key}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" color="primary">
                        {value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Recipe Notes */}
        {recipe.notes && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" component="h3" gutterBottom>
                Chef's Notes
              </Typography>
              <Typography variant="body2">
                {recipe.notes}
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}

export default RecipeDetailPage;