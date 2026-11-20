-- +goose Up
-- ponytail: photos live in Postgres like logos; move to object storage (S3/R2) if the table grows past a few GB.
CREATE TABLE donation_photos (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  donation_id  BIGINT NOT NULL REFERENCES donations (id) ON DELETE CASCADE,
  data         BYTEA NOT NULL,
  content_type TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX donation_photos_donation_idx ON donation_photos (donation_id);

-- Optional result of the in-browser freshness check, saved with the donation.
ALTER TABLE donations
  ADD COLUMN freshness            TEXT,     -- class label from the model, e.g. "Fresh"
  ADD COLUMN freshness_confidence REAL;     -- 0..1

-- +goose Down
ALTER TABLE donations DROP COLUMN freshness_confidence, DROP COLUMN freshness;
DROP TABLE donation_photos;
