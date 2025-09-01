-- Add session_scenarios table to realtime publication
-- This is needed for the scenario_started events to be broadcast
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_scenarios;
COMMIT;