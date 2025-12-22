# Document Indexer

A Node.js system for indexing documents with local embeddings using Transformers.js.

## Features

- Local embedding generation using `Xenova/all-MiniLM-L6-v2` model
- Support for multiple document formats: `.txt`, `.md`, `.pdf`
- Configurable text chunking with overlap
- JSON-based index storage

## Installation

```bash
cd document-indexer
npm install
```

The embedding model will be downloaded automatically on first run.

## Usage

### 1. Add Documents

Place your documents in the `documents/` folder:

```
documents/
├── document1.txt
├── notes.md
└── report.pdf
```

Supported formats:
- `.txt` - Plain text files
- `.md` - Markdown files
- `.pdf` - PDF documents

### 2. Run Indexing

```bash
npm start
```

Or directly:

```bash
node src/index.js
```

### 3. Output

The index will be saved to `output/index.json`.

## Index Structure

```json
{
  "metadata": {
    "created": "2024-01-15T10:30:00.000Z",
    "model": "Xenova/all-MiniLM-L6-v2",
    "embeddingDimension": 384,
    "totalChunks": 42,
    "chunkSize": 500,
    "overlap": 50
  },
  "documents": [
    {
      "id": 0,
      "content": "Text content of the chunk...",
      "embedding": [0.123, -0.456, ...],
      "source": {
        "filename": "document1.txt",
        "chunkIndex": 0
      }
    }
  ]
}
```

## Configuration

Edit the `CONFIG` object in `src/index.js`:

```javascript
const CONFIG = {
  documentsDir: path.join(__dirname, '..', 'documents'),
  outputPath: path.join(__dirname, '..', 'output', 'index.json'),
  chunkSize: 500,    // Characters per chunk
  overlap: 50        // Overlap between chunks
};
```

## Project Structure

```
document-indexer/
├── src/
│   ├── loader.js      # Document loading (txt, md, pdf)
│   ├── chunker.js     # Text chunking with overlap
│   ├── embedder.js    # Embedding generation
│   ├── indexer.js     # Index creation and storage
│   └── index.js       # Main pipeline
├── documents/         # Source documents
├── output/            # Generated index
│   └── index.json
├── package.json
└── README.md
```

## Module API

### loader.js

```javascript
import { loadDocuments } from './loader.js';

const docs = await loadDocuments('./documents');
// Returns: [{ filename: 'doc.txt', content: '...' }, ...]
```

### chunker.js

```javascript
import { chunkText, chunkDocument } from './chunker.js';

const chunks = chunkText(text, 500, 50);
// Returns: ['chunk1...', 'chunk2...', ...]

const chunksWithMeta = chunkDocument(text, 'doc.txt', 500, 50);
// Returns: [{ content: '...', source: { filename, chunkIndex } }, ...]
```

### embedder.js

```javascript
import { generateEmbeddings, generateEmbedding } from './embedder.js';

const embeddings = await generateEmbeddings(['text1', 'text2']);
// Returns: [[0.1, 0.2, ...], [0.3, 0.4, ...]]

const embedding = await generateEmbedding('single text');
// Returns: [0.1, 0.2, ...]
```

### indexer.js

```javascript
import { createIndex, saveIndex, loadIndex } from './indexer.js';

const index = createIndex(chunks, embeddings, { chunkSize: 500, overlap: 50 });
await saveIndex(index, './output/index.json');
const loaded = await loadIndex('./output/index.json');
```

## Requirements

- Node.js 18+
- ~500MB disk space for the embedding model (downloaded on first run)

## Dependencies

- `@xenova/transformers` - Local transformer models
- `pdf-parse` - PDF text extraction

## License

MIT
