-- Add mitigations table for storing participant suggestions
CREATE TABLE IF NOT EXISTS public.mitigations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vote_id UUID REFERENCES public.votes(id) ON DELETE CASCADE,
    original_text TEXT NOT NULL,
    processed_text TEXT,
    word_count INTEGER,
    moderated BOOLEAN DEFAULT FALSE,
    moderation_reason VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_mitigations_vote_id ON public.mitigations(vote_id);

-- Enable Row Level Security
ALTER TABLE public.mitigations ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Allow all operations on mitigations" ON public.mitigations FOR ALL USING (true);

-- Add mitigations to realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.mitigations;