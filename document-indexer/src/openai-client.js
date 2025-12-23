/**
 * openai-client.js - OpenAI API client wrapper
 */

import OpenAI from 'openai';

// Default model
const DEFAULT_MODEL = 'gpt-4o-mini';

// Singleton client instance
let openaiClient = null;

/**
 * Gets or creates the OpenAI client
 * @returns {OpenAI} - OpenAI client instance
 */
function getClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    openaiClient = new OpenAI({ apiKey });
  }

  return openaiClient;
}

/**
 * Creates a chat completion
 * @param {Array<{role: string, content: string}>} messages - Chat messages
 * @param {Object} options - Options
 * @param {string} options.model - Model to use (default: gpt-4o-mini)
 * @param {number} options.temperature - Temperature (default: 0.7)
 * @param {number} options.maxTokens - Max tokens (default: 1000)
 * @returns {Promise<string>} - Assistant response
 */
export async function createChatCompletion(messages, options = {}) {
  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxTokens = 1000
  } = options;

  const client = getClient();

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * Creates a streaming chat completion
 * @param {Array<{role: string, content: string}>} messages - Chat messages
 * @param {Object} options - Options
 * @param {Function} onChunk - Callback for each chunk
 * @returns {Promise<string>} - Full response
 */
export async function createStreamingCompletion(messages, options = {}, onChunk) {
  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxTokens = 1000
  } = options;

  const client = getClient();

  const stream = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true
  });

  let fullResponse = '';

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      fullResponse += content;
      if (onChunk) {
        onChunk(content);
      }
    }
  }

  return fullResponse;
}

export { DEFAULT_MODEL };
