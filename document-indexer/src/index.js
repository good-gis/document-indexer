/**
 * index.js - Main pipeline for document indexing
 *
 * Pipeline:
 * 1. Load documents from ./documents/
 * 2. Split each document into chunks
 * 3. Generate embeddings for all chunks
 * 4. Create and save index to ./output/index.json
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { loadDocuments } from './loader.js';
import { chunkDocument } from './chunker.js';
import { generateEmbeddings, getModelName } from './embedder.js';
import { createIndex, saveIndex, getIndexStats } from './indexer.js';

// Get current directory (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  documentsDir: path.join(__dirname, '..', 'documents'),
  outputPath: path.join(__dirname, '..', 'output', 'index.json'),
  chunkSize: 500,
  overlap: 50
};

/**
 * Main indexing pipeline
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Document Indexing Pipeline');
  console.log('='.repeat(60));
  console.log();

  const pipelineStartTime = Date.now();

  try {
    // Step 1: Load documents
    console.log('Step 1: Loading documents...');
    console.log(`  Source directory: ${CONFIG.documentsDir}`);
    console.log();

    const documents = await loadDocuments(CONFIG.documentsDir);

    if (documents.length === 0) {
      console.log('\nNo documents to process. Exiting.');
      console.log('Add .txt, .md, or .pdf files to the documents/ folder.');
      return;
    }

    console.log(`\nLoaded ${documents.length} document(s)`);
    console.log();

    // Step 2: Chunk documents
    console.log('Step 2: Splitting documents into chunks...');
    console.log(`  Chunk size: ${CONFIG.chunkSize} characters`);
    console.log(`  Overlap: ${CONFIG.overlap} characters`);
    console.log();

    const allChunks = [];

    for (const doc of documents) {
      const chunks = chunkDocument(
        doc.content,
        doc.filename,
        CONFIG.chunkSize,
        CONFIG.overlap
      );
      allChunks.push(...chunks);
      console.log(`  ${doc.filename}: ${chunks.length} chunk(s)`);
    }

    console.log(`\nTotal chunks created: ${allChunks.length}`);
    console.log();

    // Step 3: Generate embeddings
    console.log('Step 3: Generating embeddings...');
    console.log(`  Model: ${getModelName()}`);

    const chunkTexts = allChunks.map(chunk => chunk.content);
    const embeddings = await generateEmbeddings(chunkTexts);

    console.log();

    // Step 4: Create and save index
    console.log('Step 4: Creating and saving index...');
    console.log(`  Output path: ${CONFIG.outputPath}`);
    console.log();

    const index = createIndex(allChunks, embeddings, {
      chunkSize: CONFIG.chunkSize,
      overlap: CONFIG.overlap
    });

    await saveIndex(index, CONFIG.outputPath);

    // Print final statistics
    const totalTime = ((Date.now() - pipelineStartTime) / 1000).toFixed(2);
    const stats = getIndexStats(index);

    console.log();
    console.log('='.repeat(60));
    console.log('Indexing Complete!');
    console.log('='.repeat(60));
    console.log();
    console.log('Statistics:');
    console.log(`  Documents processed: ${stats.totalDocuments}`);
    console.log(`  Chunks created: ${stats.totalChunks}`);
    console.log(`  Average chunk length: ${stats.avgChunkLength} characters`);
    console.log(`  Embedding dimension: ${stats.embeddingDimension}`);
    console.log(`  Total processing time: ${totalTime}s`);
    console.log();
    console.log('Source files:');
    stats.uniqueFiles.forEach(file => console.log(`  - ${file}`));
    console.log();
    console.log(`Index saved to: ${CONFIG.outputPath}`);

  } catch (error) {
    console.error('\nError during indexing:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run the pipeline
main();
