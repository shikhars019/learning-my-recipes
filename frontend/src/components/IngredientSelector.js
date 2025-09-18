import React, { useState, useEffect } from 'react';
import {
  Autocomplete,
  TextField,
  Chip,
  Box,
  Typography,
  CircularProgress
} from '@mui/material';
import { ingredientApi } from '../services/api';

/**
 * Reusable ingredient selector component
 * Used for selecting multiple ingredients with autocomplete functionality
 */
function IngredientSelector({
  selectedIngredients,
  onIngredientChange,
  label = "Select Ingredients",
  placeholder = "Type to search and select ingredients...",
  helperText = "Start typing to search from available ingredients",
  maxIngredients = null,
  disabled = false
}) {
  const [availableIngredients, setAvailableIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load ingredients on component mount
  useEffect(() => {
    const loadIngredients = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await ingredientApi.getAll();
        setAvailableIngredients(response.data?.ingredients || response || []);
      } catch (error) {
        console.error('Failed to load ingredients:', error);
        setError('Failed to load ingredients');
      } finally {
        setLoading(false);
      }
    };

    loadIngredients();
  }, []);

  const handleIngredientChange = (event, newValue) => {
    if (maxIngredients && newValue.length > maxIngredients) {
      // Don't allow more than the maximum
      return;
    }
    onIngredientChange(newValue);
  };

  const getHelperText = () => {
    if (error) return error;
    if (maxIngredients) {
      const remaining = maxIngredients - selectedIngredients.length;
      if (remaining <= 0) {
        return `Maximum ${maxIngredients} ingredients allowed`;
      }
      return `${helperText} (${remaining} more allowed)`;
    }
    return helperText;
  };

  return (
    <Autocomplete
      multiple
      id="ingredient-selector"
      options={availableIngredients}
      getOptionLabel={(option) => option.name || ''}
      value={selectedIngredients}
      onChange={handleIngredientChange}
      loading={loading}
      disabled={disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={selectedIngredients.length === 0 ? placeholder : "Add more ingredients..."}
          helperText={getHelperText()}
          error={!!error}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => (
          <Chip
            key={option.id}
            variant="outlined"
            label={option.name}
            size="small"
            color="primary"
            {...getTagProps({ index })}
          />
        ))
      }
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
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
  );
}

export default IngredientSelector;