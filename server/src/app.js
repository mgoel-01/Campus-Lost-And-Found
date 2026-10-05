import path from 'node:path';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import itemRoutes from './routes/items.js';
import claimRoutes from './routes/claims.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

// The Express app lives in its own file so the automated tests can start it
// without index.js connecting to the real database.
const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use('/uploads', express.static(path.resolve('uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/claims', claimRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
