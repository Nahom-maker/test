import { getRecentMessages, saveMessage, getUserMode, savePaginationState } from '../services/db.js';
import { sendMessage, sendChatAction, getFile } from '../services/telegram.js';
import { getLLMResponse } from '../services/llm.js';
import { extractTextFromPdf } from '../services/document.js';
import { cleanTextForTelegram } from '../utils/formatter.js';
import { chunkText } from '../utils/pagination.js';

export async function handleMessage(message) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  
  // Send typing indicator
  await sendChatAction(chatId, 'typing');

  let userInput = '';

  // 1. Check for text or document
  if (message.text) {
    userInput = message.text;
  } else if (message.document) {
    if (message.document.mime_type !== 'application/pdf') {
      await sendMessage(chatId, '❌ Please upload a valid PDF document.');
      return;
    }
    
    // PDF Handling
    const fileUrl = await getFile(message.document.file_id);
    if (!fileUrl) {
      await sendMessage(chatId, '❌ ERROR TYPE: PDF DOWNLOAD FAILED\n\nPlease try again later.');
      return;
    }
    
    // Extract PDF text
    await sendMessage(chatId, '📄 Reading PDF...');
    const pdfText = await extractTextFromPdf(fileUrl);
    
    if (!pdfText) {
      await sendMessage(chatId, '❌ ERROR TYPE: PDF PARSE FAILED\n\nCould not extract text from the document.');
      return;
    }
    
    // Only take the first chunk for LLM if it's super long, or append user caption
    const userCaption = message.caption ? `\n\nUser Question: ${message.caption}` : '\n\nPlease summarize this document.';
    userInput = `[PDF Content excerpt]:\n${pdfText.substring(0, 5000)}...${userCaption}`;
    
  } else {
    // Ignore unsupported message types silently
    return;
  }

  // 2. Load Memory & Mode
  // Fetch user mode (though we currently default to FAST)
  const mode = await getUserMode(userId);
  
  // Save the user's message
  await saveMessage(userId, 'user', userInput);

  // Fetch last 10 messages for context
  const history = await getRecentMessages(userId, 10);
  
  // Re-map to NVIDIA structure
  const messages = history.map(msg => ({ role: msg.role, content: msg.content }));

  // 3. Request LLM
  const res = await getLLMResponse(messages);
  
  if (!res.ok) {
    await sendMessage(chatId, res.text);
    return;
  }

  const rawBotReply = res.text;

  // 4. Clean Formatting 
  const formattedReply = cleanTextForTelegram(rawBotReply);

  // 5. Save Bot's message
  await saveMessage(userId, 'assistant', rawBotReply); // Saving raw bot reply instead of formatted allows LLM to read its original structure

  // 6. Pagination System
  const chunks = chunkText(formattedReply, 1000);
  const totalPages = chunks.length;
  
  // Send the first page
  const pageIndex = 0;
  const replyMarkup = buildKeyboard(pageIndex, totalPages);
  const sentMessage = await sendMessage(chatId, chunks[pageIndex], replyMarkup);
  
  // 7. Persist Pagination state
  if (sentMessage && sentMessage.ok) {
    const sentMessageId = sentMessage.result.message_id;
    await savePaginationState(sentMessageId, userId, totalPages, chunks);
  }
}

export function buildKeyboard(pageIndex, totalPages) {
  // Always include Fast and Clear, as well as Regenerate
  const topButtons = [
    { text: '⚡ Fast', callback_data: 'mode_fast' },
    { text: '🗑️ Clear Memory', callback_data: 'clear_memory' },
    { text: '🔄 Regenerate', callback_data: 'regenerate' }
  ];

  const inlineKeyboard = [topButtons];

  if (totalPages > 1) {
    const pagingButtons = [];
    if (pageIndex > 0) {
      pagingButtons.push({ text: '⬅️ Previous', callback_data: 'page_prev' });
    }
    if (pageIndex < totalPages - 1) {
      pagingButtons.push({ text: 'Next ➡️', callback_data: 'page_next' });
    }
    inlineKeyboard.push(pagingButtons);
  }

  return { inline_keyboard: inlineKeyboard };
}
