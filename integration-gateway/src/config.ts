export const PORT = process.env.PORT || 3000;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
export const API_VERSION = '1.0.0';

// For demo purposes only - in production, use a proper user database
export const DEMO_USERS = [
  {
    id: '1',
    username: 'demo',
    // In production, this would be a hashed password
    password: 'demo123'
  }
];

export const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

