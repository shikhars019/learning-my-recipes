import { useState, useCallback } from 'react';
import { useNotifications } from '../contexts/NotificationContext';

export const useShoppingList = () => {
  const [shoppingList, setShoppingList] = useState(() => {
    try {
      const stored = localStorage.getItem('shopping-list');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load shopping list from localStorage:', error);
      return [];
    }
  });
  
  const { showSuccess, showError } = useNotifications();

  const addToShoppingList = useCallback((ingredient) => {
    try {
      const existingItem = shoppingList.find(item => 
        item.name.toLowerCase() === ingredient.name.toLowerCase()
      );

      let updatedList;
      if (existingItem) {
        // Update quantity if item already exists
        updatedList = shoppingList.map(item =>
          item.id === existingItem.id
            ? { ...item, quantity: item.quantity + (ingredient.quantity || 1) }
            : item
        );
      } else {
        // Add new item
        const newItem = {
          id: Date.now() + Math.random(), // Simple ID generation
          name: ingredient.name,
          quantity: ingredient.quantity || 1,
          unit: ingredient.unit || '',
          recipe: ingredient.recipe || '',
          completed: false,
          addedAt: new Date().toISOString()
        };
        updatedList = [...shoppingList, newItem];
      }

      setShoppingList(updatedList);
      localStorage.setItem('shopping-list', JSON.stringify(updatedList));
      showSuccess(`${ingredient.name} added to shopping list!`);
    } catch (error) {
      console.error('Failed to add to shopping list:', error);
      showError('Failed to add ingredient to shopping list');
    }
  }, [shoppingList, showSuccess, showError]);

  const removeFromShoppingList = useCallback((itemId) => {
    try {
      const updatedList = shoppingList.filter(item => item.id !== itemId);
      setShoppingList(updatedList);
      localStorage.setItem('shopping-list', JSON.stringify(updatedList));
      showSuccess('Item removed from shopping list');
    } catch (error) {
      console.error('Failed to remove from shopping list:', error);
      showError('Failed to remove item from shopping list');
    }
  }, [shoppingList, showSuccess, showError]);

  const toggleCompleted = useCallback((itemId) => {
    try {
      const updatedList = shoppingList.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      );
      setShoppingList(updatedList);
      localStorage.setItem('shopping-list', JSON.stringify(updatedList));
    } catch (error) {
      console.error('Failed to toggle item completion:', error);
      showError('Failed to update item status');
    }
  }, [shoppingList, showError]);

  const updateQuantity = useCallback((itemId, newQuantity) => {
    try {
      if (newQuantity <= 0) {
        removeFromShoppingList(itemId);
        return;
      }

      const updatedList = shoppingList.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      );
      setShoppingList(updatedList);
      localStorage.setItem('shopping-list', JSON.stringify(updatedList));
    } catch (error) {
      console.error('Failed to update quantity:', error);
      showError('Failed to update item quantity');
    }
  }, [shoppingList, removeFromShoppingList, showError]);

  const addRecipeToShoppingList = useCallback((recipe) => {
    try {
      const ingredients = recipe.ingredients || [];
      ingredients.forEach(ingredient => {
        addToShoppingList({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          recipe: recipe.title
        });
      });
      showSuccess(`Ingredients from ${recipe.title} added to shopping list!`);
    } catch (error) {
      console.error('Failed to add recipe to shopping list:', error);
      showError('Failed to add recipe ingredients to shopping list');
    }
  }, [addToShoppingList, showSuccess, showError]);

  const clearCompleted = useCallback(() => {
    try {
      const updatedList = shoppingList.filter(item => !item.completed);
      setShoppingList(updatedList);
      localStorage.setItem('shopping-list', JSON.stringify(updatedList));
      showSuccess('Completed items cleared from shopping list');
    } catch (error) {
      console.error('Failed to clear completed items:', error);
      showError('Failed to clear completed items');
    }
  }, [shoppingList, showSuccess, showError]);

  const clearAll = useCallback(() => {
    try {
      setShoppingList([]);
      localStorage.removeItem('shopping-list');
      showSuccess('Shopping list cleared');
    } catch (error) {
      console.error('Failed to clear shopping list:', error);
      showError('Failed to clear shopping list');
    }
  }, [showSuccess, showError]);

  // Calculate statistics
  const totalItems = shoppingList.length;
  const completedItems = shoppingList.filter(item => item.completed).length;
  const pendingItems = totalItems - completedItems;

  return {
    shoppingList,
    addToShoppingList,
    removeFromShoppingList,
    toggleCompleted,
    updateQuantity,
    addRecipeToShoppingList,
    clearCompleted,
    clearAll,
    totalItems,
    completedItems,
    pendingItems
  };
};