import { prisma } from '../lib/db.js';
import { analyzeReview } from '../services/ai.js';

export const getReviewsByGameId = async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const reviews = await prisma.review.findMany({
      where: { gameId: parseInt(gameId) },
      include: {
        analysis: true,
        user: {
          select: { id: true, name: true, image: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createReview = async (req, res) => {
  try {
    const { 
      gameId, 
      rating, 
      reviewText, 
      hoursPlayed, 
      platform, 
      completionStatus, 
      playStyle, 
      difficulty, 
      recommendation 
    } = req.body;
    
    // TODO: Get actual logged-in user ID from Better Auth session middleware
    // Hardcoding a dummy user ID for now to allow testing before auth is fully wired
    const userId = req.user?.id || "dummy-user-id";
    
    // Ensure dummy user exists for testing (remove this block in prod)
    if (userId === "dummy-user-id") {
      await prisma.user.upsert({
        where: { id: "dummy-user-id" },
        update: {},
        create: { id: "dummy-user-id", email: "test@imgm.app", name: "Test User" }
      });
    }

    // 1. Save the raw review to the database
    const newReview = await prisma.review.create({
      data: {
        rating,
        reviewText,
        hoursPlayed,
        platform,
        completionStatus,
        playStyle,
        difficulty,
        recommendation,
        gameId: parseInt(gameId),
        userId
      }
    });

    // 2. We can return immediately to keep the UI fast, and analyze in the background
    // OR we can await the analysis. Since it's Gemini Flash, it's fast enough to await.
    const analysisResult = await analyzeReview(reviewText);
    
    // 3. Save the analysis to the DB
    const savedAnalysis = await prisma.reviewAnalysis.create({
      data: {
        sentiment: analysisResult.sentiment,
        rawLlmResponse: JSON.stringify(analysisResult),
        modelUsed: "gemini-1.5-flash",
        reviewId: newReview.id
      }
    });

    // 4. Return the complete package to the client
    const reviewWithAnalysis = await prisma.review.findUnique({
      where: { id: newReview.id },
      include: {
        analysis: true,
        user: {
          select: { id: true, name: true, image: true }
        }
      }
    });

    res.status(201).json(reviewWithAnalysis);
    
    // TODO: Trigger GameAISummary regeneration asynchronously if needed here

  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
