import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import indexRoutes from './routes/indexRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - the boring but necessary stuff
app.use(helmet()); // Security headers
app.use(cors()); // CORS for frontend
app.use(express.json({ limit: '10mb' })); // JSON parsing with reasonable limit
app.use(express.urlencoded({ extended: true }));

// Request logging because debugging without logs is masochism
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint - for when ops asks "is it working?"
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    message: 'Still alive. Surprisingly.',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api', indexRoutes);

// 404 handler - for all those typos
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Can't find ${req.path}. Check your spelling maybe?`
  });
});

// Error handler - when things inevitably go wrong
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong',
    message: 'Well, this is embarrassing. Jean-Claude will fix it.'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           PINECONE INDEX MANAGER - BACKEND                   ║
║                                                              ║
║  Server running on: http://localhost:${PORT}                    ║
║  Health check: http://localhost:${PORT}/health                 ║
║  API docs: http://localhost:${PORT}/api                        ║
║                                                              ║
║  Built by Jean-Claude - The only one who gets things done   ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

export default app;