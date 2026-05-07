CREATE TABLE IF NOT EXISTS driver_points (
  driver_id TEXT PRIMARY KEY,
  points    INTEGER NOT NULL DEFAULT 0
);

-- Sample data aligned with login service users (driver_id = JWT sub claim)
INSERT INTO driver_points (driver_id, points) VALUES
  ('usr_driver', 210)
ON CONFLICT (driver_id) DO NOTHING;
