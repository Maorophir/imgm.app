import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
import gamesRouter from './src/routes/games.js';
import reviewsRouter from './src/routes/reviews.js';

// Basic health check route
app.get('/', (req, res) => {
  res.json({ message: 'IMGM API is running' });
});

// API Routes
app.use('/api/games', gamesRouter);
app.use('/api/reviews', reviewsRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
