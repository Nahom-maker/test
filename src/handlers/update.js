import { handleMessage } from './message.js';
import { handleCallbackQuery } from './callback.js';

export async function processUpdate(update) {
  if (update.message) {
    await handleMessage(update.message);
  } else if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
  } else {
    // Unsupported update type
    console.log('[Update] Ignored update type');
  }
}
