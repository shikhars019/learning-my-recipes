import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { SnackbarProvider } from 'notistack';
import { HelmetProvider } from 'react-helmet-async';

import App from './App';
import theme from './theme';
import { RecipeProvider } from './contexts/RecipeContext';
import { UserProvider } from './contexts/UserContext';
import { SearchProvider } from './contexts/SearchContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <SnackbarProvider 
            maxSnack={3}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            autoHideDuration={5000}
          >
            <BrowserRouter>
              <UserProvider>
                <RecipeProvider>
                  <SearchProvider>
                    <NotificationProvider>
                      <App />
                    </NotificationProvider>
                  </SearchProvider>
                </RecipeProvider>
              </UserProvider>
            </BrowserRouter>
          </SnackbarProvider>
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
);