/**
 * embedder.js - Module for generating embeddings using Transformers.js
 * Uses local model 'Xenova/all-MiniLM-L6-v2'
 */

import { pipeline } from '@xenova/transformers';

// Model configuration
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

// Singleton for the embedding pipeline
let embeddingPipeline = null;

/**
 * Initializes the embedding pipeline (singleton)
 * @returns {Promise<Pipeline>} - Initialized pipeline
 */
async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    console.log(`Loading embedding model: ${MODEL_NAME}`);
    console.log('This may take a moment on first run (downloading model)...');

    const startTime = Date.now();
    embeddingPipeline = await pipeline('feature-extraction', MODEL_NAME);
    const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`Model loaded in ${loadTime}s`);
  }
  return embeddingPipeline;
}

/**
 * Generates embeddings for an array of text chunks
 * @param {string[]} chunks - Array of text chunks
 * @returns {Promise<number[][]>} - Array of embedding vectors
 */
export async function generateEmbeddings(chunks) {
  if (!chunks || chunks.length === 0) {
    return [];
  }

  const pipe = await getEmbeddingPipeline();
  const embeddings = [];

  console.log(`\nGenerating embeddings for ${chunks.length} chunk(s)...`);
  const startTime = Date.now();

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Show progress
    process.stdout.write(`\rProcessing chunk ${i + 1} of ${chunks.length}...`);

    try {
      // Generate embedding
      const output = await pipe(chunk, {
        pooling: 'mean',
        normalize: true
      });

      // Convert to regular array
      const embedding = Array.from(output.data);
      embeddings.push(embedding);
    } catch (error) {
      console.error(`\nError processing chunk ${i + 1}: ${error.message}`);
      // Push null for failed embeddings
      embeddings.push(null);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nEmbeddings generated in ${totalTime}s`);
  console.log(`Average: ${(totalTime / chunks.length).toFixed(3)}s per chunk`);

  return embeddings;
}

/**
 * Generates embedding for a single text
 * @param {string} text - Input text
 * @returns {Promise<number[]>} - Embedding vector
 */
export async function generateEmbedding(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid input text');
  }

  const pipe = await getEmbeddingPipeline();

  const output = await pipe(text, {
    pooling: 'mean',
    normalize: true
  });

  return Array.from(output.data);
}

/**
 * Returns the model name being used
 * @returns {string} - Model name
 */
export function getModelName() {
  return MODEL_NAME;
}

/**
 * Returns the embedding dimension for the current model
 * @returns {number} - Embedding dimension (384 for MiniLM-L6-v2)
 */
export function getEmbeddingDimension() {
  return 384;
}

export { getEmbeddingPipeline };
