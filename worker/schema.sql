CREATE TABLE IF NOT EXISTS playtesters (
  roblox_user_id INTEGER PRIMARY KEY,
  username TEXT NOT NULL,
  signed_up_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting'
);
