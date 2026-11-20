-- +goose Up
-- Password reset reuses otp_code / otp_expires_at / otp_attempts / otp_sent_at (a verified user has no signup code pending).
-- Tokens issued before password_changed_at are rejected, so a reset or change signs out every device.
ALTER TABLE users
  ADD COLUMN password_changed_at  TIMESTAMPTZ,
  ADD COLUMN suspended_at         TIMESTAMPTZ,
  ADD COLUMN email_notifications  BOOLEAN NOT NULL DEFAULT true;

-- +goose Down
ALTER TABLE users DROP COLUMN email_notifications, DROP COLUMN suspended_at, DROP COLUMN password_changed_at;
