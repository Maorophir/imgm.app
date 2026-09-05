/**
 * AI Service Wrapper
 * 
 * Provides a unified interface for all LLM calls.
 * Currently uses Gemini (Flash-tier) as the underlying provider for fast, 
 * cost-effective text classification and summarization.
 */

// TODO: Import the official @google/genai SDK when API key is available
// import { GoogleGenAI } from '@google/genai';

/**
 * Analyzes a raw user review to extract sentiment, a concise summary, and tags.
 * 
 * @param {string} text - The raw review text submitted by the user.
 * @returns {Promise<{ sentiment: string, summary: string, tags: string[] }>}
 */
export const analyzeReview = async (text) => {
  try {
    // ---------------------------------------------------------
    // TODO: Hook up actual Gemini API call here once key is set
    // const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    // const response = await ai.models.generateContent({ ... });
    // ---------------------------------------------------------

    console.log(`[AI Service] Analyzing review: "${text.substring(0, 30)}..."`);
    
    // Simulated delay for now
    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock response structure
    return {
      sentiment: "Positive", // Positive | Mixed | Negative
      summary: "A very positive review focusing on the core gameplay loop.",
      tags: ["gameplay", "highly recommended"]
    };
  } catch (error) {
    console.error("[AI Service] Error analyzing review:", error);
    // Fallback/safe return so the app doesn't crash on API failure
    return {
      sentiment: "Neutral",
      summary: "Could not analyze review at this time.",
      tags: []
    };
  }
};
