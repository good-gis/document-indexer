# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

- **Install dependencies**: `npm install`
- **Run indexing pipeline**: `npm start` or `node src/index.js`
- **Run chat agent**: `npm run chat` (requires `OPENAI_API_KEY` env variable)

No test framework is currently configured.

## Architecture

This is a document indexing system that generates embeddings for RAG (Retrieval-Augmented Generation) applications using Transformers.js with local model inference.

### Pipeline Flow

1. **loader.js** - Loads documents from `documents/` directory (supports `.txt`, `.md`, `.pdf`)
2. **chunker.js** - Splits text into overlapping chunks using word-boundary splitting
3. **embedder.js** - Generates embeddings using `Xenova/all-MiniLM-L6-v2` (384-dimensional vectors, singleton pipeline pattern)
4. **indexer.js** - Creates index structure and saves to `output/index.json`
5. **index.js** - Main entry point that orchestrates the pipeline

### Key Configuration

Configuration is in `src/index.js`:
- `chunkSize: 500` - characters per chunk
- `overlap: 50` - character overlap between chunks
- Input: `documents/`
- Output: `output/index.json`

### ES Modules

This project uses ES modules (`"type": "module"` in package.json). Use `import`/`export` syntax.

### Embedding Model

The embedding model (~500MB) is downloaded automatically on first run and cached locally.

### Chat Agent

The chat agent (`chat.js`) provides an interactive CLI for Q&A:
- **searcher.js** - Cosine similarity search over the index
- **openai-client.js** - OpenAI API wrapper (uses `gpt-4o-mini`)
- **agent.js** - RAG logic: retrieves context, builds prompts, streams responses

Chat commands: `/rag` (enable RAG), `/norag` (disable RAG), `/status`, `/quit`
