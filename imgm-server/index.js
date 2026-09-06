import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Import routes
import gamesRouter from './src/routes/games.js';
import reviewsRouter from './src/routes/reviews.js';
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

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
