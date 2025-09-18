import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Home as HomeIcon,
  Restaurant as RestaurantIcon,
  Search as SearchIcon,
  Inventory as InventoryIcon,
  Favorite as FavoriteIcon,
  ShoppingCart as ShoppingCartIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

import { useFavorites } from '../../hooks/useFavorites';
import { useShoppingList } from '../../hooks/useShoppingList';

/**
 * Sidebar Component
 * 
 * Navigation sidebar with primary navigation links and user features.
 * Responsive design with drawer behavior on mobile devices.
 * 
 * Educational Notes:
 * - Uses Material-UI Drawer component for sliding behavior
 * - Implements responsive navigation patterns
 * - Visual feedback for active navigation items
 * - Accessible navigation with proper ARIA labels
 */

const DRAWER_WIDTH = 240;

// Navigation items configuration
const navigationItems = [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    icon: HomeIcon,
    description: 'Recipe discovery and overview'
  },
  {
    id: 'recipes',
    label: 'All Recipes',
    path: '/recipes',
    icon: RestaurantIcon,
    description: 'Browse and search recipes by name'
  },
  {
    id: 'search',
    label: 'Ingredient Search',
    path: '/search',
    icon: SearchIcon,
    description: 'Find recipes using available ingredients'
  },
  {
    id: 'ingredients',
    label: 'Ingredients',
    path: '/ingredients',
    icon: InventoryIcon,
    description: 'Explore ingredient database'
  },
];

const userFeatureItems = [
  {
    id: 'favorites',
    label: 'Favorites',
    path: '/favorites',
    icon: FavoriteIcon,
    description: 'Your favorite recipes',
    showBadge: true,
    badgeKey: 'favorites'
  },
  {
    id: 'shopping-list',
    label: 'Shopping List',
    path: '/shopping-list',
    icon: ShoppingCartIcon,
    description: 'Your shopping list',
    showBadge: true,
    badgeKey: 'shoppingList'
  },
  {
    id: 'create-recipe',
    label: 'Create Recipe',
    path: '/create-recipe',
    icon: AddIcon,
    description: 'Add a new recipe'
  },
];

function Sidebar({ open, onClose, variant = 'persistent' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  
  const { favorites = [] } = useFavorites();
  const { shoppingList = [] } = useShoppingList();

  const handleNavigate = (path) => {
    navigate(path);
    if (variant === 'temporary') {
      onClose();
    }
  };

  const isActivePath = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const getBadgeCount = (badgeKey) => {
    switch (badgeKey) {
      case 'favorites':
        return favorites?.length || 0;
      case 'shoppingList':
        return shoppingList?.length || 0;
      default:
        return 0;
    }
  };

  const renderNavigationItem = (item) => {
    const Icon = item.icon;
    const isActive = isActivePath(item.path);
    const badgeCount = item.showBadge ? getBadgeCount(item.badgeKey) : 0;

    return (
      <ListItem key={item.id} disablePadding>
        <ListItemButton
          onClick={() => handleNavigate(item.path)}
          selected={isActive}
          sx={{
            borderRadius: 2,
            mx: 1,
            mb: 0.5,
            '&.Mui-selected': {
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              '& .MuiListItemIcon-root': {
                color: 'primary.contrastText',
              }
            },
            '&:hover': {
              backgroundColor: 'action.hover',
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <Icon />
          </ListItemIcon>
          <ListItemText 
            primary={item.label}
            secondary={!isActive ? item.description : null}
            primaryTypographyProps={{
              fontWeight: isActive ? 600 : 400,
              fontSize: '0.875rem'
            }}
            secondaryTypographyProps={{
              fontSize: '0.75rem',
              sx: { display: { xs: 'none', md: 'block' } }
            }}
          />
          {item.showBadge && badgeCount > 0 && (
            <Chip
              label={badgeCount}
              size="small"
              color={isActive ? 'secondary' : 'primary'}
              sx={{
                height: 20,
                fontSize: '0.75rem',
                '& .MuiChip-label': {
                  px: 1
                }
              }}
            />
          )}
        </ListItemButton>
      </ListItem>
    );
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Sidebar header */}
      <Box sx={{ p: 2, pt: variant === 'temporary' ? 2 : 9 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Navigation
        </Typography>
      </Box>

      {/* Main navigation */}
      <List sx={{ px: 1, flex: 1 }}>
        {navigationItems.map(renderNavigationItem)}
        
        <Divider sx={{ my: 2, mx: 2 }} />
        
        {/* User features section */}
        <Box sx={{ px: 1, mb: 1 }}>
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'text.secondary', 
              textTransform: 'uppercase',
              fontWeight: 600,
              letterSpacing: '0.1em'
            }}
          >
            Your Recipes
          </Typography>
        </Box>
        
        {userFeatureItems.map(renderNavigationItem)}
      </List>

      {/* Sidebar footer */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          My Recipes v1.0
        </Typography>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          Recipe Management Platform
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          borderRight: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        },
      }}
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
    >
      {drawerContent}
    </Drawer>
  );
}

export default Sidebar;