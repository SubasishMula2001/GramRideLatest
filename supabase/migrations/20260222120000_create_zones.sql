-- Create zones table for area management
CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  boundary_points JSONB NOT NULL, -- Array of {lat, lng} points defining the zone polygon
  is_active BOOLEAN DEFAULT true,
  service_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create zone pricing table for zone-specific pricing rules
CREATE TABLE IF NOT EXISTS zone_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
  vehicle_type_id UUID REFERENCES vehicle_types(id) ON DELETE CASCADE NOT NULL,
  base_fare_multiplier DECIMAL(3, 2) DEFAULT 1.00, -- Multiplier for base fare (e.g., 1.5 = 150%)
  per_km_multiplier DECIMAL(3, 2) DEFAULT 1.00, -- Multiplier for per km rate
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(zone_id, vehicle_type_id)
);

-- Create zone surge pricing table
CREATE TABLE IF NOT EXISTS zone_surge_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
  surge_multiplier DECIMAL(3, 2) NOT NULL DEFAULT 1.50, -- Surge multiplier (e.g., 1.5 = 150%)
  start_time TIME NOT NULL, -- Start time (24h format)
  end_time TIME NOT NULL, -- End time (24h format)
  days_of_week INTEGER[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}', -- 0=Sunday, 6=Saturday
  is_active BOOLEAN DEFAULT true,
  reason TEXT, -- e.g., "Morning Rush", "Evening Peak"
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_zones_active ON zones(is_active);
CREATE INDEX IF NOT EXISTS idx_zone_pricing_zone ON zone_pricing(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_pricing_vehicle ON zone_pricing(vehicle_type_id);
CREATE INDEX IF NOT EXISTS idx_zone_surge_zone ON zone_surge_pricing(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_surge_active ON zone_surge_pricing(is_active);

-- Enable RLS on zones
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_surge_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for zones
-- Anyone can view active zones
CREATE POLICY "Anyone can view active zones"
  ON zones FOR SELECT
  USING (is_active = true);

-- Admin can view all zones
CREATE POLICY "Admin can view all zones"
  ON zones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Admin can manage zones
CREATE POLICY "Admin can insert zones"
  ON zones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update zones"
  ON zones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete zones"
  ON zones FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for zone_pricing
CREATE POLICY "Anyone can view active zone pricing"
  ON zone_pricing FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage zone pricing"
  ON zone_pricing FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for zone_surge_pricing
CREATE POLICY "Anyone can view active zone surge pricing"
  ON zone_surge_pricing FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage zone surge pricing"
  ON zone_surge_pricing FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_zones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER zones_updated_at
  BEFORE UPDATE ON zones
  FOR EACH ROW
  EXECUTE FUNCTION update_zones_updated_at();

CREATE TRIGGER zone_pricing_updated_at
  BEFORE UPDATE ON zone_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_zones_updated_at();

CREATE TRIGGER zone_surge_pricing_updated_at
  BEFORE UPDATE ON zone_surge_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_zones_updated_at();

-- Enable realtime for zones tables
ALTER PUBLICATION supabase_realtime ADD TABLE zones;
ALTER PUBLICATION supabase_realtime ADD TABLE zone_pricing;
ALTER PUBLICATION supabase_realtime ADD TABLE zone_surge_pricing;

-- Set night charges to OFF by default in app_settings
INSERT INTO app_settings (key, value, description) 
VALUES 
  ('night_charges_enabled', 'false', 'Enable or disable night time charges')
ON CONFLICT (key) DO UPDATE SET value = 'false';

-- Insert sample zones for demonstration
INSERT INTO zones (name, description, boundary_points, is_active, service_enabled) VALUES
  (
    'City Center',
    'Main city center area with high demand',
    '[{"lat": 22.5726, "lng": 88.3639}, {"lat": 22.5826, "lng": 88.3639}, {"lat": 22.5826, "lng": 88.3739}, {"lat": 22.5726, "lng": 88.3739}]'::jsonb,
    true,
    true
  ),
  (
    'Village North',
    'Northern villages - lower demand area',
    '[{"lat": 22.6000, "lng": 88.3500}, {"lat": 22.6100, "lng": 88.3500}, {"lat": 22.6100, "lng": 88.3600}, {"lat": 22.6000, "lng": 88.3600}]'::jsonb,
    true,
    true
  ),
  (
    'Market Area',
    'Local market zone with moderate demand',
    '[{"lat": 22.5500, "lng": 88.3400}, {"lat": 22.5600, "lng": 88.3400}, {"lat": 22.5600, "lng": 88.3500}, {"lat": 22.5500, "lng": 88.3500}]'::jsonb,
    true,
    true
  )
ON CONFLICT DO NOTHING;
