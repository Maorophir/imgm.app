import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { clientOrigins } from './src/lib/config.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// In production, requests arrive through a proxy (Vercel/Render) — trust its
// X-Forwarded-* headers so Express sees the real client IP and HTTPS protocol
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: clientOrigins,
  credentials: true
}));
// A saved Play Next chat (up to 10 answers with their picks) can pass the default 100 KB
app.use('/api/guide/chats', express.json({ limit: '400kb' }));
app.use(express.json());

// Import routes
import gamesRouter from './src/routes/games.js';
import reviewsRouter from './src/routes/reviews.js';
import usersRouter from './src/routes/users.js';
import guideRouter from './src/routes/guide.js';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './src/lib/auth.js';

// Basic health check route
app.get('/', (req, res) => {
  res.json({ message: 'IMGM API is running' });
});

// Auth Routes (Handled by Better Auth)
app.use("/api/auth", toNodeHandler(auth));

// API Routes
app.use('/api/games', gamesRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/users', usersRouter);
// Always mounted: the routes themselves check who may use Play Next (everyone, or the beta list)
app.use('/api/guide', guideRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
