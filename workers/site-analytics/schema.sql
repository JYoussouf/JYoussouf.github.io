CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  app TEXT NOT NULL,
  country TEXT,
  region TEXT,
  city TEXT,
  device TEXT,
  referrer TEXT,
  started_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  duration_s INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sessions_app_time ON sessions(app, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_time ON sessions(started_at DESC);
