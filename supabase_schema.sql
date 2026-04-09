-- Messages memory
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user history lookup
CREATE INDEX idx_messages_user_id ON messages(user_id);

-- User Modes
CREATE TABLE user_modes (
  user_id BIGINT PRIMARY KEY,
  selected_mode TEXT NOT NULL DEFAULT 'FAST',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pagination state for caching sliced pages
CREATE TABLE pagination_states (
  message_id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  current_page INTEGER NOT NULL DEFAULT 0,
  total_pages INTEGER NOT NULL,
  chunks JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index to periodically clean up old pagination states (e.g. older than 24h)
CREATE INDEX idx_pagination_created_at ON pagination_states(created_at);
