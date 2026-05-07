CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS notifications (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiver_customer_id VARCHAR(255),
  recipient_role       VARCHAR(100),
  shipment_id          VARCHAR(255) NOT NULL,
  type                 VARCHAR(100) NOT NULL,
  title                VARCHAR(255) NOT NULL,
  message              TEXT NOT NULL,
  channel              VARCHAR(50) NOT NULL DEFAULT 'in_app',
  read_at              TIMESTAMPTZ,
  sent_at              TIMESTAMPTZ,
  metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notifications_recipient_required
    CHECK (receiver_customer_id IS NOT NULL OR recipient_role IS NOT NULL)
);

DROP INDEX IF EXISTS notifications_shipment_type_unique;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_shipment_type_customer_unique
  ON notifications (shipment_id, type, receiver_customer_id)
  WHERE receiver_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_shipment_type_role_unique
  ON notifications (shipment_id, type, recipient_role)
  WHERE recipient_role IS NOT NULL;

CREATE INDEX IF NOT EXISTS notifications_receiver_customer_created_at_idx
  ON notifications (receiver_customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_recipient_role_created_at_idx
  ON notifications (recipient_role, created_at DESC);
