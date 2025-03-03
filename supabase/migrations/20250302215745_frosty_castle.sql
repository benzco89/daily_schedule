/*
  # Create events table for news desk event management system

  1. New Tables
    - `events`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `title` (text, required)
      - `details` (text, nullable)
      - `notes` (text, nullable)
      - `event_type` (enum: 'continuous', 'full_day', 'time_specific')
      - `start_date` (date, required)
      - `end_date` (date, nullable)
      - `start_time` (time, nullable)
      - `end_time` (time, nullable)
      - `color` (text, required)
      - `status` (enum: 'active', 'archived', default 'active')
      - `user_id` (uuid, nullable, references auth.users)
  
  2. Security
    - Enable RLS on `events` table
    - Add policy for authenticated users to read their own data
    - Add policy for authenticated users to insert their own data
    - Add policy for authenticated users to update their own data
    - Add policy for authenticated users to delete their own data
*/

-- Create event_type enum
CREATE TYPE event_type AS ENUM ('continuous', 'full_day', 'time_specific');

-- Create event_status enum
CREATE TYPE event_status AS ENUM ('active', 'archived');

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  title text NOT NULL,
  details text,
  notes text,
  event_type event_type NOT NULL,
  start_date date NOT NULL,
  end_date date,
  start_time time,
  end_time time,
  color text NOT NULL,
  status event_status NOT NULL DEFAULT 'active',
  user_id uuid REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their own events"
  ON events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own events"
  ON events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Create index for faster queries
CREATE INDEX events_start_date_idx ON events (start_date);
CREATE INDEX events_status_idx ON events (status);
CREATE INDEX events_user_id_idx ON events (user_id);