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
// Disable CSP entirely for OpenRun compatibility (they set their own)
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP - OpenRun sets its own
})); // Security headers without CSP
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

// Health check for API path too
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'Pinecone Index Manager',
    message: 'Enterprise-grade vector management at your service',
    timestamp: new Date().toISOString()
  });
});

// Serve HTML files through Express routes
// Support both root and OpenRun base paths
const htmlRoutes = ['/', '/index.html', '/simple-frontend.html'];
const basePaths = ['', '/sl/pinecone-manager'];

basePaths.forEach(basePath => {
  htmlRoutes.forEach(route => {
    app.get(basePath + route, (_req, res) => {
      const fileName = route === '/' ? 'index.html' : route.substring(1);
      res.sendFile(fileName, { root: '.' });
    });
  });
});

// Also serve static files as fallback
app.use(express.static('.'));

// API routes - support both root and OpenRun base paths
app.use('/api', indexRoutes);
app.use('/sl/pinecone-manager/api', indexRoutes);

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