import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, useMediaQuery, useTheme } from '@mui/material';

import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

/**
 * AppLayout Component
 * 
 * Main layout wrapper that provides the overall structure for the application.
 * Includes responsive behavior for mobile and desktop views.
 * 
 * Educational Notes:
 * - Uses Material-UI's responsive breakpoints
 * - Implements mobile-first design with collapsible sidebar
 * - Provides consistent layout structure across all pages
 * - Uses React Router's Outlet for nested route rendering
 */
function AppLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header - Fixed at top */}
      <Header 
        onSidebarToggle={handleSidebarToggle}
        sidebarOpen={sidebarOpen}
      />
      
      {/* Main content area */}
      <Box sx={{ display: 'flex', flex: 1 }}>
        {/* Sidebar - Responsive navigation */}
        <Sidebar 
          open={sidebarOpen}
          onClose={handleSidebarClose}
          variant={isMobile ? 'temporary' : 'persistent'}
        />
        
        {/* Page content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            transition: theme.transitions.create(['margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
            marginLeft: isMobile ? 0 : sidebarOpen ? 0 : `-240px`,
            minHeight: 'calc(100vh - 64px)', // Account for header height
            position: 'relative',
          }}
        >
          {/* Page content container */}
          <Box
            sx={{
              flex: 1,
              p: { xs: 2, sm: 3, md: 4 },
              maxWidth: '1200px',
              mx: 'auto',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Outlet />
          </Box>
          
          {/* Footer */}
          <Footer />
        </Box>
      </Box>
    </Box>
  );
}

export default AppLayout;