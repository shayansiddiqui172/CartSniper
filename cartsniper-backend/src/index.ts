import express from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env';

// Route imports
import scanRoutes from './api/routes/scan';
import pricesRoutes from './api/routes/prices';
import cartRoutes from './api/routes/cart';
import alertsRoutes from './api/routes/alerts';
import flyerRoutes from './api/routes/flyer';

const app = express();
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Large limit for base64 images

// Serve frontend assets.
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/scan', scanRoutes);
app.use('/prices', pricesRoutes);
app.use('/cart', cartRoutes);
app.use('/alerts', alertsRoutes);
app.use('/flyer', flyerRoutes);

// Fallback: serve index.html for any non-API route.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server only outside serverless runtimes.
if (!isVercel) {
  const PORT = parseInt(env.PORT, 10);
  app.listen(PORT, () => {
    console.log(`CartSniper API running on http://localhost:${PORT}`);
  });
}

export default app;
