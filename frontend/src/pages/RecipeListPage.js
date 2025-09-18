import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardMedia, 
  Button, 
  Box,
  TextField,
  Chip,
  Pagination,
  Paper
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useRecipes } from '../contexts/RecipeContext';
import { useSearch } from '../contexts/SearchContext';
import RecipeAvatar from '../components/RecipeAvatar';

function RecipeListPage() {
  const { recipes, loading: recipesLoading } = useRecipes();
  const { 
    searchQuery, 
    setSearchQuery, 
    searchRecipes,
    results: searchResults,
    isSearching
  } = useSearch();
  
  const [page, setPage] = useState(1);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery || '');
  const recipesPerPage = 12;

  const handleSearch = () => {
    setSearchQuery(localSearchQuery);
    searchRecipes(localSearchQuery.trim());
  };

  const clearSearch = () => {
    setLocalSearchQuery('');
    setSearchQuery('');
  };

  // Determine which recipes to show - search results or all recipes
  const hasActiveSearch = searchQuery && searchQuery.trim() !== '';
  
  const displayRecipes = hasActiveSearch ? searchResults : recipes;
  const loading = hasActiveSearch ? isSearching : recipesLoading;
  
  const paginatedRecipes = displayRecipes.slice((page - 1) * recipesPerPage, page * recipesPerPage);
  const totalPages = Math.ceil(displayRecipes.length / recipesPerPage);

  if (loading) {
    return (
      <Container>
        <Typography>Loading recipes...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {hasActiveSearch ? `Search Results (${displayRecipes.length})` : `All Recipes (${displayRecipes.length})`}
      </Typography>

      {/* Simple Search */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              placeholder="Search recipes..."
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<SearchIcon />}
                onClick={handleSearch}
              >
                Search Recipes
              </Button>
              <Button
                variant="outlined"
                color="primary"
                size="large"
                onClick={() => setLocalSearchQuery('')}
              >
                Clear
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>



      {/* Recipe Grid */}
      <Grid container spacing={3}>
        {paginatedRecipes.map((recipe) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={recipe.id}>
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
                <Typography gutterBottom variant="h6" component="h3" noWrap>
                  {recipe.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, height: '40px', overflow: 'hidden' }}>
                  {recipe.description}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Chip label={`${(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)} min`} size="small" />
                  <Chip label={recipe.difficulty_level || 'medium'} size="small" color="secondary" />
                  <Chip label={`${recipe.servings || 4} servings`} size="small" />
                </Box>
                <Button variant="contained" color="primary" fullWidth href={`/recipes/${recipe.id}`}>
                  View Recipe
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* No Results Message */}
      {displayRecipes.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            {hasActiveSearch ? 'No recipes found' : 'No recipes available'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {hasActiveSearch ? 'Try a different search term' : 'Be the first to add a recipe!'}
          </Typography>
          {hasActiveSearch && (
            <Button variant="contained" color="primary" onClick={clearSearch}>
              Show All Recipes
            </Button>
          )}
        </Box>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(event, newPage) => setPage(newPage)}
            color="primary"
            size="large"
          />
        </Box>
      )}
    </Container>
  );
}

export default RecipeListPage;