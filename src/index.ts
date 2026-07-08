import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import routes from './api/routes';
import { initializeDatabase } from './database';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize database
initializeDatabase();
console.log('Database initialized');

// Routes
app.use('/api/v1', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Kubo Risk Scoring Engine',
    version: '1.0.0',
    description: 'Transaction risk scoring API for fraud detection',
    endpoints: {
      health: 'GET /api/v1/health',
      score: 'POST /api/v1/risk/score',
      watchlist: 'GET /api/v1/watchlist',
      addToWatchlist: 'POST /api/v1/watchlist',
      removeFromWatchlist: 'DELETE /api/v1/watchlist/:id'
    },
    documentation: 'See README.md for detailed API documentation'
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   Kubo Risk Scoring Engine                    ║
║   Server running on port ${PORT}                ║
║                                               ║
║   API Base URL: http://localhost:${PORT}       ║
║   Health Check: http://localhost:${PORT}/api/v1/health
║                                               ║
║   Ready to score transactions!                ║
╚═══════════════════════════════════════════════╝
  `);
});

export default app;
