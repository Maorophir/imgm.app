import { prisma } from '../lib/db.js';
import { getSessionUser } from '../lib/session.js';
import { checkUsernameRules, normalizeUsername, nextChangeAllowedAt } from '../lib/usernameRules.js';

// Is `name` free for this user? (Their own current name counts as free.)
const isTaken = async (name, userId) => {
  const owner = await prisma.user.findUnique({ where: { username: normalizeUsername(name) }, select: { id: true } });
  return Boolean(owner && owner.id !== userId);
};

// GET /api/users/username-available?name=… — the live check while typing
export const checkUsername = async (req, res) => {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'You must be logged in.' });

    const name = String(req.query.name ?? '').trim();
    const problem = checkUsernameRules(name);
    if (problem) return res.json({ available: false, reason: problem });
    if (await isTaken(name, user.id)) return res.json({ available: false, reason: 'That name is taken.' });

    res.json({ available: true });
  } catch (error) {
    console.error('Error checking username:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/users/me/username { name } — choose or change your gamer tag
export const setUsername = async (req, res) => {
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'You must be logged in.' });

    const name = String(req.body?.name ?? '').trim();
    const problem = checkUsernameRules(name);
    if (problem) return res.status(400).json({ error: problem });

    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { username: true, usernameChangedAt: true },
    });

    // Only the capitalisation changed ("tom" → "Tom")? That's not a rename.
    const sameName = current.username === normalizeUsername(name);

    // Changing an existing name: once every 30 days
    const allowedAt = nextChangeAllowedAt(current.usernameChangedAt);
    if (current.username && !sameName && allowedAt > new Date()) {
      return res.status(429).json({
        error: `You can change your name again on ${allowedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`,
        nextChangeAt: allowedAt,
      });
    }

    if (await isTaken(name, user.id)) return res.status(409).json({ error: 'That name is taken.' });

    try {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          username: normalizeUsername(name),
          displayUsername: name,
          ...(sameName ? {} : { usernameChangedAt: new Date() }),
        },
        select: { username: true, displayUsername: true, usernameChangedAt: true },
      });
      res.json({ ...updated, nextChangeAt: nextChangeAllowedAt(updated.usernameChangedAt) });
    } catch (error) {
      // Two people grabbing the same name at the same moment: the database's
      // unique rule lets only one win (Prisma error P2002)
      if (error.code === 'P2002') return res.status(409).json({ error: 'That name is taken.' });
      throw error;
    }
  } catch (error) {
    console.error('Error setting username:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
