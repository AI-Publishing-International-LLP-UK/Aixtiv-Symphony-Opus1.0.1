import React from 'react';
import { 
  Typography, 
  Container, 
  Box, 
  Button, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  CardActions 
} from '@mui/material';
import { ThemeToggle } from '../theme';

const DemoPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <ThemeToggle />
        </Box>

        <Typography variant="h2" component="h1" gutterBottom>
          Material UI Theme Demo
        </Typography>
        
        <Typography variant="h5" component="h2" gutterBottom>
          This page demonstrates the Material UI theme with light and dark mode support.
        </Typography>

        <Paper elevation={3} sx={{ p: 3, my: 4 }}>
          <Typography variant="h4" gutterBottom>
            Theme Features
          </Typography>
          <Typography paragraph>
            • Light and dark mode support<br />
            • Persistent theme preference with localStorage<br />
            • Custom typography and component styling<br />
            • Emotion cache for server-side rendering<br />
            • Integration with Tailwind CSS
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="contained" color="primary">
              Primary Button
            </Button>
            <Button variant="contained" color="secondary">
              Secondary Button
            </Button>
            <Button variant="outlined" color="primary">
              Outlined Button
            </Button>
          </Box>
        </Paper>

        <Grid container spacing={3} sx={{ mt: 4 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h5" component="div">
                  Card Title 1
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This card demonstrates the Material UI styling with our custom theme.
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small">Learn More</Button>
              </CardActions>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h5" component="div">
                  Card Title 2
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  The cards have custom border radius and shadow based on the theme.
                </Typography>
              </CardContent>

