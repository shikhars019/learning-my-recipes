import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  TextField,
  Grid,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar
} from '@mui/material';
import { 
  Restaurant as RestaurantIcon,
  ShoppingCart as ShoppingCartIcon,
  Add as AddIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { ingredientApi } from '../services/api';

function IngredientsPage() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  
  // Add Ingredient Dialog State
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    category: '',
    description: ''
  });
  const [creating, setCreating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchIngredients();
  }, [searchQuery, selectedCategory]);

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      const filters = {};
      
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }
      if (selectedCategory) {
        filters.category = selectedCategory;
      }
      
      const result = await ingredientApi.getAll(filters);
      
      if (result.success && result.data) {
        setIngredients(result.data.ingredients || []);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(
          (result.data.ingredients || []).map(i => i.category).filter(Boolean)
        )].sort();
        setCategories(uniqueCategories);
      } else {
        setError('Failed to load ingredients');
      }
    } catch (err) {
      console.error('Error fetching ingredients:', err);
      setError('Failed to load ingredients. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIngredient = async () => {
    if (!newIngredient.name.trim()) {
      return;
    }
    
    try {
      setCreating(true);
      const result = await ingredientApi.create({
        name: newIngredient.name.trim(),
        category: newIngredient.category || null,
        description: newIngredient.description.trim() || null
      });
      
      if (result.success) {
        setSuccessMessage(`Ingredient "${newIngredient.name}" created successfully!`);
        setAddDialogOpen(false);
        setNewIngredient({ name: '', category: '', description: '' });
        fetchIngredients(); // Refresh the list
      }
    } catch (err) {
      console.error('Error creating ingredient:', err);
      setError('Failed to create ingredient. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Ingredients
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Manage your ingredient database - view, search, and add new ingredients
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* Search and Filter Controls */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Search Ingredients"
              variant="outlined"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setAddDialogOpen(true)}
              sx={{ height: '56px' }}
            >
              Add Ingredient
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Ingredients List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Typography variant="h6" gutterBottom>
            {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''} found
          </Typography>
          
          {ingredients.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                {searchQuery || selectedCategory ? 'No ingredients match your search criteria.' : 'No ingredients found. Add some ingredients to get started!'}
              </Typography>
            </Paper>
          ) : (
            <Paper sx={{ p: 2 }}>
              <List>
                {ingredients.map((ingredient, index) => (
                  <ListItem key={ingredient.id} divider={index < ingredients.length - 1}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="subtitle1" component="span">
                            {ingredient.name}
                          </Typography>
                          {ingredient.category && (
                            <Chip
                              label={ingredient.category}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          {ingredient.description && (
                            <Typography variant="body2" color="text.secondary">
                              {ingredient.description}
                            </Typography>
                          )}
                          {ingredient.usage_count && (
                            <Typography variant="caption" color="text.secondary">
                              Used in {ingredient.usage_count} recipe{ingredient.usage_count !== 1 ? 's' : ''}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </>
      )}

      {/* Add Ingredient Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Ingredient</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Ingredient Name"
                  value={newIngredient.name}
                  onChange={(e) => setNewIngredient(prev => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="e.g., Organic Basil"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={newIngredient.category}
                    label="Category"
                    onChange={(e) => setNewIngredient(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <MenuItem value="">No Category</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                    <MenuItem value="herbs">Herbs</MenuItem>
                    <MenuItem value="spices">Spices</MenuItem>
                    <MenuItem value="vegetables">Vegetables</MenuItem>
                    <MenuItem value="fruits">Fruits</MenuItem>
                    <MenuItem value="grains">Grains</MenuItem>
                    <MenuItem value="proteins">Proteins</MenuItem>
                    <MenuItem value="dairy">Dairy</MenuItem>
                    <MenuItem value="oils">Oils & Vinegars</MenuItem>
                    <MenuItem value="baking">Baking</MenuItem>
                    <MenuItem value="condiments">Condiments</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description (Optional)"
                  value={newIngredient.description}
                  onChange={(e) => setNewIngredient(prev => ({ ...prev, description: e.target.value }))}
                  multiline
                  rows={3}
                  placeholder="Additional notes about this ingredient..."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={() => setAddDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateIngredient}
            variant="contained"
            color="primary"
            disabled={!newIngredient.name.trim() || creating}
          >
            {creating ? 'Creating...' : 'Add Ingredient'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
        message={successMessage}
      />
    </Container>
  );
}

export default IngredientsPage;