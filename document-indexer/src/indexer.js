/**
 * indexer.js - Module for creating and managing the document index
 */

import fs from 'fs/promises';
import path from 'path';
import { getModelName, getEmbeddingDimension } from './embedder.js';

/**
 * Creates an index object from chunked documents and their embeddings
 * @param {Array<{content: string, source: {filename: string, chunkIndex: number}}>} chunks - Chunked documents with metadata
 * @param {number[][]} embeddings - Array of embedding vectors
 * @param {Object} options - Index options
 * @param {number} options.chunkSize - Chunk size used
 * @param {number} options.overlap - Overlap used
 * @returns {Object} - Index object
 */
export function createIndex(chunks, embeddings, options = {}) {
  const { chunkSize = 500, overlap = 50 } = options;

  // Validate input
  if (chunks.length !== embeddings.length) {
    throw new Error(
      `Mismatch between chunks (${chunks.length}) and embeddings (${embeddings.length})`
    );
  }

  // Filter out chunks with failed embeddings
  const validDocuments = [];
  let skippedCount = 0;

  for (let i = 0; i < chunks.length; i++) {
    if (embeddings[i] !== null) {
      validDocuments.push({
        id: validDocuments.length,
        content: chunks[i].content,
        embedding: embeddings[i],
        source: chunks[i].source
      });
    } else {
      skippedCount++;
    }
  }

  if (skippedCount > 0) {
    console.warn(`Skipped ${skippedCount} chunk(s) with failed embeddings`);
  }

  // Create index structure
  const index = {
    metadata: {
      created: new Date().toISOString(),
      model: getModelName(),
      embeddingDimension: getEmbeddingDimension(),
      totalChunks: validDocuments.length,
      chunkSize,
      overlap
    },
    documents: validDocuments
  };

  return index;
}

/**
 * Saves index to a JSON file
 * @param {Object} index - Index object to save
 * @param {string} outputPath - Path to output file
 * @returns {Promise<void>}
 */
export async function saveIndex(index, outputPath) {
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);

  try {
    await fs.access(outputDir);
  } catch {
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }

  // Convert to JSON with pretty print
  const jsonContent = JSON.stringify(index, null, 2);

  // Write file
  await fs.writeFile(outputPath, jsonContent, 'utf-8');

  // Calculate file size
  const stats = await fs.stat(outputPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`Index saved to: ${outputPath}`);
  console.log(`File size: ${fileSizeMB} MB`);
}

/**
 * Loads index from a JSON file
 * @param {string} indexPath - Path to index file
 * @returns {Promise<Object>} - Loaded index object
 */
export async function loadIndex(indexPath) {
  try {
    await fs.access(indexPath);
  } catch {
    throw new Error(`Index file not found: ${indexPath}`);
  }

  const content = await fs.readFile(indexPath, 'utf-8');
  const index = JSON.parse(content);

  // Validate index structure
  if (!index.metadata || !index.documents) {
    throw new Error('Invalid index format: missing metadata or documents');
  }

  console.log(`Loaded index from: ${indexPath}`);
  console.log(`  Model: ${index.metadata.model}`);
  console.log(`  Total chunks: ${index.metadata.totalChunks}`);
  console.log(`  Created: ${index.metadata.created}`);

  return index;
}

/**
 * Gets index statistics
 * @param {Object} index - Index object
 * @returns {Object} - Statistics object
 */
export function getIndexStats(index) {
  const sources = new Set();
  let totalContentLength = 0;

  for (const doc of index.documents) {
    sources.add(doc.source.filename);
    totalContentLength += doc.content.length;
  }

  return {
    totalDocuments: sources.size,
    totalChunks: index.documents.length,
    uniqueFiles: Array.from(sources),
    totalContentLength,
    avgChunkLength: Math.round(totalContentLength / index.documents.length),
    model: index.metadata.model,
    embeddingDimension: index.metadata.embeddingDimension,
    created: index.metadata.created
  };
}
