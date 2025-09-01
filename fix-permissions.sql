-- Add session_scenarios to realtime publication first
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_scenarios;

-- Update RLS policies to be more permissive for the game
DROP POLICY IF EXISTS "Allow all operations on participants" ON public.participants;
DROP POLICY IF EXISTS "Allow all operations on sessions" ON public.sessions;
DROP POLICY IF EXISTS "Allow all operations on session_scenarios" ON public.session_scenarios;
DROP POLICY IF EXISTS "Allow all operations on votes" ON public.votes;
DROP POLICY IF EXISTS "Allow all operations on rationales" ON public.rationales;

-- More permissive policies for game functionality
CREATE POLICY "Game read access for sessions" ON public.sessions FOR ALL USING (true);
CREATE POLICY "Game read access for participants" ON public.participants FOR ALL USING (true);
CREATE POLICY "Game read access for session_scenarios" ON public.session_scenarios FOR ALL USING (true);
CREATE POLICY "Game read access for votes" ON public.votes FOR ALL USING (true);
CREATE POLICY "Game read access for rationales" ON public.rationales FOR ALL USING (true);

COMMIT;