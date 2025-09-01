import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import * as dotenv from 'dotenv';
import { RealtimeService } from './services/realtimeService';
import { createApiRoutes } from './api/routes';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api', limiter);

// Initialize realtime service
const realtimeService = new RealtimeService(server);

// API routes
app.use('/api', createApiRoutes(realtimeService));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io server ready`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected to Neon' : 'Not configured'}`);
});