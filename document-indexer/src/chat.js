/**
 * chat.js - Interactive CLI chat interface
 */

import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadIndex } from './indexer.js';
import { answerWithRAG, answerWithoutRAG } from './agent.js';
import { DEFAULT_THRESHOLD } from './searcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default index path
const INDEX_PATH = path.join(__dirname, '..', 'output', 'index.json');

// Chat state
let ragMode = false;
let index = null;
let threshold = DEFAULT_THRESHOLD;
let conversationHistory = [];

/**
 * Prints help message
 */
function printHelp() {
  const thresholdDisplay = threshold > 0 ? `${(threshold * 100).toFixed(0)}%` : 'off';
  console.log(`
Commands:
  /rag          - Enable RAG mode (use document context)
  /norag        - Disable RAG mode (direct answers)
  /threshold N  - Set relevance threshold (0-100, 0=off)
  /clear        - Clear conversation history
  /status       - Show current mode and settings
  /help         - Show this help
  /quit         - Exit chat

Current: ${ragMode ? 'RAG' : 'Direct'}, threshold: ${thresholdDisplay}, history: ${conversationHistory.length} messages
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
    const parts = trimmed.toLowerCase().split(/\s+/);
    const command = parts[0];

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

      case '/threshold': {
        const value = parts[1];
        if (value === undefined) {
          const display = threshold > 0 ? `${(threshold * 100).toFixed(0)}%` : 'off';
          console.log(`\nCurrent threshold: ${display}`);
          console.log('Usage: /threshold N (0-100, 0=off)\n');
          return;
        }
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0 || num > 100) {
          console.log('\nInvalid threshold. Use a number between 0 and 100.\n');
          return;
        }
        threshold = num / 100;
        if (threshold === 0) {
          console.log('\nThreshold disabled. All results will be used.\n');
        } else {
          console.log(`\nThreshold set to ${num}%. Results below this will be filtered.\n`);
        }
        return;
      }

      case '/clear':
        conversationHistory = [];
        console.log('\nConversation history cleared.\n');
        return;

      case '/status': {
        const thresholdDisplay = threshold > 0 ? `${(threshold * 100).toFixed(0)}%` : 'off';
        console.log(`\nMode: ${ragMode ? 'RAG (with context)' : 'No RAG (direct)'}`);
        console.log(`Threshold: ${thresholdDisplay}`);
        console.log(`History: ${conversationHistory.length} messages`);
        if (index) {
          console.log(`Index: ${index.metadata.totalChunks} chunks from ${index.metadata.model}`);
        } else {
          console.log('Index: Not loaded');
        }
        console.log();
        return;
      }

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
      const { answer, context, stats } = await answerWithRAG(trimmed, index, {
        threshold,
        history: conversationHistory,
        onChunk: (chunk) => process.stdout.write(chunk)
      });

      // Save to conversation history
      conversationHistory.push({ role: 'user', content: trimmed });
      conversationHistory.push({ role: 'assistant', content: answer });

      console.log('\n');

      // Show filtering stats
      if (stats.filtered > 0) {
        console.log(`[Filtered: ${stats.filtered} chunk(s) below ${(stats.threshold * 100).toFixed(0)}% threshold]`);
      }

      // Show sources
      if (context.length > 0) {
        console.log('Sources:');
        context.forEach((c, i) => {
          console.log(`  ${i + 1}. ${c.source.filename} (chunk ${c.source.chunkIndex}) - ${(c.score * 100).toFixed(1)}% relevance`);
        });
        console.log();
      } else {
        console.log('[No relevant context found - answering based on general knowledge]\n');
      }
    } else {
      const answer = await answerWithoutRAG(trimmed, {
        history: conversationHistory,
        onChunk: (chunk) => process.stdout.write(chunk)
      });

      // Save to conversation history
      conversationHistory.push({ role: 'user', content: trimmed });
      conversationHistory.push({ role: 'assistant', content: answer });

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
