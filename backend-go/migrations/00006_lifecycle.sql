-- +goose Up
-- OTP brute-force guard and resend throttle.
ALTER TABLE users
  ADD COLUMN otp_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN otp_sent_at  TIMESTAMPTZ;

-- Biogas pickups get a lifecycle and the partner who collected them.
ALTER TABLE biogas_donations
  ADD COLUMN status       TEXT NOT NULL DEFAULT 'scheduled'
                          CHECK (status IN ('scheduled', 'collected', 'cancelled')),
  ADD COLUMN collector_id BIGINT REFERENCES users (id) ON DELETE SET NULL,
  ADD COLUMN updated_at   TIMESTAMPTZ NOT NULL DEFAULT now();

-- Dashboards filter donations by these.
CREATE INDEX donations_donor_idx        ON donations (donor_id);
CREATE INDEX donations_organization_idx ON donations (organization_id);
CREATE INDEX donations_volunteer_idx    ON donations (volunteer_id);
CREATE INDEX donations_status_idx       ON donations (status);
CREATE INDEX biogas_donations_donor_idx ON biogas_donations (donor_id);

-- +goose Down
DROP INDEX biogas_donations_donor_idx;
DROP INDEX donations_status_idx;
DROP INDEX donations_volunteer_idx;
DROP INDEX donations_organization_idx;
DROP INDEX donations_donor_idx;
ALTER TABLE biogas_donations DROP COLUMN updated_at, DROP COLUMN collector_id, DROP COLUMN status;
ALTER TABLE users DROP COLUMN otp_sent_at, DROP COLUMN otp_attempts;
