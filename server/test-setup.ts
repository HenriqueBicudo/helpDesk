import express from 'express';
import { registerRoutes } from './routes';

const app = express();

console.log('Starting route setup...');
try {
  const server = registerRoutes(app);
  console.log('Routes setup completed successfully');
} catch (error) {
  console.error('Error setting up routes:', error);
}
