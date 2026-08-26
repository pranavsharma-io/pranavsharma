-- Run this once to set up the table:
-- npx wrangler d1 execute portfolio-contacts --file=./schema.sql
-- (add --remote to run it against the live/production D1 database)

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip TEXT
);
