/*
  # Fix Row Level Security Policies for Events Table

  1. Changes
    - Update RLS policies to allow anonymous access
    - Add policy for public read access to events
    - Add policy for public write access to events
  
  2. Security
    - This is a temporary solution to allow the app to work without authentication
    - In a production environment, proper authentication should be implemented
*/

-- Update policies to allow anonymous access
DROP POLICY IF EXISTS "Users can read their own events" ON events;
DROP POLICY IF EXISTS "Users can insert their own events" ON events;
DROP POLICY IF EXISTS "Users can update their own events" ON events;
DROP POLICY IF EXISTS "Users can delete their own events" ON events;

-- Create new policies that allow public access
CREATE POLICY "Allow public read access"
  ON events
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access"
  ON events
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access"
  ON events
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow public delete access"
  ON events
  FOR DELETE
  TO public
  USING (true);