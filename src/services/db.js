import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

const supabase = createClient(config.SUPABASE.URL, config.SUPABASE.KEY);

export async function saveMessage(userId, role, content) {
  const { error } = await supabase
    .from('messages')
    .insert([{ user_id: userId, role, content }]);
  
  if (error) {
    console.error('[DB] Error saving message:', error);
  }
}

export async function getRecentMessages(userId, limit = 15) {
  const { data, error } = await supabase
    .from('messages')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[DB] Error fetching messages:', error);
    return [];
  }
  
  // Return in chronological order for the LLM
  return data.reverse();
}

export async function clearMemory(userId) {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('user_id', userId);
    
  if (error) {
    console.error('[DB] Error clearing memory:', error);
    return false;
  }
  return true;
}

export async function getUserMode(userId) {
  const { data, error } = await supabase
    .from('user_modes')
    .select('selected_mode')
    .eq('user_id', userId)
    .single();
    
  if (error && error.code !== 'PGRST116') { // PGRST116 is not found
    console.error('[DB] Error getting mode:', error);
  }
  
  return data?.selected_mode || 'FAST';
}

export async function setUserMode(userId, mode) {
  const { error } = await supabase
    .from('user_modes')
    .upsert([{ user_id: userId, selected_mode: mode, updated_at: new Date() }]);
    
  if (error) {
    console.error('[DB] Error setting mode:', error);
  }
}

export async function savePaginationState(messageId, userId, totalPages, chunks) {
  const { error } = await supabase
    .from('pagination_states')
    .upsert([{
      message_id: messageId,
      user_id: userId,
      current_page: 0,
      total_pages: totalPages,
      chunks: chunks
    }]);

  if (error) console.error('[DB] Error saving pagination state:', error);
}

export async function getPaginationState(messageId) {
  const { data, error } = await supabase
    .from('pagination_states')
    .select('*')
    .eq('message_id', messageId)
    .single();

  if (error && error.code !== 'PGRST116') console.error('[DB] Error fetching pagination:', error);
  return data;
}

export async function updatePaginationState(messageId, newPage) {
  const { error } = await supabase
    .from('pagination_states')
    .update({ current_page: newPage })
    .eq('message_id', messageId);

  if (error) console.error('[DB] Error updating pagination state:', error);
}
