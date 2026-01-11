/**
 * agent.js - RAG agent logic
 */

import { searchByText, DEFAULT_THRESHOLD } from './searcher.js';
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
 * Answers a question using RAG with relevance filtering
 * @param {string} question - User question
 * @param {Object} index - Document index
 * @param {Object} options - Options
 * @param {number} options.topK - Number of context chunks to retrieve (default: 5)
 * @param {number} options.threshold - Minimum similarity threshold (default: 0.3)
 * @param {Array} options.history - Conversation history
 * @param {Function} options.onChunk - Streaming callback
 * @returns {Promise<{answer: string, context: Array, stats: Object}>}
 */
export async function answerWithRAG(question, index, options = {}) {
  const { topK = 5, threshold = DEFAULT_THRESHOLD, history = [], onChunk } = options;

  // Search for relevant context with filtering
  const { results: searchResults, stats } = await searchByText(
    index,
    question,
    generateEmbedding,
    { topK, threshold }
  );

  // Format context for the prompt
  const context = formatContext(searchResults);

  // Build messages with history
  const messages = [
    { role: 'system', content: RAG_SYSTEM_PROMPT },
    ...history,
    {
      role: 'user',
      content: `Context:\n${context}\n\n---\n\nQuestion: ${question}`
    }
  ];

  // Generate response
  const answer = await createStreamingCompletion(messages, {}, onChunk);

  return {
    answer,
    context: searchResults,
    stats
  };
}

/**
 * Answers a question without RAG
 * @param {string} question - User question
 * @param {Object} options - Options
 * @param {Array} options.history - Conversation history
 * @param {Function} options.onChunk - Streaming callback
 * @returns {Promise<string>}
 */
export async function answerWithoutRAG(question, options = {}) {
  const { history = [], onChunk } = options;

  const messages = [
    { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: question }
  ];

  return createStreamingCompletion(messages, {}, onChunk);
}

export { RAG_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT };
