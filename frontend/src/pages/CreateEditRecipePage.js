import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  TextField, 
  Button, 
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Autocomplete
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useRecipes } from '../contexts/RecipeContext';
import { useNotifications } from '../contexts/NotificationContext';
import { ingredientApi } from '../services/api';

function CreateEditRecipePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { createRecipe, updateRecipe, getRecipeById } = useRecipes();
  const { showRecipeCreated, showSuccess, showError } = useNotifications();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prep_time: 0,
    cook_time: 0,
    servings: 4,
    difficulty: 'medium',
    cuisine: '',
    ingredients: [],
    instructions: [],
    dietary_tags: [],
    notes: ''
  });

  const [newIngredient, setNewIngredient] = useState({
    name: '',
    amount: '',
    unit: '',
    notes: ''
  });

  // Ingredient autocomplete state
  const [ingredientOptions, setIngredientOptions] = useState([]);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [ingredientInputValue, setIngredientInputValue] = useState('');
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  const [newInstruction, setNewInstruction] = useState('');
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEdit && id) {
      const fetchRecipe = async () => {
        try {
          setLoading(true);
          const recipe = await getRecipeById(id);
          setFormData({
            title: recipe.title || '',
            description: recipe.description || '',
            prep_time: recipe.prep_time_minutes || 0,
            cook_time: recipe.cook_time_minutes || 0,
            servings: recipe.servings || 4,
            difficulty: recipe.difficulty_level || 'medium',
            cuisine: recipe.cuisine || '',
            ingredients: recipe.ingredients || [],
            instructions: recipe.instructions || [],
            dietary_tags: recipe.dietary_tags || [],
            notes: recipe.notes || ''
          });
        } catch (err) {
          setError('Failed to load recipe for editing');
        } finally {
          setLoading(false);
        }
      };
      fetchRecipe();
    }
  }, [isEdit, id, getRecipeById]);

  // Load all ingredients when component mounts (for fast autocomplete)
  useEffect(() => {
    const loadIngredients = async () => {
      setLoadingIngredients(true);
      try {
        const response = await ingredientApi.getAll();
        setIngredientOptions(response.data?.ingredients || response || []);
      } catch (error) {
        console.error('Failed to load ingredients:', error);
        setError('Failed to load ingredients. Please refresh the page.');
      } finally {
        setLoadingIngredients(false);
      }
    };

    loadIngredients();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addIngredient = () => {
    // Only allow adding ingredients that are selected from the dropdown
    if (!selectedIngredient) {
      setError('Please select an ingredient from the dropdown. Add new ingredients from the Ingredients page first.');
      return;
    }
    
    if (!newIngredient.amount.trim()) {
      setError('Please enter an amount for the ingredient.');
      return;
    }
    
    const ingredientToAdd = {
      name: selectedIngredient.name,
      ingredient_id: selectedIngredient.id,
      amount: newIngredient.amount.trim(),
      unit: newIngredient.unit.trim(),
      notes: newIngredient.notes.trim()
    };

    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, ingredientToAdd]
    }));
    
    // Reset form
    setNewIngredient({ name: '', amount: '', unit: '', notes: '' });
    setSelectedIngredient(null);
    setIngredientInputValue('');
    // Don't clear ingredientOptions - let the search function handle it
    setError(null); // Clear any error messages
  };

  const removeIngredient = (index) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };



  const addInstruction = () => {
    if (newInstruction.trim()) {
      setFormData(prev => ({
        ...prev,
        instructions: [...prev.instructions, newInstruction]
      }));
      setNewInstruction('');
    }
  };

  const removeInstruction = (index) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
    }));
  };

  const addDietaryTag = () => {
    if (newTag.trim() && !formData.dietary_tags.includes(newTag)) {
      setFormData(prev => ({
        ...prev,
        dietary_tags: [...prev.dietary_tags, newTag]
      }));
      setNewTag('');
    }
  };

  const removeDietaryTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      dietary_tags: prev.dietary_tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate that recipe has required content
      if (formData.ingredients.length === 0) {
        throw new Error('Please add at least one ingredient to the recipe.');
      }
      
      if (formData.instructions.length === 0) {
        throw new Error('Please add at least one instruction step to the recipe.');
      }

      // Validate that all ingredients have valid IDs (were selected from dropdown)
      const invalidIngredients = formData.ingredients.filter(ing => !ing.ingredient_id);
      if (invalidIngredients.length > 0) {
        throw new Error(`Please ensure all ingredients are selected from the dropdown. Invalid ingredients: ${invalidIngredients.map(ing => ing.name).join(', ')}`);
      }

      // Transform ingredients: lookup ingredient IDs from names
      const transformedIngredients = await Promise.all(
        formData.ingredients.map(async (ingredient) => {
          // If ingredient already has an ID, use it
          if (ingredient.ingredient_id) {
            return {
              ingredient_id: ingredient.ingredient_id, // Keep UUID as string, don't convert to integer
              quantity: parseFloat(ingredient.amount || ingredient.quantity || 0),
              unit: ingredient.unit || '',
              preparation: ingredient.notes || ingredient.preparation || ''
            };
          }
          
          // This should not happen with the new dropdown approach, 
          // but keeping as fallback for any existing recipes
          throw new Error(`Ingredient "${ingredient.name}" not found. Please ensure all ingredients exist before creating recipes.`);
        })
      );

      // Transform form data to match backend validation schema
      const transformedData = {
        ...formData,
        // Map frontend field names to backend field names
        difficulty_level: formData.difficulty, // Backend expects difficulty_level
        // Keep instructions as array - database expects TEXT[]
        instructions: Array.isArray(formData.instructions) 
          ? formData.instructions 
          : [formData.instructions].filter(Boolean), // Convert single string to array
        // Use transformed ingredients with proper IDs
        ingredients: transformedIngredients
        // TODO: Add user_id from auth context when authentication is implemented
      };
      
      // Remove the frontend field name to avoid confusion
      delete transformedData.difficulty;

      if (isEdit) {
        await updateRecipe(id, transformedData);
        showSuccess(`Recipe "${formData.title}" has been updated successfully!`);
        // For updates, navigate and refresh
        setTimeout(() => {
          navigate('/recipes');
          window.location.reload();
        }, 1000);
      } else {
        await createRecipe(transformedData);
        showRecipeCreated(formData.title);
        
        // For new recipes, show success message then navigate and refresh
        setTimeout(() => {
          navigate('/recipes');
          // Force a page refresh to ensure clean state
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      console.error('Recipe submission error:', err);
      const errorMessage = err.message || (isEdit ? 'Failed to update recipe' : 'Failed to create recipe');
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <Container>
        <Typography>Loading recipe...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {isEdit ? 'Edit Recipe' : 'Create New Recipe'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={4}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Recipe Title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Prep Time (minutes)"
                    value={formData.prep_time}
                    onChange={(e) => handleInputChange('prep_time', parseInt(e.target.value) || 0)}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Cook Time (minutes)"
                    value={formData.cook_time}
                    onChange={(e) => handleInputChange('cook_time', parseInt(e.target.value) || 0)}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Servings"
                    value={formData.servings}
                    onChange={(e) => handleInputChange('servings', parseInt(e.target.value) || 1)}
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Difficulty</InputLabel>
                    <Select
                      value={formData.difficulty}
                      onChange={(e) => handleInputChange('difficulty', e.target.value)}
                      label="Difficulty"
                    >
                      <MenuItem value="easy">Easy</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="hard">Hard</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Cuisine"
                    value={formData.cuisine}
                    onChange={(e) => handleInputChange('cuisine', e.target.value)}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Ingredients */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Ingredients
                </Typography>
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  onClick={() => window.open('/ingredients', '_blank')}
                  sx={{ textTransform: 'none' }}
                >
                  Manage Ingredients
                </Button>
              </Box>
              
              {/* Add New Ingredient Form */}
              <Box sx={{ 
                p: 2, 
                border: '1px dashed', 
                borderColor: 'divider', 
                borderRadius: 1, 
                bgcolor: 'action.hover',
                mb: 2 
              }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Add New Ingredient:
                </Typography>
                <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    fullWidth
                    size="small"
                    options={ingredientOptions}
                    getOptionLabel={(option) => option.name || ''}
                    value={selectedIngredient}
                    onChange={(event, newValue) => {
                      setSelectedIngredient(newValue);
                      if (newValue) {
                        setNewIngredient(prev => ({ ...prev, name: newValue.name }));
                      } else {
                        setNewIngredient(prev => ({ ...prev, name: '' }));
                      }
                    }}
                    inputValue={ingredientInputValue}
                    onInputChange={(event, newInputValue) => {
                      setIngredientInputValue(newInputValue);
                    }}
                    loading={loadingIngredients}
                    // Remove freeSolo to prevent custom input
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Search Ingredients"
                        placeholder="Type to search ingredients..."
                        helperText={selectedIngredient ? `Selected: ${selectedIngredient.name} (${selectedIngredient.category || 'No category'})` : 'Search and select an ingredient to add to this recipe'}
                        error={!selectedIngredient && ingredientInputValue.length > 0}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Box>
                          <Typography variant="body2">
                            {option.name}
                          </Typography>
                          {option.category && (
                            <Typography variant="caption" color="text.secondary">
                              {option.category}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}
                    noOptionsText={
                      <Box sx={{ p: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          No ingredients found. 
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Add new ingredients from the Ingredients page first.
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Amount"
                    value={newIngredient.amount}
                    onChange={(e) => setNewIngredient(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="e.g., 2.5"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Unit"
                    value={newIngredient.unit}
                    onChange={(e) => setNewIngredient(prev => ({ ...prev, unit: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Notes (optional)"
                      value={newIngredient.notes}
                      onChange={(e) => setNewIngredient(prev => ({ ...prev, notes: e.target.value }))}
                    />
                    <IconButton 
                      color="primary" 
                      onClick={addIngredient}
                      disabled={!selectedIngredient || !newIngredient.amount.trim()}
                      title={!selectedIngredient ? "Please select an ingredient" : !newIngredient.amount.trim() ? "Please enter an amount" : "Add ingredient"}
                    >
                      <AddIcon />
                    </IconButton>
                  </Box>
                </Grid>
              </Grid>
              </Box>

              {/* Ingredients List */}
              {formData.ingredients.length > 0 ? (
                <List>
                  {formData.ingredients.map((ingredient, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemText
                          primary={`${ingredient.quantity || ingredient.amount || ''} ${ingredient.unit || ''} ${ingredient.name}`.trim()}
                          secondary={ingredient.preparation || ingredient.notes}
                        />
                        <ListItemSecondaryAction>
                          <IconButton 
                            edge="end" 
                            color="error" 
                            onClick={() => removeIngredient(index)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < formData.ingredients.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No ingredients added yet. Use the form above to add ingredients to your recipe.
                </Typography>
              )}
            </Paper>
          </Grid>

          {/* Instructions */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Instructions
              </Typography>
              
              {/* Add New Instruction Form */}
              <Box sx={{ 
                p: 2, 
                border: '1px dashed', 
                borderColor: 'divider', 
                borderRadius: 1, 
                bgcolor: 'action.hover',
                mb: 2 
              }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Add New Instruction Step:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                  label="New Instruction Step"
                  placeholder="Enter a new instruction step (e.g., Heat oil in a pan over medium heat...)"
                  value={newInstruction}
                  onChange={(e) => setNewInstruction(e.target.value)}
                />
                <IconButton color="primary" onClick={addInstruction}>
                  <AddIcon />
                </IconButton>
                </Box>
              </Box>

              {/* Instructions List */}
              <List>
                {formData.instructions.map((instruction, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText
                        primary={`Step ${index + 1}`}
                        secondary={instruction}
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          color="error" 
                          onClick={() => removeInstruction(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < formData.instructions.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* Dietary Tags & Notes */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Additional Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Add Dietary Tag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                    />
                    <IconButton color="primary" onClick={addDietaryTag}>
                      <AddIcon />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {formData.dietary_tags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        onDelete={() => removeDietaryTag(tag)}
                        color="secondary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Chef's Notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<CancelIcon />}
                onClick={() => navigate('/recipes')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                disabled={loading || !formData.title}
              >
                {loading ? 'Saving...' : (isEdit ? 'Update Recipe' : 'Create Recipe')}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

export default CreateEditRecipePage;