import React from 'react';
import { Container, Typography, Box, Button } from '@mui/material';
import { Home as HomeIcon, Search as SearchIcon } from '@mui/icons-material';

function NotFoundPage() {
  return (
    <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h1" component="h1" sx={{ fontSize: '6rem', fontWeight: 'bold', mb: 2 }}>
          404
        </Typography>
        <Typography variant="h4" component="h2" gutterBottom>
          Page Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Sorry, the page you're looking for doesn't exist. It might have been moved or deleted.
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<HomeIcon />}
          href="/"
        >
          Go Home
        </Button>
        <Button
          variant="outlined"
          size="large"
          startIcon={<SearchIcon />}
          href="/search"
        >
          Search Recipes
        </Button>
      </Box>
    </Container>
  );
}

export default NotFoundPage;