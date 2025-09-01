-- Migration: 001_initial_schema
-- Description: Create initial database schema for Nonprofit Trolley Game
-- Date: 2024

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Sessions table: Core game sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code VARCHAR(6) UNIQUE NOT NULL,
    facilitator_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    config JSONB DEFAULT '{
        "timerDuration": 30,
        "maxParticipants": 200,
        "moderationEnabled": true,
        "contentWarnings": true
    }'::jsonb,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'complete', 'cancelled')),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for quick room code lookup
CREATE INDEX idx_sessions_room_code ON sessions(room_code) WHERE status != 'complete';
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);

-- Participants table: Anonymous session participants
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    fingerprint VARCHAR(255) NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    user_agent TEXT,
    ip_hash VARCHAR(64), -- Hashed IP for rate limiting
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(session_id, fingerprint) -- Prevent duplicate joins
);

-- Indexes for participant queries
CREATE INDEX idx_participants_session_id ON participants(session_id);
CREATE INDEX idx_participants_fingerprint ON participants(fingerprint);
CREATE INDEX idx_participants_active ON participants(session_id, is_active) WHERE is_active = true;

-- Scenarios table: Store game scenarios
CREATE TABLE scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) NOT NULL,
    context TEXT NOT NULL,
    ai_option TEXT NOT NULL,
    non_ai_option TEXT NOT NULL,
    assumptions JSONB NOT NULL,
    ethical_axes JSONB NOT NULL,
    risk_notes TEXT,
    metrics JSONB NOT NULL,
    content_warnings JSONB DEFAULT '[]'::jsonb,
    difficulty_level VARCHAR(20) DEFAULT 'intermediate',
    discussion_prompts JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active scenarios
CREATE INDEX idx_scenarios_active ON scenarios(is_active);
CREATE INDEX idx_scenarios_difficulty ON scenarios(difficulty_level);

-- Session scenarios: Track which scenarios are used in each session
CREATE TABLE session_scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    scenario_id UUID NOT NULL REFERENCES scenarios(id),
    order_position INTEGER NOT NULL,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'complete', 'skipped')),
    UNIQUE(session_id, order_position)
);

-- Indexes for session scenarios
CREATE INDEX idx_session_scenarios_session_id ON session_scenarios(session_id, order_position);
CREATE INDEX idx_session_scenarios_status ON session_scenarios(session_id, status);

-- Votes table: Store participant votes
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    scenario_id UUID NOT NULL REFERENCES scenarios(id),
    vote VARCHAR(10) NOT NULL CHECK (vote IN ('pull', 'dont_pull')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    latency_ms INTEGER,
    UNIQUE(session_id, participant_id, scenario_id) -- One vote per participant per scenario
);

-- Indexes for vote queries
CREATE INDEX idx_votes_session_scenario ON votes(session_id, scenario_id);
CREATE INDEX idx_votes_participant ON votes(participant_id);
CREATE INDEX idx_votes_created_at ON votes(created_at);

-- Rationales table: Store vote explanations
CREATE TABLE rationales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vote_id UUID NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
    original_text VARCHAR(80) NOT NULL,
    processed_text VARCHAR(80),
    word_count INTEGER,
    moderated BOOLEAN DEFAULT false,
    moderation_reason VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for rationale queries
CREATE INDEX idx_rationales_vote_id ON rationales(vote_id);
CREATE INDEX idx_rationales_moderated ON rationales(moderated) WHERE moderated = true;

-- Word clouds table: Cache processed word cloud data
CREATE TABLE word_clouds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    scenario_id UUID NOT NULL REFERENCES scenarios(id),
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('pull', 'dont_pull')),
    words JSONB NOT NULL, -- Array of {text, count, size}
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, scenario_id, vote_type)
);

-- Index for word cloud lookups
CREATE INDEX idx_word_clouds_session_scenario ON word_clouds(session_id, scenario_id);

-- Moderation events table: Track all moderation actions
CREATE TABLE moderation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    original_content TEXT,
    sanitized_content TEXT,
    reason TEXT,
    automated BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for moderation queries
CREATE INDEX idx_moderation_events_session ON moderation_events(session_id);
CREATE INDEX idx_moderation_events_participant ON moderation_events(participant_id);
CREATE INDEX idx_moderation_events_type ON moderation_events(event_type);
CREATE INDEX idx_moderation_events_created_at ON moderation_events(created_at DESC);

-- Analytics table: Aggregate metrics for reporting
CREATE TABLE analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    scenario_id UUID REFERENCES scenarios(id),
    metric_type VARCHAR(50) NOT NULL,
    metric_value JSONB NOT NULL,
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX idx_analytics_session ON analytics(session_id);
CREATE INDEX idx_analytics_type ON analytics(metric_type);
CREATE INDEX idx_analytics_calculated_at ON analytics(calculated_at DESC);

-- Export logs table: Track data exports
CREATE TABLE export_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    export_format VARCHAR(20) NOT NULL CHECK (export_format IN ('csv', 'json', 'pdf')),
    export_url TEXT,
    requested_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- Index for export queries
CREATE INDEX idx_export_logs_session ON export_logs(session_id);
CREATE INDEX idx_export_logs_expires_at ON export_logs(expires_at);

-- Rate limiting table: Track request rates
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL, -- IP hash or fingerprint
    action VARCHAR(50) NOT NULL,
    count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    window_end TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 minute'
);

-- Indexes for rate limiting
CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier, action);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_end);

-- Create views for common queries

-- Active sessions view
CREATE VIEW active_sessions AS
SELECT 
    s.id,
    s.room_code,
    s.created_at,
    s.config,
    COUNT(DISTINCT p.id) FILTER (WHERE p.is_active = true) as active_participants,
    ss.scenario_id as current_scenario_id,
    sc.title as current_scenario_title
FROM sessions s
LEFT JOIN participants p ON s.id = p.session_id
LEFT JOIN session_scenarios ss ON s.id = ss.session_id AND ss.status = 'active'
LEFT JOIN scenarios sc ON ss.scenario_id = sc.id
WHERE s.status IN ('waiting', 'active')
GROUP BY s.id, s.room_code, s.created_at, s.config, ss.scenario_id, sc.title;

-- Vote summary view
CREATE VIEW vote_summary AS
SELECT
    v.session_id,
    v.scenario_id,
    COUNT(*) as total_votes,
    COUNT(*) FILTER (WHERE v.vote = 'pull') as pull_votes,
    COUNT(*) FILTER (WHERE v.vote = 'dont_pull') as dont_pull_votes,
    AVG(v.latency_ms) as avg_latency_ms
FROM votes v
GROUP BY v.session_id, v.scenario_id;

-- Create functions for room code generation
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS VARCHAR(6) AS $$
DECLARE
    chars VARCHAR(36) := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR(6) := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * 36 + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new session with unique room code
CREATE OR REPLACE FUNCTION create_session(
    p_facilitator_id UUID DEFAULT NULL,
    p_config JSONB DEFAULT '{}'::jsonb
)
RETURNS sessions AS $$
DECLARE
    v_room_code VARCHAR(6);
    v_session sessions;
    v_attempts INTEGER := 0;
BEGIN
    LOOP
        v_attempts := v_attempts + 1;
        v_room_code := generate_room_code();
        
        BEGIN
            INSERT INTO sessions (room_code, facilitator_id, config)
            VALUES (v_room_code, p_facilitator_id, p_config)
            RETURNING * INTO v_session;
            
            RETURN v_session;
        EXCEPTION WHEN unique_violation THEN
            IF v_attempts > 10 THEN
                RAISE EXCEPTION 'Could not generate unique room code after 10 attempts';
            END IF;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Delete completed sessions older than 30 days
    DELETE FROM sessions 
    WHERE status = 'complete' 
    AND ended_at < NOW() - INTERVAL '30 days';
    
    -- Delete expired export logs
    DELETE FROM export_logs
    WHERE expires_at < NOW();
    
    -- Delete old rate limit records
    DELETE FROM rate_limits
    WHERE window_end < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Create triggers

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scenarios_updated_at
    BEFORE UPDATE ON scenarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Participant cleanup trigger
CREATE OR REPLACE FUNCTION mark_participant_inactive()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE participants
    SET is_active = false, left_at = NOW()
    WHERE session_id = NEW.id
    AND is_active = true;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_participants_on_session_end
    AFTER UPDATE OF status ON sessions
    FOR EACH ROW
    WHEN (NEW.status IN ('complete', 'cancelled'))
    EXECUTE FUNCTION mark_participant_inactive();

-- Grant permissions (adjust based on your Supabase setup)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Row Level Security Policies
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rationales ENABLE ROW LEVEL SECURITY;

-- Allow read access to active sessions
CREATE POLICY "Sessions are viewable by everyone" ON sessions
    FOR SELECT USING (true);

-- Allow participants to join sessions
CREATE POLICY "Participants can join sessions" ON participants
    FOR INSERT WITH CHECK (true);

-- Allow participants to vote
CREATE POLICY "Participants can vote" ON votes
    FOR INSERT WITH CHECK (true);

-- Allow participants to add rationales
CREATE POLICY "Participants can add rationales" ON rationales
    FOR INSERT WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE sessions IS 'Game sessions created by facilitators';
COMMENT ON TABLE participants IS 'Anonymous participants in game sessions';
COMMENT ON TABLE votes IS 'Participant votes on scenarios';
COMMENT ON TABLE rationales IS 'Explanations for votes';
COMMENT ON TABLE scenarios IS 'Ethical dilemma scenarios';
COMMENT ON TABLE word_clouds IS 'Cached word cloud data for performance';
COMMENT ON TABLE moderation_events IS 'Audit log of all moderation actions';
COMMENT ON TABLE analytics IS 'Aggregated metrics for reporting';
COMMENT ON TABLE export_logs IS 'Track data exports with expiration';
COMMENT ON TABLE rate_limits IS 'Request rate limiting';

COMMENT ON FUNCTION generate_room_code() IS 'Generate a random 6-character room code';
COMMENT ON FUNCTION create_session(UUID, JSONB) IS 'Create a new session with unique room code';
COMMENT ON FUNCTION cleanup_old_data() IS 'Remove old data to manage database size';