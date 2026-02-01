import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import authRoutes from './routes/auth.routes.js';
import donationRoutes from './routes/donation.routes.js';
import contactRoutes from './routes/contact.routes.js';
import schoolRoutes from './routes/school.routes.js';
import statsRoutes from './routes/stats.routes.js';
import inventoryRoutes from './routes/inventroy.routes.js';
import { errorHandler } from './middleware/errorHandler.js';



const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500'], 
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'CFS Kenya API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/inventory', inventoryRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
});