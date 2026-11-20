-- +goose Up
-- NGOs must be verified by an admin before they can claim donations.
ALTER TABLE organizations
  ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'pending'
                                 CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  ADD COLUMN registration_no     TEXT NOT NULL DEFAULT '', -- NGO Darpan ID / trust or society registration
  ADD COLUMN document            BYTEA,                    -- registration certificate (PDF/PNG/JPEG, <= 5 MB)
  ADD COLUMN document_type       TEXT,
  ADD COLUMN review_note         TEXT NOT NULL DEFAULT '', -- shown to the NGO when rejected
  ADD COLUMN reviewed_by         BIGINT REFERENCES users (id) ON DELETE SET NULL,
  ADD COLUMN reviewed_at         TIMESTAMPTZ;

CREATE INDEX organizations_verification_idx ON organizations (verification_status);

-- Problems anyone involved in a donation can raise; admins resolve them.
CREATE TABLE reports (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  donation_id BIGINT REFERENCES donations (id) ON DELETE CASCADE,
  reporter_id BIGINT REFERENCES users (id) ON DELETE SET NULL,
  reason      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolution  TEXT NOT NULL DEFAULT '',
  resolved_by BIGINT REFERENCES users (id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX reports_status_idx ON reports (status, created_at DESC);

-- +goose Down
DROP TABLE reports;
DROP INDEX organizations_verification_idx;
ALTER TABLE organizations
  DROP COLUMN reviewed_at, DROP COLUMN reviewed_by, DROP COLUMN review_note, DROP COLUMN document_type,
  DROP COLUMN document, DROP COLUMN registration_no, DROP COLUMN verification_status;
