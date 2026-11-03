-- +goose Up
CREATE TABLE users (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name      TEXT NOT NULL,
  email          TEXT UNIQUE,
  phone          TEXT UNIQUE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'pending'
                 CHECK (role IN ('pending', 'donor', 'volunteer', 'organization', 'biogas', 'admin')),
  is_verified    BOOLEAN NOT NULL DEFAULT false,
  otp_code       TEXT,
  otp_expires_at TIMESTAMPTZ,
  points         INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- +goose Down
DROP TABLE users;
