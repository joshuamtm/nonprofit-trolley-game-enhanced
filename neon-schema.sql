-- Nonprofit Trolley Game Database Schema for Neon
-- This creates all necessary tables for the game

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_code VARCHAR(6) UNIQUE NOT NULL,
    facilitator_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    config JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'complete', 'cancelled')),
    metadata JSONB DEFAULT '{}'
);

-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    fingerprint VARCHAR(255) NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    user_agent TEXT,
    ip_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'
);

-- Create scenarios table
CREATE TABLE IF NOT EXISTS scenarios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    context TEXT NOT NULL,
    ai_option TEXT NOT NULL,
    non_ai_option TEXT NOT NULL,
    assumptions TEXT[] DEFAULT '{}',
    ethical_axes TEXT[] DEFAULT '{}',
    risk_notes TEXT,
    metrics JSONB DEFAULT '{}',
    content_warnings TEXT[] DEFAULT '{}',
    difficulty_level VARCHAR(20) DEFAULT 'intermediate' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    discussion_prompts TEXT[] DEFAULT '{}',
    mitigations TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    vote VARCHAR(20) NOT NULL CHECK (vote IN ('pull', 'dont_pull')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    latency_ms INTEGER
);

-- Create rationales table
CREATE TABLE IF NOT EXISTS rationales (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vote_id UUID REFERENCES votes(id) ON DELETE CASCADE,
    original_text TEXT NOT NULL,
    processed_text TEXT,
    word_count INTEGER,
    moderated BOOLEAN DEFAULT FALSE,
    moderation_reason VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mitigations table
CREATE TABLE IF NOT EXISTS mitigations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vote_id UUID REFERENCES votes(id) ON DELETE CASCADE,
    original_text TEXT NOT NULL,
    processed_text TEXT,
    word_count INTEGER,
    moderated BOOLEAN DEFAULT FALSE,
    moderation_reason VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_room_code ON sessions(room_code);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_participants_session_id ON participants(session_id);
CREATE INDEX IF NOT EXISTS idx_participants_fingerprint ON participants(fingerprint);
CREATE INDEX IF NOT EXISTS idx_votes_session_id ON votes(session_id);
CREATE INDEX IF NOT EXISTS idx_votes_scenario_id ON votes(scenario_id);

-- Insert sample scenarios
INSERT INTO scenarios (title, context, ai_option, non_ai_option, assumptions, ethical_axes, risk_notes, metrics, difficulty_level, discussion_prompts, mitigations)
VALUES 
('AI-Powered Volunteer Matching', 
 'Your nonprofit needs to match 500 volunteers with opportunities across 50 partner organizations. Each volunteer has different skills, availability, and interests.',
 'Use AI to analyze skills, availability, and preferences to automatically match volunteers',
 'Continue manual matching by staff reviewing each application individually',
 ARRAY['AI can identify patterns in successful matches', 'Volunteer data is accurate and complete'],
 ARRAY['Efficiency vs Personal Touch', 'Scale vs Individual Attention'],
 'AI might miss nuanced personal factors that make great matches',
 '{"benefit_estimate": "75% time reduction", "error_rate": "5-10%", "cost_comparison": "$500/month vs 2 FTE staff"}',
 'beginner',
 ARRAY['How do we balance efficiency with personal connection?', 'What happens when the AI makes a poor match?'],
 ARRAY['Human review of AI suggestions', 'Feedback loop for improvements', 'Trial period for matches']);