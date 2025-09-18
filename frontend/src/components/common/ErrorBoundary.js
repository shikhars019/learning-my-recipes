import React from 'react';
import { Box, Typography, Button, Alert, AlertTitle } from '@mui/material';
import { ErrorOutline as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRefresh = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            textAlign: 'center',
            p: 4
          }}
        >
          <Alert
            severity="error"
            sx={{ mb: 3, maxWidth: 600 }}
            icon={<ErrorIcon fontSize="large" />}
          >
            <AlertTitle>
              <Typography variant="h5" component="div">
                Oops! Something went wrong
              </Typography>
            </AlertTitle>
            <Typography variant="body1" sx={{ mb: 2 }}>
              We encountered an unexpected error. This has been logged and we'll look into it.
            </Typography>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box sx={{ mt: 2, textAlign: 'left' }}>
                <Typography variant="body2" fontWeight="bold">
                  Error Details:
                </Typography>
                <Typography variant="body2" component="pre" sx={{ 
                  fontSize: '0.75rem',
                  overflow: 'auto',
                  backgroundColor: 'background.paper',
                  p: 1,
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider'
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </Typography>
              </Box>
            )}
          </Alert>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={this.handleRefresh}
              startIcon={<RefreshIcon />}
            >
              Refresh Page
            </Button>
            <Button
              variant="outlined"
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
            <Button
              variant="outlined"
              href="/"
            >
              Go Home
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;