-- +goose Up
CREATE TABLE biogas_donations (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  donor_id       BIGINT REFERENCES users (id) ON DELETE SET NULL,
  food_type      TEXT NOT NULL,
  quantity       TEXT NOT NULL,
  address        TEXT NOT NULL,
  pickup_date    DATE NOT NULL,
  contact_number TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE biogas_donations;
