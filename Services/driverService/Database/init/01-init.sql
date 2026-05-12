CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS drivers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  phone       VARCHAR(50)  NOT NULL,
  available   BOOLEAN      NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO drivers (id, name, email, phone, available) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Anders Nielsen',  'anders.nielsen@ntg.dk',  '+45 20 11 22 33', true),
  (gen_random_uuid(),                      'Britta Sørensen', 'britta.sorensen@ntg.dk', '+45 20 44 55 66', false),
  (gen_random_uuid(),                      'Carsten Madsen',  'carsten.madsen@ntg.dk',  '+45 20 77 88 99', true)
ON CONFLICT (email) DO NOTHING;
