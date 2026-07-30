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

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  app TEXT NOT NULL,
  name TEXT NOT NULL,
  meta TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_time ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_name_time ON events(name, created_at DESC);
