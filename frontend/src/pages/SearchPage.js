import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  Paper,
  Chip,
  Autocomplete,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Clear as ClearIcon,
  RestaurantMenu as RecipeIcon 
} from '@mui/icons-material';
import { ingredientApi, recipeApi } from '../services/api';
import RecipeAvatar from '../components/RecipeAvatar';

function SearchPage() {
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [availableIngredients, setAvailableIngredients] = useState([]);
  const [matchingRecipes, setMatchingRecipes] = useState([]);
  const [searchMode, setSearchMode] = useState('any'); // 'any' or 'all'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  // Load ingredients on component mount
  useEffect(() => {
    const loadIngredients = async () => {
      setLoadingIngredients(true);
      try {
        const response = await ingredientApi.getAll();
        setAvailableIngredients(response.data?.ingredients || response || []);
      } catch (error) {
        console.error('Failed to load ingredients:', error);
        setError('Failed to load ingredients. Please refresh the page.');
      } finally {
        setLoadingIngredients(false);
      }
    };

    loadIngredients();
  }, []);

  // Search for recipes when ingredients are selected
  const searchRecipes = useCallback(async () => {
    if (selectedIngredients.length === 0) {
      setMatchingRecipes([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const ingredientIds = selectedIngredients.map(ingredient => ingredient.id);
      const url = `/api/recipes/search/ingredients?ingredients=${ingredientIds.join(',')}${searchMode === 'all' ? '&match=all' : ''}`;
      
      // Use fetch directly or add to the apiClient
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to search recipes');
      }
      
      setMatchingRecipes(data.recipes || []);
    } catch (error) {
      console.error('Error searching recipes by ingredients:', error);
      setError('Failed to search recipes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedIngredients, searchMode]);

  // Auto-search when ingredients or search mode changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchRecipes();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchRecipes]);

  const handleIngredientChange = (event, newIngredients) => {
    setSelectedIngredients(newIngredients);
  };

  const clearSearch = () => {
    setSelectedIngredients([]);
    setMatchingRecipes([]);
    setError(null);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        🔍 Find Recipes by Ingredients
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Select the ingredients you have available, and we'll find recipes you can make right now!
      </Typography>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Ingredient Selection */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          {/* Ingredient Autocomplete */}
          <Grid item xs={12}>
            <Autocomplete
              multiple
              id="ingredient-search"
              options={availableIngredients}
              getOptionLabel={(option) => option.name || ''}
              value={selectedIngredients}
              onChange={handleIngredientChange}
              loading={loadingIngredients}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Ingredients"
                  placeholder={selectedIngredients.length === 0 ? "Type to search and select ingredients..." : "Add more ingredients..."}
                  helperText="Start typing to search from available ingredients"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingIngredients ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={option.name}
                    size="small"
                    color="primary"
                    {...getTagProps({ index })}
                  />
                ))
              }
              renderOption={(props, option) => (
                <li {...props}>
                  <Box>
                    <Typography variant="body1">{option.name}</Typography>
                    {option.category && (
                      <Typography variant="caption" color="text.secondary">
                        {option.category}
                      </Typography>
                    )}
                  </Box>
                </li>
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText="No ingredients found"
              loadingText="Loading ingredients..."
            />
          </Grid>

          {/* Search Options */}
          {selectedIngredients.length > 1 && (
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Recipe Matching</FormLabel>
                <RadioGroup
                  row
                  value={searchMode}
                  onChange={(e) => setSearchMode(e.target.value)}
                >
                  <FormControlLabel
                    value="any"
                    control={<Radio />}
                    label="Has ANY of these ingredients"
                  />
                  <FormControlLabel
                    value="all"
                    control={<Radio />}
                    label="Has ALL of these ingredients"
                  />
                </RadioGroup>
              </FormControl>
            </Grid>
          )}

          {/* Action Buttons */}
          {selectedIngredients.length > 0 && (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<ClearIcon />}
                  onClick={clearSearch}
                >
                  Clear Selection
                </Button>
              </Box>
            </Grid>
          )}

          {/* Selected Ingredients Summary */}
          {selectedIngredients.length > 0 && (
            <Grid item xs={12}>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Selected ingredients ({selectedIngredients.length}):
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {selectedIngredients.map((ingredient) => (
                    <Chip 
                      key={ingredient.id}
                      label={ingredient.name}
                      size="small"
                      color="secondary"
                      variant="filled"
                    />
                  ))}
                </Box>
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Search Results */}
      <Box>
        {/* Loading State */}
        {loading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Finding recipes with your ingredients...
            </Typography>
          </Box>
        )}

        {/* No Results for Active Search */}
        {!loading && selectedIngredients.length > 0 && matchingRecipes.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <RecipeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No recipes found with those ingredients
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Try selecting different ingredients or switch to "ANY" matching mode
            </Typography>
            <Button variant="outlined" color="primary" onClick={clearSearch}>
              Clear Selection
            </Button>
          </Box>
        )}

        {/* Recipe Results */}
        {!loading && matchingRecipes.length > 0 && (
          <>
            <Typography variant="h5" gutterBottom>
              🍽️ Found {matchingRecipes.length} recipe{matchingRecipes.length !== 1 ? 's' : ''}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Showing recipes that contain {searchMode === 'any' ? 'any' : 'all'} of your selected ingredients
            </Typography>
            
            <Grid container spacing={3}>
              {matchingRecipes.map((recipe) => (
                <Grid item xs={12} sm={6} md={4} key={recipe.id}>
                  <Card 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': { 
                        transform: 'translateY(-4px)',
                        boxShadow: 4 
                      }
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
                      
                      {/* Recipe Stats */}
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        <Chip 
                          label={`${(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)} min`} 
                          size="small" 
                        />
                        <Chip 
                          label={recipe.difficulty_level || 'medium'} 
                          size="small" 
                          color="secondary" 
                        />
                        <Chip 
                          label={`${recipe.servings || 4} servings`} 
                          size="small" 
                        />
                        {recipe.matching_ingredients && (
                          <Chip 
                            label={`${recipe.matching_ingredients} matching`} 
                            size="small" 
                            color="success"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      
                      <Button 
                        variant="contained" 
                        color="primary"
                        fullWidth 
                        href={`/recipes/${recipe.id}`}
                        sx={{ mt: 'auto' }}
                      >
                        View Recipe
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {/* Default State - No Ingredients Selected */}
        {!loading && selectedIngredients.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <SearchIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              🥘 Ready to Cook?
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: '600px', mx: 'auto' }}>
              Select the ingredients you have available from the autocomplete above, and we'll find recipes you can make right now!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              💡 <strong>Tip:</strong> You can search by any ingredient name and choose to match ANY or ALL selected ingredients.
            </Typography>
            <Button variant="outlined" color="primary" href="/recipes" startIcon={<RecipeIcon />}>
              Browse All Recipes Instead
            </Button>
          </Box>
        )}
      </Box>
    </Container>
  );
}

export default SearchPage;