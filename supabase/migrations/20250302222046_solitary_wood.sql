/*
  # Fix RLS policies for events table

  1. Changes
    - Check if policies exist before creating them
    - Ensure public access to events table
  2. Security
    - Allow public access to read, insert, update, and delete events
*/

-- Check if policies exist and drop them only if they exist
DO $$
BEGIN
  -- Drop existing policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Users can read their own events') THEN
    DROP POLICY "Users can read their own events" ON events;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Users can insert their own events') THEN
    DROP POLICY "Users can insert their own events" ON events;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Users can update their own events') THEN
    DROP POLICY "Users can update their own events" ON events;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Users can delete their own events') THEN
    DROP POLICY "Users can delete their own events" ON events;
  END IF;
  
  -- Check if new policies already exist before creating them
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Allow public read access') THEN
    CREATE POLICY "Allow public read access"
      ON events
      FOR SELECT
      TO public
      USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Allow public insert access') THEN
    CREATE POLICY "Allow public insert access"
      ON events
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Allow public update access') THEN
    CREATE POLICY "Allow public update access"
      ON events
      FOR UPDATE
      TO public
      USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Allow public delete access') THEN
    CREATE POLICY "Allow public delete access"
      ON events
      FOR DELETE
      TO public
      USING (true);
  END IF;
END $$;