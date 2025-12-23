/**
 * searcher.js - Module for searching similar documents in the index
 */

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
 * Searches the index for most similar documents
 * @param {Object} index - The document index
 * @param {number[]} queryEmbedding - Query embedding vector
 * @param {number} topK - Number of results to return (default: 3)
 * @returns {Array<{content: string, source: Object, score: number}>} - Top matching documents
 */
export function searchIndex(index, queryEmbedding, topK = 3) {
  if (!index || !index.documents || index.documents.length === 0) {
    return [];
  }

  // Calculate similarity for each document
  const results = index.documents.map(doc => ({
    content: doc.content,
    source: doc.source,
    score: cosineSimilarity(queryEmbedding, doc.embedding)
  }));

  // Sort by score descending and take top K
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, topK);
}

/**
 * Searches the index using a text query
 * @param {Object} index - The document index
 * @param {string} query - Text query
 * @param {Function} embedFn - Function to generate embedding for query
 * @param {number} topK - Number of results to return
 * @returns {Promise<Array<{content: string, source: Object, score: number}>>}
 */
export async function searchByText(index, query, embedFn, topK = 3) {
  const queryEmbedding = await embedFn(query);
  return searchIndex(index, queryEmbedding, topK);
}
