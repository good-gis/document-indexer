/**
 * chat.js - Interactive CLI chat interface
 */

import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadIndex } from './indexer.js';
import { answerWithRAG, answerWithoutRAG } from './agent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default index path
const INDEX_PATH = path.join(__dirname, '..', 'output', 'index.json');

// Chat state
let ragMode = false;
let index = null;

/**
 * Prints help message
 */
function printHelp() {
  console.log(`
Commands:
  /rag     - Enable RAG mode (use document context)
  /norag   - Disable RAG mode (direct answers)
  /status  - Show current mode
  /help    - Show this help
  /quit    - Exit chat

Current mode: ${ragMode ? 'RAG (with context)' : 'No RAG (direct)'}
`);
}

/**
 * Handles user input
 * @param {string} input - User input
 * @param {readline.Interface} rl - Readline interface
 */
async function handleInput(input, rl) {
  const trimmed = input.trim();

  if (!trimmed) {
    return;
  }

  // Handle commands
  if (trimmed.startsWith('/')) {
    const command = trimmed.toLowerCase();

    switch (command) {
      case '/rag':
        if (!index) {
          console.log('\nNo index loaded. Cannot enable RAG mode.');
          console.log('Run "npm start" first to create the index.\n');
        } else {
          ragMode = true;
          console.log('\nRAG mode enabled. Answers will use document context.\n');
        }
        return;

      case '/norag':
        ragMode = false;
        console.log('\nRAG mode disabled. Direct answers without context.\n');
        return;

      case '/status':
        console.log(`\nMode: ${ragMode ? 'RAG (with context)' : 'No RAG (direct)'}`);
        if (index) {
          console.log(`Index: ${index.metadata.totalChunks} chunks from ${index.metadata.model}`);
        } else {
          console.log('Index: Not loaded');
        }
        console.log();
        return;

      case '/help':
        printHelp();
        return;

      case '/quit':
      case '/exit':
      case '/q':
        console.log('\nGoodbye!\n');
        rl.close();
        process.exit(0);

      default:
        console.log(`\nUnknown command: ${command}`);
        console.log('Type /help for available commands.\n');
        return;
    }
  }

  // Process question
  console.log();
  process.stdout.write('Assistant: ');

  try {
    if (ragMode && index) {
      const { answer, context } = await answerWithRAG(trimmed, index, {
        onChunk: (chunk) => process.stdout.write(chunk)
      });

      console.log('\n');

      // Show sources
      if (context.length > 0) {
        console.log('Sources:');
        context.forEach((c, i) => {
          console.log(`  ${i + 1}. ${c.source.filename} (chunk ${c.source.chunkIndex}) - ${(c.score * 100).toFixed(1)}% relevance`);
        });
        console.log();
      }
    } else {
      await answerWithoutRAG(trimmed, {
        onChunk: (chunk) => process.stdout.write(chunk)
      });
      console.log('\n');
    }
  } catch (error) {
    console.log(`\n\nError: ${error.message}\n`);

    if (error.message.includes('OPENAI_API_KEY')) {
      console.log('Set the OPENAI_API_KEY environment variable:');
      console.log('  export OPENAI_API_KEY=sk-...\n');
    }
  }
}

/**
 * Main chat function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('RAG Chat Agent');
  console.log('='.repeat(60));
  console.log();

  // Try to load index
  try {
    index = await loadIndex(INDEX_PATH);
    console.log();
  } catch (error) {
    console.log(`Note: Index not found at ${INDEX_PATH}`);
    console.log('RAG mode will not be available.');
    console.log('Run "npm start" to create the index first.\n');
  }

  console.log('Type /help for commands, /quit to exit.');
  console.log(`Mode: ${ragMode ? 'RAG' : 'No RAG'} (use /rag or /norag to switch)\n`);

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Handle input
  const prompt = () => {
    const modeIndicator = ragMode ? '[RAG]' : '[Direct]';
    rl.question(`${modeIndicator} You: `, async (input) => {
      await handleInput(input, rl);
      prompt();
    });
  };

  prompt();

  // Handle close
  rl.on('close', () => {
    process.exit(0);
  });
}

main().catch(console.error);
