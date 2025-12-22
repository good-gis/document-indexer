/**
 * loader.js - Module for loading documents from a directory
 * Supports: .txt, .md, .pdf formats
 */

import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';

// Supported file extensions
const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.pdf'];

/**
 * Loads all documents from the specified directory
 * @param {string} dirPath - Path to the directory with documents
 * @returns {Promise<Array<{filename: string, content: string}>>} - Array of document objects
 */
export async function loadDocuments(dirPath) {
  // Check if directory exists
  try {
    await fs.access(dirPath);
  } catch {
    throw new Error(`Directory not found: ${dirPath}`);
  }

  // Get list of files
  const files = await fs.readdir(dirPath);

  // Filter only supported formats
  const supportedFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext);
  });

  if (supportedFiles.length === 0) {
    console.warn(`No supported documents found in ${dirPath}`);
    console.warn(`Supported formats: ${SUPPORTED_EXTENSIONS.join(', ')}`);
    return [];
  }

  console.log(`Found ${supportedFiles.length} document(s) to process`);

  const documents = [];

  for (const filename of supportedFiles) {
    const filePath = path.join(dirPath, filename);

    try {
      const content = await loadFile(filePath);

      if (content && content.trim().length > 0) {
        documents.push({
          filename,
          content: content.trim()
        });
        console.log(`  Loaded: ${filename} (${content.length} characters)`);
      } else {
        console.warn(`  Skipped: ${filename} (empty file)`);
      }
    } catch (error) {
      console.error(`  Error loading ${filename}: ${error.message}`);
    }
  }

  return documents;
}

/**
 * Loads content from a single file
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - File content as text
 */
async function loadFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.txt':
    case '.md':
      return loadTextFile(filePath);
    case '.pdf':
      return loadPdfFile(filePath);
    default:
      throw new Error(`Unsupported file format: ${ext}`);
  }
}

/**
 * Loads text file (.txt, .md)
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - File content
 */
async function loadTextFile(filePath) {
  return fs.readFile(filePath, 'utf-8');
}

/**
 * Loads PDF file and extracts text
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<string>} - Extracted text from PDF
 */
async function loadPdfFile(filePath) {
  const dataBuffer = await fs.readFile(filePath);
  const pdfData = await pdf(dataBuffer);
  return pdfData.text;
}

export { SUPPORTED_EXTENSIONS };
