import { prisma } from '../lib/db.js';

export const getAllGames = async (req, res) => {
  try {
    const games = await prisma.game.findMany({
      include: {
        aiSummary: true,
      },
    });
    res.json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getGameById = async (req, res) => {
  try {
    const { id } = req.params;
    const game = await prisma.game.findUnique({
      where: { id: parseInt(id) },
      include: {
        aiSummary: true,
        reviews: {
          include: {
            analysis: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(game);
  } catch (error) {
    console.error(`Error fetching game ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
