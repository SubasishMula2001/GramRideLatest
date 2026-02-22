-- Create driver_vehicles junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS driver_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE NOT NULL,
  vehicle_type_id UUID REFERENCES vehicle_types(id) ON DELETE CASCADE NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(driver_id, vehicle_type_id)
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_driver_vehicles_driver ON driver_vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_vehicles_vehicle_type ON driver_vehicles(vehicle_type_id);

-- Enable RLS
ALTER TABLE driver_vehicles ENABLE ROW LEVEL SECURITY;

-- Allow drivers to view their own vehicles
CREATE POLICY "Drivers can view their own vehicles"
  ON driver_vehicles FOR SELECT
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

-- Allow anyone to view driver vehicles (for matching)
CREATE POLICY "Anyone can view driver vehicles for matching"
  ON driver_vehicles FOR SELECT
  USING (true);

-- Allow admin to manage driver vehicles
CREATE POLICY "Admin can manage driver vehicles"
  ON driver_vehicles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Allow drivers to insert their own vehicles during registration
CREATE POLICY "Drivers can add their own vehicles"
  ON driver_vehicles FOR INSERT
  WITH CHECK (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

-- Migrate existing vehicle_type data to driver_vehicles
-- This will populate the junction table with existing single vehicle assignments
INSERT INTO driver_vehicles (driver_id, vehicle_type_id, is_primary)
SELECT 
  d.id as driver_id,
  vt.id as vehicle_type_id,
  true as is_primary
FROM drivers d
INNER JOIN vehicle_types vt ON d.vehicle_type = vt.name
WHERE NOT EXISTS (
  SELECT 1 FROM driver_vehicles dv 
  WHERE dv.driver_id = d.id AND dv.vehicle_type_id = vt.id
)
ON CONFLICT (driver_id, vehicle_type_id) DO NOTHING;

-- Create view for easy driver vehicle lookup
CREATE OR REPLACE VIEW driver_vehicle_details AS
SELECT 
  dv.id,
  dv.driver_id,
  d.user_id,
  d.vehicle_number,
  d.license_number,
  d.is_available,
  d.is_verified,
  d.rating,
  dv.vehicle_type_id,
  vt.name as vehicle_type_name,
  vt.display_name as vehicle_display_name,
  vt.image_url as vehicle_image_url,
  vt.base_fare,
  vt.per_km_rate,
  dv.is_primary,
  dv.created_at
FROM driver_vehicles dv
INNER JOIN drivers d ON dv.driver_id = d.id
INNER JOIN vehicle_types vt ON dv.vehicle_type_id = vt.id
WHERE vt.is_active = true;

-- Grant access to the view
GRANT SELECT ON driver_vehicle_details TO authenticated, anon;

-- Enable realtime for driver_vehicles
ALTER PUBLICATION supabase_realtime ADD TABLE driver_vehicles;
