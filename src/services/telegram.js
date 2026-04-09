import { config } from '../config.js';

const API_BASE = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;

async function tgFetch(method, body) {
  try {
    const res = await fetch(`${API_BASE}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await res.json();
    if (!data.ok) {
      console.error(`[Telegram API Error] ${method}:`, data);
    }
    return data;
  } catch (error) {
    console.error(`[Telegram Net Error] ${method}:`, error);
    return null;
  }
}

export async function sendMessage(chatId, text, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };
  
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }
  
  return await tgFetch('sendMessage', payload);
}

export async function editMessageText(chatId, messageId, text, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    text: text,
    parse_mode: 'HTML'
  };
  
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }
  
  return await tgFetch('editMessageText', payload);
}

export async function sendChatAction(chatId, action = 'typing') {
  return await tgFetch('sendChatAction', {
    chat_id: chatId,
    action: action
  });
}

export async function answerCallbackQuery(callbackQueryId, text = '', showAlert = false) {
  return await tgFetch('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text: text,
    show_alert: showAlert
  });
}

export async function getFile(fileId) {
  const res = await tgFetch('getFile', { file_id: fileId });
  if (res && res.ok) {
    return `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${res.result.file_path}`;
  }
  return null;
}
