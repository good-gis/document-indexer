/**
 * searcher.js - Module for searching similar documents in the index
 * Includes relevance filtering by similarity threshold
 */

// Default similarity threshold (0.0 - 1.0)
// Documents below this threshold are considered irrelevant
const DEFAULT_THRESHOLD = 0.3;

/**
 * Calculates cosine similarity between two vectors
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} - Cosine similarity (-1 to 1)
 */
export function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);

  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

/**
 * Searches the index for most similar documents with relevance filtering
 * @param {Object} index - The document index
 * @param {number[]} queryEmbedding - Query embedding vector
 * @param {Object} options - Search options
 * @param {number} options.topK - Number of results to return (default: 5)
 * @param {number} options.threshold - Minimum similarity score (default: 0.3)
 * @returns {Object} - Search results with filtering stats
 */
export function searchIndex(index, queryEmbedding, options = {}) {
  const { topK = 5, threshold = DEFAULT_THRESHOLD } = options;

  if (!index || !index.documents || index.documents.length === 0) {
    return { results: [], stats: { total: 0, filtered: 0, passed: 0 } };
  }

  // Calculate similarity for each document
  const allResults = index.documents.map(doc => ({
    content: doc.content,
    source: doc.source,
    score: cosineSimilarity(queryEmbedding, doc.embedding)
  }));

  // Sort by score descending
  allResults.sort((a, b) => b.score - a.score);

  // Take top K first
  const topResults = allResults.slice(0, topK);

  // Filter by threshold
  const filteredResults = topResults.filter(r => r.score >= threshold);

  // Stats for debugging/logging
  const stats = {
    total: allResults.length,
    topK: topResults.length,
    filtered: topResults.length - filteredResults.length,
    passed: filteredResults.length,
    threshold,
    maxScore: topResults.length > 0 ? topResults[0].score : 0,
    minPassedScore: filteredResults.length > 0 ? filteredResults[filteredResults.length - 1].score : null
  };

  return { results: filteredResults, stats };
}

/**
 * Searches the index using a text query with relevance filtering
 * @param {Object} index - The document index
 * @param {string} query - Text query
 * @param {Function} embedFn - Function to generate embedding for query
 * @param {Object} options - Search options
 * @param {number} options.topK - Number of results to return (default: 5)
 * @param {number} options.threshold - Minimum similarity score (default: 0.3)
 * @returns {Promise<{results: Array, stats: Object}>}
 */
export async function searchByText(index, query, embedFn, options = {}) {
  const queryEmbedding = await embedFn(query);
  return searchIndex(index, queryEmbedding, options);
}

export { DEFAULT_THRESHOLD };
