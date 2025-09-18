import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Button,
  Badge,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Favorite as FavoriteIcon,
  ShoppingCart as ShoppingCartIcon,
  Add as AddIcon,
} from '@mui/icons-material';

import { useSearch } from '../../contexts/SearchContext';
import { useFavorites } from '../../hooks/useFavorites';
import { useShoppingList } from '../../hooks/useShoppingList';

/**
 * Header Component
 * 
 * Top navigation bar with responsive design and key action buttons.
 * 
 * Educational Notes:
 * - Uses Material-UI AppBar for consistent styling
 * - Responsive design with different layouts for mobile/desktop
 * - Integration with context for search and favorites
 * - Accessible navigation with proper ARIA labels
 */
function Header({ onSidebarToggle, sidebarOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { searchQuery } = useSearch();
  const { favorites = [] } = useFavorites();
  const { shoppingList = [] } = useShoppingList();

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleSearchClick = () => {
    navigate('/search');
  };

  const handleFavoritesClick = () => {
    navigate('/favorites');
  };

  const handleShoppingListClick = () => {
    navigate('/shopping-list');
  };

  const handleCreateRecipeClick = () => {
    navigate('/create-recipe');
  };

  const isActivePage = (path) => location.pathname === path;

  return (
    <AppBar 
      position="sticky" 
      elevation={1}
      sx={{ 
        zIndex: theme.zIndex.drawer + 1,
        backgroundColor: 'background.paper',
        color: 'text.primary',
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        {/* Sidebar toggle (mobile) */}
        <IconButton
          edge="start"
          color="inherit"
          aria-label="toggle navigation menu"
          onClick={onSidebarToggle}
          sx={{ 
            display: { md: sidebarOpen ? 'none' : 'block' },
            mr: 1
          }}
        >
          <MenuIcon />
        </IconButton>

        {/* Logo/Brand */}
        <Box 
          onClick={handleLogoClick}
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            cursor: 'pointer',
            '&:hover': { opacity: 0.8 }
          }}
        >
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #A100FF 0%, #B833FF 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: { xs: 'none', sm: 'block' }
            }}
          >
            My Recipes
          </Typography>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #A100FF 0%, #B833FF 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: { xs: 'block', sm: 'none' }
            }}
          >
            MR
          </Typography>
        </Box>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Action buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Search button */}
          <Tooltip title="Search recipes">
            <IconButton
              color={isActivePage('/search') ? 'primary' : 'inherit'}
              onClick={handleSearchClick}
              aria-label="search recipes"
            >
              <SearchIcon />
            </IconButton>
          </Tooltip>

          {/* Favorites button */}
          <Tooltip title="View favorites">
            <IconButton
              color={isActivePage('/favorites') ? 'primary' : 'inherit'}
              onClick={handleFavoritesClick}
              aria-label={`view favorites (${favorites?.length || 0} items)`}
            >
              <Badge badgeContent={favorites?.length || 0} color="error" max={99}>
                <FavoriteIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Shopping list button */}
          <Tooltip title="View shopping list">
            <IconButton
              color={isActivePage('/shopping-list') ? 'primary' : 'inherit'}
              onClick={handleShoppingListClick}
              aria-label={`view shopping list (${shoppingList?.length || 0} items)`}
            >
              <Badge badgeContent={shoppingList?.length || 0} color="secondary" max={99}>
                <ShoppingCartIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Create recipe button */}
          {!isMobile && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateRecipeClick}
              sx={{ ml: 1 }}
            >
              Create Recipe
            </Button>
          )}

          {/* Mobile create button */}
          {isMobile && (
            <Tooltip title="Create recipe">
              <IconButton
                color="primary"
                onClick={handleCreateRecipeClick}
                aria-label="create new recipe"
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Header;