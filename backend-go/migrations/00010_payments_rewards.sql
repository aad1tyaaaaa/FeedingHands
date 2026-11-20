-- +goose Up
-- Fundraising payments through Razorpay. Only the verified webhook marks a payment paid.
CREATE TABLE payments (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id             BIGINT REFERENCES users (id) ON DELETE SET NULL,
  amount_paise        BIGINT NOT NULL CHECK (amount_paise > 0),
  currency            TEXT NOT NULL DEFAULT 'INR',
  razorpay_order_id   TEXT NOT NULL UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  status              TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at             TIMESTAMPTZ
);

CREATE INDEX payments_user_idx ON payments (user_id, created_at DESC);

-- Reward codes are issued by the server once a donor's points reach a tier, and redeemed once.
-- Unlocking a tier does not spend points (points are also the leaderboard score).
CREATE TABLE rewards (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tier        INTEGER NOT NULL, -- the points threshold: 10, 50, 100
  code        TEXT NOT NULL UNIQUE,
  issued_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_at TIMESTAMPTZ,
  redeemed_by BIGINT REFERENCES users (id) ON DELETE SET NULL,
  UNIQUE (user_id, tier)
);

-- +goose Down
DROP TABLE rewards;
DROP TABLE payments;
