/**
 * agent.js - RAG agent logic
 */

import { searchByText } from './searcher.js';
import { generateEmbedding } from './embedder.js';
import { createStreamingCompletion } from './openai-client.js';

// System prompt for RAG mode
const RAG_SYSTEM_PROMPT = `You are a helpful assistant that answers questions based on the provided context.
Use the context below to answer the user's question. If the context doesn't contain relevant information, say so.
Always cite the source file when using information from the context.`;

// System prompt for non-RAG mode
const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant. Answer the user's questions to the best of your ability.`;

/**
 * Formats context from search results
 * @param {Array<{content: string, source: Object, score: number}>} results
 * @returns {string}
 */
function formatContext(results) {
  if (results.length === 0) {
    return 'No relevant context found.';
  }

  return results
    .map((r, i) => {
      const source = `[${r.source.filename}, chunk ${r.source.chunkIndex}]`;
      return `--- Context ${i + 1} ${source} (relevance: ${(r.score * 100).toFixed(1)}%) ---\n${r.content}`;
    })
    .join('\n\n');
}

/**
 * Answers a question using RAG
 * @param {string} question - User question
 * @param {Object} index - Document index
 * @param {Object} options - Options
 * @param {number} options.topK - Number of context chunks (default: 3)
 * @param {Function} options.onChunk - Streaming callback
 * @returns {Promise<{answer: string, context: Array}>}
 */
export async function answerWithRAG(question, index, options = {}) {
  const { topK = 3, onChunk } = options;

  // Search for relevant context
  const searchResults = await searchByText(index, question, generateEmbedding, topK);

  // Format context for the prompt
  const context = formatContext(searchResults);

  // Build messages
  const messages = [
    { role: 'system', content: RAG_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Context:\n${context}\n\n---\n\nQuestion: ${question}`
    }
  ];

  // Generate response
  const answer = await createStreamingCompletion(messages, {}, onChunk);

  return {
    answer,
    context: searchResults
  };
}

/**
 * Answers a question without RAG
 * @param {string} question - User question
 * @param {Object} options - Options
 * @param {Function} options.onChunk - Streaming callback
 * @returns {Promise<string>}
 */
export async function answerWithoutRAG(question, options = {}) {
  const { onChunk } = options;

  const messages = [
    { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
    { role: 'user', content: question }
  ];

  return createStreamingCompletion(messages, {}, onChunk);
}

export { RAG_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT };
