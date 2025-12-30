/*
  # Image Processing Application Schema

  1. New Tables
    - `user_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `auto_enhance` (boolean) - Toggle for automatic enhancement
      - `expand_before_crop` (boolean) - Toggle for image expansion
      - `expansion_percentage` (integer) - Percentage to expand images
      - `theme` (text) - UI theme preference
      - `show_grid` (boolean) - Show grid overlay in editor
      - `show_tips` (boolean) - Show helpful tips
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `processing_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, nullable for guest users)
      - `original_filename` (text)
      - `processed_count` (integer) - Number of images in batch
      - `operations` (jsonb) - Store operations performed
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Allow guest users to create processing history without user_id
*/

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  auto_enhance boolean DEFAULT true,
  expand_before_crop boolean DEFAULT true,
  expansion_percentage integer DEFAULT 20,
  theme text DEFAULT 'light',
  show_grid boolean DEFAULT true,
  show_tips boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create processing_history table
CREATE TABLE IF NOT EXISTS processing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  original_filename text NOT NULL,
  processed_count integer DEFAULT 1,
  operations jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_history ENABLE ROW LEVEL SECURITY;

-- Policies for user_settings
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for processing_history
CREATE POLICY "Users can view own history"
  ON processing_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history"
  ON processing_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Guest users can create history"
  ON processing_history FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_history_user_id ON processing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_history_created_at ON processing_history(created_at DESC);