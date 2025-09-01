-- Fix RLS policies to allow proper participant access
-- This addresses the 406 Not Acceptable errors

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow all operations on participants" ON public.participants;
DROP POLICY IF EXISTS "Allow all operations on sessions" ON public.sessions;
DROP POLICY IF EXISTS "Allow all operations on session_scenarios" ON public.session_scenarios;
DROP POLICY IF EXISTS "Allow all operations on votes" ON public.votes;
DROP POLICY IF EXISTS "Allow all operations on rationales" ON public.rationales;

-- Create more permissive policies for the game functionality
-- Sessions: Allow read and write for game operations
CREATE POLICY "Enable read access for sessions" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Enable insert access for sessions" ON public.sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for sessions" ON public.sessions FOR UPDATE USING (true);

-- Participants: Allow read and write for game operations  
CREATE POLICY "Enable read access for participants" ON public.participants FOR SELECT USING (true);
CREATE POLICY "Enable insert access for participants" ON public.participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for participants" ON public.participants FOR UPDATE USING (true);

-- Session scenarios: Allow read and write for game operations
CREATE POLICY "Enable read access for session_scenarios" ON public.session_scenarios FOR SELECT USING (true);
CREATE POLICY "Enable insert access for session_scenarios" ON public.session_scenarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for session_scenarios" ON public.session_scenarios FOR UPDATE USING (true);

-- Votes: Allow read and write for game operations
CREATE POLICY "Enable read access for votes" ON public.votes FOR SELECT USING (true);
CREATE POLICY "Enable insert access for votes" ON public.votes FOR INSERT WITH CHECK (true);

-- Rationales: Allow read and write for game operations  
CREATE POLICY "Enable read access for rationales" ON public.rationales FOR SELECT USING (true);
CREATE POLICY "Enable insert access for rationales" ON public.rationales FOR INSERT WITH CHECK (true);

-- Ensure scenarios remain publicly readable
-- (This policy should already exist, but let's make sure)
CREATE POLICY "Enable public read access to active scenarios" ON public.scenarios 
    FOR SELECT USING (is_active = true);

COMMIT;