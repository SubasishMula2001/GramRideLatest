-- ========================================
-- GramRide Database Setup SQL
-- Run this in Supabase SQL Editor to set up all tables
-- ========================================

-- 1. CREATE VEHICLE TYPES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS vehicle_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  base_fare DECIMAL(10, 2) DEFAULT 0,
  per_km_rate DECIMAL(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE vehicle_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vehicle_types
DROP POLICY IF EXISTS "Anyone can view active vehicle types" ON vehicle_types;
CREATE POLICY "Anyone can view active vehicle types"
  ON vehicle_types FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admin can manage vehicle types" ON vehicle_types;
CREATE POLICY "Admin can manage vehicle types"
  ON vehicle_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Insert default vehicle types
INSERT INTO vehicle_types (name, display_name, description, base_fare, per_km_rate, sort_order, is_active) VALUES
  ('toto', 'Toto (Electric Rickshaw)', 'Eco-friendly electric rickshaw for short distances', 20, 8, 1, true),
  ('auto', 'Auto Rickshaw', 'Traditional auto rickshaw for city travel', 25, 10, 2, true),
  ('van', 'Van', 'Spacious van for group travel or cargo', 50, 15, 3, true),
  ('bike', 'Motorcycle', 'Quick and affordable motorcycle ride', 15, 6, 4, true)
ON CONFLICT (name) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_vehicle_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vehicle_types_updated_at ON vehicle_types;
CREATE TRIGGER vehicle_types_updated_at
  BEFORE UPDATE ON vehicle_types
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_types_updated_at();


-- 2. CREATE DRIVER VEHICLES TABLE (Multi-Vehicle Support)
-- ========================================

CREATE TABLE IF NOT EXISTS driver_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE NOT NULL,
  vehicle_type_id UUID REFERENCES vehicle_types(id) ON DELETE CASCADE NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(driver_id, vehicle_type_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_driver_vehicles_driver ON driver_vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_vehicles_vehicle_type ON driver_vehicles(vehicle_type_id);

-- Enable RLS
ALTER TABLE driver_vehicles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view driver vehicles" ON driver_vehicles;
CREATE POLICY "Anyone can view driver vehicles"
  ON driver_vehicles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Drivers can manage their vehicles" ON driver_vehicles;
CREATE POLICY "Drivers can manage their vehicles"
  ON driver_vehicles FOR ALL
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin can manage driver vehicles" ON driver_vehicles;
CREATE POLICY "Admin can manage driver vehicles"
  ON driver_vehicles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Migrate existing vehicle_type data to driver_vehicles
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


-- 3. CREATE ZONES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  boundary_points JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  service_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view active zones" ON zones;
CREATE POLICY "Anyone can view active zones"
  ON zones FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admin can manage zones" ON zones;
CREATE POLICY "Admin can manage zones"
  ON zones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_zones_active ON zones(is_active);


-- 4. CREATE ZONE PRICING TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS zone_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
  vehicle_type_id UUID REFERENCES vehicle_types(id) ON DELETE CASCADE NOT NULL,
  base_fare_multiplier DECIMAL(3, 2) DEFAULT 1.00,
  per_km_multiplier DECIMAL(3, 2) DEFAULT 1.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(zone_id, vehicle_type_id)
);

-- Enable RLS
ALTER TABLE zone_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view zone pricing" ON zone_pricing;
CREATE POLICY "Anyone can view zone pricing"
  ON zone_pricing FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admin can manage zone pricing" ON zone_pricing;
CREATE POLICY "Admin can manage zone pricing"
  ON zone_pricing FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_zone_pricing_zone ON zone_pricing(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_pricing_vehicle ON zone_pricing(vehicle_type_id);


-- 5. CREATE ZONE SURGE PRICING TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS zone_surge_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
  surge_multiplier DECIMAL(3, 2) NOT NULL DEFAULT 1.50,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week INTEGER[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  is_active BOOLEAN DEFAULT true,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE zone_surge_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view surge pricing" ON zone_surge_pricing;
CREATE POLICY "Anyone can view surge pricing"
  ON zone_surge_pricing FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admin can manage surge pricing" ON zone_surge_pricing;
CREATE POLICY "Admin can manage surge pricing"
  ON zone_surge_pricing FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_zone_surge_zone ON zone_surge_pricing(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_surge_active ON zone_surge_pricing(is_active);


-- 6. ENABLE REALTIME (Optional - if you want real-time updates)
-- ========================================

ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_types;
ALTER PUBLICATION supabase_realtime ADD TABLE driver_vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE zones;
ALTER PUBLICATION supabase_realtime ADD TABLE zone_pricing;
ALTER PUBLICATION supabase_realtime ADD TABLE zone_surge_pricing;


-- ========================================
-- DONE! Your database is now set up.
-- ========================================
