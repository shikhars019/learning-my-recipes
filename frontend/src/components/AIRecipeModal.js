import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Close as CloseIcon,
  AutoAwesome as AIIcon,
  Restaurant as RecipeIcon,
  Schedule as TimeIcon,
  People as ServingsIcon
} from '@mui/icons-material';
import IngredientSelector from './IngredientSelector';
import { recipeService } from '../services/recipeService';
import { useNotifications } from '../contexts/NotificationContext';

/**
 * AI Recipe Generation Modal
 * Allows users to generate recipes using AI based on selected ingredients
 */
function AIRecipeModal({ open, onClose }) {
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [cuisineType, setCuisineType] = useState('');
  const [mealType, setMealType] = useState('');
  const [generatedRecipe, setGeneratedRecipe] = useState(null);

  // Debug logging for state changes
  React.useEffect(() => {
    console.log('🔍 Generated recipe state changed:', generatedRecipe);
  }, [generatedRecipe]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showError, showSuccess } = useNotifications();

  const cuisineOptions = [
    { value: '', label: 'Any Cuisine' },
    { value: 'Italian', label: 'Italian' },
    { value: 'Mexican', label: 'Mexican' },
    { value: 'Asian', label: 'Asian' },
    { value: 'Indian', label: 'Indian' },
    { value: 'Mediterranean', label: 'Mediterranean' },
    { value: 'American', label: 'American' },
    { value: 'French', label: 'French' },
    { value: 'Thai', label: 'Thai' },
    { value: 'Chinese', label: 'Chinese' }
  ];

  const mealOptions = [
    { value: '', label: 'Any Meal' },
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snack', label: 'Snack' },
    { value: 'dessert', label: 'Dessert' }
  ];

  const handleIngredientChange = (newIngredients) => {
    setSelectedIngredients(newIngredients);
    setError(null);
  };

  const handleGenerateRecipe = async () => {
    if (selectedIngredients.length === 0) {
      setError('Please select at least one ingredient');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedRecipe(null);

    try {
      const response = await recipeService.generateAIRecipe(
        selectedIngredients,
        cuisineType || null,
        mealType || null
      );
      
      console.log('🔍 AI Recipe Response:', response);
      console.log('🔍 Recipe data:', response.data?.recipe);
      console.log('🔍 Recipe title:', response.data?.recipe?.title);
      
      setGeneratedRecipe(response.data.recipe);
      showSuccess('Recipe generated successfully!');
      
    } catch (error) {
      console.error('AI Recipe generation failed:', error);
      
      let errorMessage = 'Failed to generate recipe. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedIngredients([]);
    setCuisineType('');
    setMealType('');
    setGeneratedRecipe(null);
    setError(null);
    setLoading(false);
    onClose();
  };

  const handleReset = () => {
    setSelectedIngredients([]);
    setCuisineType('');
    setMealType('');
    setGeneratedRecipe(null);
    setError(null);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AIIcon color="primary" />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          AI Recipe Generator
        </Typography>
        <Button
          onClick={handleClose}
          sx={{ minWidth: 'auto', p: 1 }}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>

      <DialogContent>
        {!generatedRecipe ? (
          <Box>
            <Typography variant="body1" sx={{ mb: 3 }} color="text.secondary">
              Select ingredients you have available, and our AI will create a unique recipe just for you!
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <IngredientSelector
                  selectedIngredients={selectedIngredients}
                  onIngredientChange={handleIngredientChange}
                  maxIngredients={10}
                  label="Select Ingredients (Max 10)"
                  placeholder="Choose ingredients for your AI recipe..."
                  helperText="Select up to 10 ingredients for the best results"
                  disabled={loading}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Cuisine Type (Optional)</InputLabel>
                  <Select
                    value={cuisineType}
                    onChange={(e) => setCuisineType(e.target.value)}
                    label="Cuisine Type (Optional)"
                    disabled={loading}
                  >
                    {cuisineOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Meal Type (Optional)</InputLabel>
                  <Select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                    label="Meal Type (Optional)"
                    disabled={loading}
                  >
                    {mealOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        ) : (
          <Box>
            {/* Generated Recipe Display */}
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <RecipeIcon color="primary" />
                  <Typography variant="h5" component="h2">
                    {generatedRecipe.title}
                  </Typography>
                </Box>

                <Typography variant="body1" sx={{ mb: 3 }} color="text.secondary">
                  {generatedRecipe.description}
                </Typography>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TimeIcon fontSize="small" color="primary" />
                      <Typography variant="body2">
                        Prep: {generatedRecipe.prep_time}m
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TimeIcon fontSize="small" color="primary" />
                      <Typography variant="body2">
                        Cook: {generatedRecipe.cook_time}m
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <ServingsIcon fontSize="small" color="primary" />
                      <Typography variant="body2">
                        Serves: {generatedRecipe.servings}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Chip 
                      label={generatedRecipe.difficulty_level} 
                      color="secondary" 
                      size="small"
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ mb: 2 }} />

                <Typography variant="h6" gutterBottom>
                  Ingredients
                </Typography>
                <List dense>
                  {generatedRecipe.ingredients.map((ingredient, index) => (
                    <ListItem key={index} disablePadding>
                      <ListItemText primary={`• ${ingredient}`} />
                    </ListItem>
                  ))}
                </List>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom>
                  Instructions
                </Typography>
                <List>
                  {generatedRecipe.instructions.map((instruction, index) => (
                    <ListItem key={index} alignItems="flex-start">
                      <ListItemText
                        primary={`${index + 1}. ${instruction}`}
                        sx={{ mt: 0 }}
                      />
                    </ListItem>
                  ))}
                </List>

                {generatedRecipe.tips && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Tips
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {generatedRecipe.tips}
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {!generatedRecipe ? (
          <>
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleGenerateRecipe}
              disabled={loading || selectedIngredients.length === 0}
              startIcon={loading ? <CircularProgress size={20} /> : <AIIcon />}
            >
              {loading ? 'Generating...' : 'Generate Recipe'}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={handleReset}>
              Generate Another
            </Button>
            <Button onClick={handleClose} variant="contained">
              Close
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default AIRecipeModal;