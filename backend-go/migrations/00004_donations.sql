-- +goose Up
CREATE TABLE donations (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tracking_id     TEXT NOT NULL UNIQUE,
  donor_id        BIGINT REFERENCES users (id) ON DELETE SET NULL,
  organization_id BIGINT REFERENCES organizations (id) ON DELETE SET NULL,
  volunteer_id    BIGINT REFERENCES volunteers (id) ON DELETE SET NULL,
  type            TEXT NOT NULL DEFAULT 'food',
  food_details    TEXT NOT NULL DEFAULT '',
  location        TEXT NOT NULL DEFAULT '',
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  contact         TEXT NOT NULL DEFAULT '',
  notes           TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available', 'requested', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
  status_label    TEXT NOT NULL DEFAULT 'Donation posted',
  points          INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX donations_created_at_idx ON donations (created_at DESC);

-- One row per status change: the tracking timeline.
CREATE TABLE donation_events (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  donation_id BIGINT NOT NULL REFERENCES donations (id) ON DELETE CASCADE,
  status      TEXT NOT NULL,
  label       TEXT NOT NULL DEFAULT '',
  note        TEXT NOT NULL DEFAULT '',
  actor_id    BIGINT REFERENCES users (id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX donation_events_donation_idx ON donation_events (donation_id, created_at);

-- +goose Down
DROP TABLE donation_events;
DROP TABLE donations;
