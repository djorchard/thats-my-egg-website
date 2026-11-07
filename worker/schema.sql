CREATE TABLE IF NOT EXISTS playtesters (
  roblox_user_id INTEGER PRIMARY KEY,
  username TEXT NOT NULL,
  signed_up_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting'
);

-- Retain the original table unchanged as an immutable migration source.
-- New signup identity is the case-insensitive submitted username. It is not
-- an authenticated Roblox identity and does not require an external lookup.
CREATE TABLE IF NOT EXISTS playtester_signups (
  signup_id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  roblox_user_id INTEGER UNIQUE,
  signed_up_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  notification_state TEXT NOT NULL DEFAULT 'pending'
    CHECK(notification_state IN ('pending','sending','sent','failed','uncertain')),
  notification_attempted_at TEXT,
  notification_sent_at TEXT,
  notification_message_id TEXT,
  notification_error_code TEXT
);

INSERT INTO playtester_signups (username, roblox_user_id, signed_up_at, status)
SELECT username, roblox_user_id, signed_up_at, status FROM playtesters WHERE 1
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS playtester_notification_queue
ON playtester_signups (notification_state, signup_id);
