PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS push_devices (
  id TEXT PRIMARY KEY,
  owner_hash TEXT NOT NULL,
  endpoint_hash TEXT NOT NULL UNIQUE,
  token_cipher TEXT,
  subscription_cipher TEXT NOT NULL,
  person_id TEXT NOT NULL,
  school_id TEXT NOT NULL,
  student_name TEXT NOT NULL DEFAULT '',
  generation TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  next_check_at INTEGER NOT NULL DEFAULT 0,
  last_check_at INTEGER,
  last_success_at INTEGER,
  last_push_at INTEGER,
  last_error TEXT,
  failure_count INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER NOT NULL DEFAULT 0,
  lease_owner TEXT NOT NULL DEFAULT '',
  test_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS push_devices_due ON push_devices(state, next_check_at);
CREATE TABLE IF NOT EXISTS push_seen (
  device_id TEXT NOT NULL REFERENCES push_devices(id) ON DELETE CASCADE,
  mark_id TEXT NOT NULL,
  value_hash TEXT NOT NULL,
  PRIMARY KEY(device_id, mark_id)
);
CREATE TABLE IF NOT EXISTS push_outbox (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES push_devices(id) ON DELETE CASCADE,
  generation TEXT NOT NULL,
  event_key TEXT NOT NULL,
  payload_cipher TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  next_attempt INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  UNIQUE(device_id, generation, event_key)
);
CREATE INDEX IF NOT EXISTS push_outbox_due ON push_outbox(device_id, next_attempt);
