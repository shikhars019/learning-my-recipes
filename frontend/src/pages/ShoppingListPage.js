import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  List, 
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Checkbox,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  Badge,
  Fab
} from '@mui/material';
import { 
  Delete as DeleteIcon,
  Add as AddIcon,
  Clear as ClearIcon,
  ShoppingCart as ShoppingCartIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useShoppingList } from '../hooks/useShoppingList';

function ShoppingListPage() {
  const {
    shoppingList,
    addToShoppingList,
    removeFromShoppingList,
    toggleCompleted,
    updateQuantity,
    clearCompleted,
    clearAll,
    totalItems,
    completedItems,
    pendingItems
  } = useShoppingList();

  const [openDialog, setOpenDialog] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: 1,
    unit: ''
  });

  const handleAddItem = () => {
    if (newItem.name.trim()) {
      addToShoppingList(newItem);
      setNewItem({ name: '', quantity: 1, unit: '' });
      setOpenDialog(false);
    }
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    const quantity = parseInt(newQuantity);
    if (!isNaN(quantity) && quantity >= 0) {
      updateQuantity(itemId, quantity);
    }
  };

  const groupedItems = shoppingList.reduce((groups, item) => {
    const recipe = item.recipe || 'Other Items';
    if (!groups[recipe]) {
      groups[recipe] = [];
    }
    groups[recipe].push(item);
    return groups;
  }, {});

  if (totalItems === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Shopping List
        </Typography>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ShoppingCartIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Your shopping list is empty
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Add ingredients from recipes or create custom items to get started.
          </Typography>
          <Button variant="contained" color="primary" onClick={() => setOpenDialog(true)}>
            Add First Item
          </Button>
        </Box>

        {/* Add Item Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add Shopping List Item</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Item Name"
              fullWidth
              variant="outlined"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Quantity"
                type="number"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                inputProps={{ min: 1 }}
                sx={{ width: 120 }}
              />
              <TextField
                label="Unit (optional)"
                value={newItem.unit}
                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                placeholder="cups, lbs, etc."
                sx={{ flex: 1 }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button color="primary" onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleAddItem} variant="contained" color="primary">Add Item</Button>
          </DialogActions>
        </Dialog>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Shopping List
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Chip 
              label={`${totalItems} total`} 
              color="primary" 
              variant="outlined"
            />
            <Chip 
              label={`${pendingItems} pending`} 
              color="warning" 
              variant="outlined"
            />
            <Chip 
              label={`${completedItems} completed`} 
              color="success" 
              variant="outlined"
            />
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {completedItems > 0 && (
            <Button
              variant="outlined"
              color="primary"
              startIcon={<ClearIcon />}
              onClick={clearCompleted}
              size="small"
            >
              Clear Completed
            </Button>
          )}
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={clearAll}
            size="small"
          >
            Clear All
          </Button>
        </Box>
      </Box>

      {/* Shopping List Groups */}
      {Object.entries(groupedItems).map(([recipeName, items]) => (
        <Box key={recipeName} sx={{ mb: 3 }}>
          <Typography variant="h6" component="h3" sx={{ mb: 1, color: 'primary.main' }}>
            {recipeName}
          </Typography>
          <List sx={{ backgroundColor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
            {items.map((item, index) => (
              <React.Fragment key={item.id}>
                <ListItem>
                  <ListItemIcon>
                    <Checkbox
                      checked={item.completed}
                      onChange={() => toggleCompleted(item.id)}
                      color="success"
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          sx={{
                            textDecoration: item.completed ? 'line-through' : 'none',
                            color: item.completed ? 'text.secondary' : 'text.primary'
                          }}
                        >
                          {item.name}
                        </Typography>
                        {item.completed && (
                          <CheckCircleIcon color="success" fontSize="small" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <TextField
                          size="small"
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                          inputProps={{ min: 0, style: { width: '60px' } }}
                          disabled={item.completed}
                        />
                        {item.unit && (
                          <Typography variant="body2" color="text.secondary">
                            {item.unit}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => removeFromShoppingList(item.id)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < items.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Box>
      ))}

      {/* Floating Action Button to Add Items */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setOpenDialog(true)}
      >
        <AddIcon />
      </Fab>

      {/* Add Item Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Shopping List Item</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Item Name"
            fullWidth
            variant="outlined"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Quantity"
              type="number"
              value={newItem.quantity}
              onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
              inputProps={{ min: 1 }}
              sx={{ width: 120 }}
            />
            <TextField
              label="Unit (optional)"
              value={newItem.unit}
              onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
              placeholder="cups, lbs, etc."
              sx={{ flex: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleAddItem} variant="contained">Add Item</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ShoppingListPage;