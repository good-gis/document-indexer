/**
 * chunker.js - Module for splitting text into chunks
 * Uses word-boundary splitting to avoid cutting words
 */

/**
 * Splits text into chunks of fixed size with overlap
 * @param {string} text - Input text to split
 * @param {number} chunkSize - Maximum chunk size in characters (default: 500)
 * @param {number} overlap - Overlap between chunks in characters (default: 50)
 * @returns {string[]} - Array of text chunks
 */
export function chunkText(text, chunkSize = 500, overlap = 50) {
  // Validate input
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Normalize whitespace
  const normalizedText = text.replace(/\s+/g, ' ').trim();

  if (normalizedText.length === 0) {
    return [];
  }

  // If text is smaller than chunk size, return as single chunk
  if (normalizedText.length <= chunkSize) {
    return [normalizedText];
  }

  // Validate parameters
  if (overlap >= chunkSize) {
    throw new Error('Overlap must be smaller than chunk size');
  }

  const chunks = [];
  let startIndex = 0;

  while (startIndex < normalizedText.length) {
    // Calculate end index for this chunk
    let endIndex = startIndex + chunkSize;

    // If we're not at the end of the text
    if (endIndex < normalizedText.length) {
      // Try to find a word boundary (space) near the end
      endIndex = findWordBoundary(normalizedText, endIndex);
    } else {
      endIndex = normalizedText.length;
    }

    // Extract chunk
    const chunk = normalizedText.slice(startIndex, endIndex).trim();

    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    // Move start position considering overlap
    // Find word boundary for the new start position
    const newStart = endIndex - overlap;
    startIndex = newStart > startIndex ? findWordBoundary(normalizedText, newStart, 'forward') : endIndex;

    // Prevent infinite loop
    if (startIndex >= normalizedText.length) {
      break;
    }
  }

  return chunks;
}

/**
 * Finds the nearest word boundary (space)
 * @param {string} text - Text to search in
 * @param {number} position - Starting position
 * @param {string} direction - Search direction: 'backward' (default) or 'forward'
 * @returns {number} - Position of word boundary
 */
function findWordBoundary(text, position, direction = 'backward') {
  if (position >= text.length) {
    return text.length;
  }

  if (direction === 'backward') {
    // Search backwards for space
    let pos = position;
    while (pos > 0 && text[pos] !== ' ') {
      pos--;
    }
    // If no space found, use original position
    return pos > 0 ? pos : position;
  } else {
    // Search forwards for space
    let pos = position;
    while (pos < text.length && text[pos] !== ' ') {
      pos++;
    }
    return pos < text.length ? pos + 1 : text.length;
  }
}

/**
 * Creates chunks from a document with metadata
 * @param {string} text - Document text
 * @param {string} filename - Source filename
 * @param {number} chunkSize - Chunk size
 * @param {number} overlap - Overlap size
 * @returns {Array<{content: string, source: {filename: string, chunkIndex: number}}>}
 */
export function chunkDocument(text, filename, chunkSize = 500, overlap = 50) {
  const chunks = chunkText(text, chunkSize, overlap);

  return chunks.map((content, index) => ({
    content,
    source: {
      filename,
      chunkIndex: index
    }
  }));
}

export { findWordBoundary };
