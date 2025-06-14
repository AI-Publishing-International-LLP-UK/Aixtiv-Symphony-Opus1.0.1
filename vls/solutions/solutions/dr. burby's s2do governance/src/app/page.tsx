'use client';

// Import React and other components but not Metadata as that's handled in metadata.ts
import React from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Container, 
  Grid, 
  Button, 
  Paper,
  Stack,
  Divider,
  Chip,
  Avatar
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SecurityIcon from '@mui/icons-material/Security';
import BarChartIcon from '@mui/icons-material/BarChart';
import GroupIcon from '@mui/icons-material/Group';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';

const HomePage = () => {
  return (
    <Container maxWidth="lg" className="py-8">
      {/* Header with ThemeToggle */}
      <Box className="flex justify-between items-center mb-8">
        <Typography variant="h3" className="font-bold text-primary">
          S2DO Governance Dashboard
        </Typography>
        <ThemeToggle />
      </Box>

      {/* Hero section with Material UI + Tailwind */}
      <Paper elevation={0} className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 mb-8 p-8 rounded-xl">
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h4" className="font-bold mb-4">
              Governance Made Simple
            </Typography>
            <Typography variant="body1" className="text-gray-600 dark:text-gray-300 mb-6">
              Manage your organization's governance, risk, and compliance with our integrated dashboard.
              Built with Material UI and Tailwind CSS working together harmoniously.
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button 
                variant="contained" 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                Get Started
              </Button>
              <Button 
                variant="outlined" 
                className="border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                Learn More
              </Button>
            </Stack>
          </Grid>
          <Grid item xs={12} md={4} className="flex justify-center">
            <Box className="w-full max-w-[200px] h-[200px] bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <SecurityIcon className="text-white" sx={{ fontSize: 100 }} />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Stats cards with Tailwind styling on Material UI components */}
      <Typography variant="h5" className="font-bold mb-4">
        Governance Metrics
      </Typography>
      <Grid container spacing={3} className="mb-8">
        {[
          { title: 'Compliance Score', value: '87%', icon: <BarChartIcon />, color: 'bg-green-100 dark:bg-green-900/30' },
          { title: 'Pending Reviews', value: '12', icon: <DashboardIcon />, color: 'bg-blue-100 dark:bg-blue-900/30' },
          { title: 'Security Alerts', value: '3', icon: <SecurityIcon />, color: 'bg-red-100 dark:bg-red-900/30' },
          { title: 'Team Members', value: '24', icon: <GroupIcon />, color: 'bg-purple-100 dark:bg-purple-900/30' }
        ].map((item, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card className={`${item.color} border-0 transition-all hover:shadow-md`}>
              <CardContent className="flex flex-col items-center text-center p-6">
                <Box className="mb-2 text-gray-700 dark:text-gray-200">
                  {item.icon}
                </Box>
                <Typography variant="h4" className="font-bold my-2">
                  {item.value}
                </Typography>
                <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                  {item.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Activities */}
      <Paper className="p-6 mb-8 rounded-xl">
        <Typography variant="h5" className="font-bold mb-4">
          Recent Activities
        </Typography>
        <Divider className="mb-4" />
        
        {[
          { user: 'John Smith', action: 'Updated security policy', time: '2 hours ago', avatar: 'JS' },
          { user: 'Sarah Johnson', action: 'Completed compliance review', time: '5 hours ago', avatar: 'SJ' },
          { user: 'Michael Brown', action: 'Added new team member', time: 'Yesterday', avatar: 'MB' },
          { user: 'Emily Davis', action: 'Flagged potential risk', time: '2 days ago', avatar: 'ED' }
        ].map((activity, index) => (
          <Box key={index} className="flex items-center py-3 border-b border-gray-100 last:border-0">
            <Avatar className="bg-indigo-600 mr-4">{activity.avatar}</Avatar>
            <Box className="flex-1">
              <Typography variant="body1" className="font-medium">
                {activity.user}
              </Typography>
              <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                {activity.action}
              </Typography>
            </Box>
            <Chip 
              label={activity.time} 
              size="small"
              className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
            />
          </Box>
        ))}
      </Paper>

      {/* Footer */}
      <Box className="text-center text-gray-500 dark:text-gray-400 py-4">
        <Typography variant="body2">
          Material UI + Tailwind CSS Demo © {new Date().getFullYear()}
        </Typography>
        <Typography variant="body2" className="mt-1">
          Toggle between light and dark modes using the theme switch in the header
        </Typography>
      </Box>
    </Container>
  );
};

export default HomePage;
