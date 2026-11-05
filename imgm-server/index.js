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
// A profile picture (up to ~300 KB, sent as base64) passes the default 100 KB
app.use('/api/users/me/avatar', express.json({ limit: '500kb' }));
app.use(express.json());

// Import routes
import gamesRouter from './src/routes/games.js';
import reviewsRouter from './src/routes/reviews.js';
import feedbackRouter from './src/routes/feedback.js';
import sitemapRouter from './src/routes/sitemap.js';
import backlogRouter from './src/routes/backlog.js';
import gotwRouter from './src/routes/gotw.js';
import usersRouter from './src/routes/users.js';
import guideRouter from './src/routes/guide.js';
import steamRouter from './src/routes/steam.js';
import discoverRouter from './src/routes/discover.js';
import socialRouter from './src/routes/social.js';
import adminRouter from './src/routes/admin.js';
import dailyRouter from './src/routes/daily.js';
import visitsRouter from './src/routes/visits.js';
import notificationsRouter from './src/routes/notifications.js';
import emailsRouter from './src/routes/emails.js';
import { startNotifyJobs } from './src/lib/notifyJobs.js';
import { startVisitCounter } from './src/lib/visits.js';
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
app.use('/api/users', socialRouter); // following players, and taste matches
app.use('/api/gotw', gotwRouter);
app.use('/api/backlog', backlogRouter);
app.use('/api/discover', discoverRouter); // Discover's thumbs up / down
app.use('/api/daily', dailyRouter); // the daily Guess the game
app.use('/api/visits', visitsRouter); // the visitor counter's page-view beacon (lib/visits.js)
app.use('/api/feedback', feedbackRouter);
// A connected Steam account's library (connecting itself is on the login server, /api/auth/steam)
app.use('/api/steam', steamRouter);
app.use('/api', sitemapRouter); // /api/sitemap.xml (imgm.app/sitemap.xml forwards here)
// Always mounted: the routes themselves check who may use Play Next (everyone, or the beta list)
app.use('/api/guide', guideRouter);
// The admin pages (stats, moderation): only for admins, a 404 for everyone else
app.use('/api/admin', adminRouter);
// The bell in the header, and the emails players chose (with the one-click unsubscribe)
app.use('/api/notifications', notificationsRouter);
app.use('/api/emails', emailsRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  startNotifyJobs(); // the release radar, reminders and opt-in emails (lib/notifyJobs.js)
  startVisitCounter(); // writes the gathered visitor counts once a minute
});
