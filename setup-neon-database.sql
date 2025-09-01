-- Nonprofit Trolley Game - Complete Database Setup
-- Run this entire script in Neon SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS mitigations CASCADE;
DROP TABLE IF EXISTS rationales CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS session_scenarios CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS scenarios CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;

-- Create sessions table
CREATE TABLE sessions (
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
CREATE TABLE participants (
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
CREATE TABLE scenarios (
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

-- Create session_scenarios junction table
CREATE TABLE session_scenarios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'complete')),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    order_index INTEGER
);

-- Create votes table
CREATE TABLE votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    vote VARCHAR(20) NOT NULL CHECK (vote IN ('pull', 'dont_pull')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    latency_ms INTEGER
);

-- Create rationales table
CREATE TABLE rationales (
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
CREATE TABLE mitigations (
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
CREATE INDEX idx_sessions_room_code ON sessions(room_code);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_participants_session_id ON participants(session_id);
CREATE INDEX idx_participants_fingerprint ON participants(fingerprint);
CREATE INDEX idx_votes_session_id ON votes(session_id);
CREATE INDEX idx_votes_scenario_id ON votes(scenario_id);
CREATE INDEX idx_rationales_vote_id ON rationales(vote_id);
CREATE INDEX idx_mitigations_vote_id ON mitigations(vote_id);

-- Create views for easier querying
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
    s.id,
    s.room_code,
    s.created_at,
    s.config,
    COUNT(DISTINCT p.id) FILTER (WHERE p.is_active = true) as active_participants,
    ss.scenario_id as current_scenario_id,
    sc.title as current_scenario_title
FROM sessions s
LEFT JOIN participants p ON p.session_id = s.id
LEFT JOIN session_scenarios ss ON ss.session_id = s.id AND ss.status = 'active'
LEFT JOIN scenarios sc ON sc.id = ss.scenario_id
WHERE s.status IN ('waiting', 'active')
GROUP BY s.id, s.room_code, s.created_at, s.config, ss.scenario_id, sc.title;

CREATE OR REPLACE VIEW vote_summary AS
SELECT 
    v.session_id,
    v.scenario_id,
    COUNT(*) as total_votes,
    COUNT(*) FILTER (WHERE v.vote = 'pull') as pull_votes,
    COUNT(*) FILTER (WHERE v.vote = 'dont_pull') as dont_pull_votes,
    AVG(v.latency_ms) as avg_latency_ms
FROM votes v
GROUP BY v.session_id, v.scenario_id;

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
 ARRAY['Human review of AI suggestions', 'Feedback loop for improvements', 'Trial period for matches']),

('Donor Engagement Predictions',
 'Your fundraising team wants to identify which donors are most likely to increase their giving this year.',
 'Use AI to analyze giving history and engagement patterns to predict donor behavior',
 'Continue with traditional donor segmentation based on giving levels',
 ARRAY['Past behavior predicts future giving', 'Data patterns are meaningful'],
 ARRAY['Privacy vs Personalization', 'Efficiency vs Relationship Building'],
 'May create self-fulfilling prophecies or miss potential major donors',
 '{"benefit_estimate": "30% increase in conversion", "accuracy": "65-70%"}',
 'intermediate',
 ARRAY['Is it ethical to score donors?', 'How transparent should we be about AI use?'],
 ARRAY['Regular human review', 'Transparent communication', 'Opt-out options']),

('Mental Health Crisis Response',
 'Your crisis hotline receives 200+ calls daily and needs to prioritize responses.',
 'Use AI to analyze call transcripts and prioritize based on detected crisis severity',
 'Continue with first-come-first-served approach with all calls',
 ARRAY['AI can detect crisis language patterns', 'Technology will function reliably'],
 ARRAY['Efficiency vs Equity', 'Speed vs Accuracy', 'Technology vs Human Judgment'],
 'AI might misinterpret cultural expressions or miss subtle crisis indicators',
 '{"response_time": "50% faster for high-risk", "false_negative_rate": "Unknown"}',
 'advanced',
 ARRAY['What if the AI misses a serious case?', 'How do we ensure equity?'],
 ARRAY['Human override always available', 'Regular audit of AI decisions', 'Continuous training updates']);

-- Verify setup
SELECT 'Setup complete!' as message,
       (SELECT COUNT(*) FROM scenarios) as scenarios_count,
       (SELECT COUNT(*) FROM sessions) as sessions_count;