import React from 'react';
import { Avatar } from '@mui/material';

/**
 * RecipeAvatar - Generates a colorful avatar with the first letter of the recipe name
 * Similar to Material Design contact avatars
 */
function RecipeAvatar({ 
  recipeName, 
  size = 40, 
  sx = {}, 
  variant = 'circular',
  ...props 
}) {
  // Get first letter of recipe name
  const firstLetter = recipeName ? recipeName.charAt(0).toUpperCase() : 'R';
  
  // Generate consistent color based on recipe name
  const getAvatarColor = (name) => {
    if (!name) return '#9c27b0'; // Default purple
    
    // Predefined color palette inspired by Material Design
    const colors = [
      '#f44336', // Red
      '#e91e63', // Pink
      '#9c27b0', // Purple
      '#673ab7', // Deep Purple
      '#3f51b5', // Indigo
      '#2196f3', // Blue
      '#03a9f4', // Light Blue
      '#00bcd4', // Cyan
      '#009688', // Teal
      '#4caf50', // Green
      '#8bc34a', // Light Green
      '#cddc39', // Lime
      '#ffeb3b', // Yellow
      '#ffc107', // Amber
      '#ff9800', // Orange
      '#ff5722', // Deep Orange
      '#795548', // Brown
      '#607d8b', // Blue Grey
    ];
    
    // Generate hash from recipe name for consistent color selection
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const backgroundColor = getAvatarColor(recipeName);
  
  return (
    <Avatar
      variant={variant}
      sx={{
        width: size,
        height: size,
        bgcolor: backgroundColor,
        color: 'white',
        fontWeight: 600,
        fontSize: size * 0.4, // Scale font size with avatar size
        ...sx
      }}
      {...props}
    >
      {firstLetter}
    </Avatar>
  );
}

export default RecipeAvatar;