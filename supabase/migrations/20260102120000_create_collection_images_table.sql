-- Create collection_images table
CREATE TABLE IF NOT EXISTS collection_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  image_id text NOT NULL,
  image_file jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE collection_images ENABLE ROW LEVEL SECURITY;

-- Policies for collection_images
CREATE POLICY "Users can view own collection"
  ON collection_images FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own collection"
  ON collection_images FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own collection"
  ON collection_images FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_collection_images_user_id ON collection_images(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_collection_images_user_id_image_id ON collection_images(user_id, image_id);
