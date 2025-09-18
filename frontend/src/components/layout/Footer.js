import React from 'react';
import {
  Box,
  Container,
  Typography,
  Link,
  Divider,
  Grid,
  useTheme,
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  School as SchoolIcon,
  Code as CodeIcon,
} from '@mui/icons-material';

/**
 * Footer Component
 * 
 * Application footer with educational information and links.
 * 
 * Educational Notes:
 * - Provides context about the educational nature of the project
 * - Includes links to relevant resources for students
 * - Responsive design with stacked layout on mobile
 * - Uses semantic HTML structure for accessibility
 */
function Footer() {
  const theme = useTheme();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        mt: 'auto',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* About section */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              My Recipes
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              A full-stack web application built with React, Node.js, 
              and PostgreSQL. A comprehensive recipe management system 
              for organizing and discovering your favorite dishes.
            </Typography>
          </Grid>

          {/* Educational resources */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Educational Resources
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link 
                href="#" 
                color="text.secondary" 
                underline="hover"
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <SchoolIcon fontSize="small" />
                Student Documentation
              </Link>
              <Link 
                href="#" 
                color="text.secondary" 
                underline="hover"
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <CodeIcon fontSize="small" />
                Code Examples
              </Link>
              <Link 
                href="#" 
                color="text.secondary" 
                underline="hover"
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <GitHubIcon fontSize="small" />
                GitHub Repository
              </Link>
            </Box>
          </Grid>

          {/* Technologies used */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Technologies
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Frontend:</strong> React 18, Material-UI, React Router
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Backend:</strong> Node.js, Express.js, PostgreSQL
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Tools:</strong> Vite, ESLint, Jest, React Query
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Attribution */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ textAlign: 'center' }}
          >
            Built with ❤️ by ATC Newcastle
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default Footer;