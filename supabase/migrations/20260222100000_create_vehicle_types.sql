-- Create vehicle_types table
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

-- Add RLS policies
ALTER TABLE vehicle_types ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active vehicle types
CREATE POLICY "Anyone can view active vehicle types"
  ON vehicle_types FOR SELECT
  USING (is_active = true);

-- Allow admin to view all vehicle types
CREATE POLICY "Admin can view all vehicle types"
  ON vehicle_types FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Allow admin to insert vehicle types
CREATE POLICY "Admin can insert vehicle types"
  ON vehicle_types FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Allow admin to update vehicle types
CREATE POLICY "Admin can update vehicle types"
  ON vehicle_types FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Allow admin to delete vehicle types
CREATE POLICY "Admin can delete vehicle types"
  ON vehicle_types FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Insert default vehicle types with initial data
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

CREATE TRIGGER vehicle_types_updated_at
  BEFORE UPDATE ON vehicle_types
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_types_updated_at();

-- Create storage bucket for vehicle images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('public', 'public', true)
ON CONFLICT (id) DO NOTHING;

-- Add storage policy for vehicle images (allow authenticated users to upload)
CREATE POLICY "Authenticated users can upload vehicle images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'public' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'vehicle-images'
  );

-- Allow public read access to vehicle images
CREATE POLICY "Anyone can view vehicle images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'public' 
    AND (storage.foldername(name))[1] = 'vehicle-images'
  );

-- Allow admin to delete vehicle images
CREATE POLICY "Admin can delete vehicle images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'public'
    AND auth.jwt() ->> 'user_role' = 'admin'
    AND (storage.foldername(name))[1] = 'vehicle-images'
  );

-- Enable realtime for vehicle_types table
ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_types;
