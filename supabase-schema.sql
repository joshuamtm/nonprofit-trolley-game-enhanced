-- Nonprofit Trolley Game Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
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
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    fingerprint VARCHAR(255) NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    user_agent TEXT,
    ip_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'
);

-- Create scenarios table
CREATE TABLE IF NOT EXISTS public.scenarios (
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
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create session_scenarios table (tracks which scenarios are used in each session)
CREATE TABLE IF NOT EXISTS public.session_scenarios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    scenario_id UUID REFERENCES public.scenarios(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'complete')),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    order_index INTEGER
);

-- Create votes table
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE,
    scenario_id UUID REFERENCES public.scenarios(id) ON DELETE CASCADE,
    vote VARCHAR(20) NOT NULL CHECK (vote IN ('pull', 'dont_pull')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    latency_ms INTEGER
);

-- Create rationales table
CREATE TABLE IF NOT EXISTS public.rationales (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    vote_id UUID REFERENCES public.votes(id) ON DELETE CASCADE,
    original_text TEXT NOT NULL,
    processed_text TEXT,
    word_count INTEGER,
    moderated BOOLEAN DEFAULT FALSE,
    moderation_reason VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_room_code ON public.sessions(room_code);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_participants_session_id ON public.participants(session_id);
CREATE INDEX IF NOT EXISTS idx_participants_fingerprint ON public.participants(fingerprint);
CREATE INDEX IF NOT EXISTS idx_votes_session_id ON public.votes(session_id);
CREATE INDEX IF NOT EXISTS idx_votes_scenario_id ON public.votes(scenario_id);
CREATE INDEX IF NOT EXISTS idx_rationales_vote_id ON public.rationales(vote_id);

-- Create function to generate room codes
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS VARCHAR(6) AS $$
BEGIN
    RETURN UPPER(LEFT(MD5(RANDOM()::TEXT), 6));
END;
$$ LANGUAGE plpgsql;

-- Create function to create a new session
CREATE OR REPLACE FUNCTION create_session(
    p_facilitator_id UUID DEFAULT NULL,
    p_config JSONB DEFAULT '{}'::jsonb
)
RETURNS public.sessions AS $$
DECLARE
    new_room_code VARCHAR(6);
    new_session public.sessions;
    max_attempts INTEGER := 10;
    attempt_count INTEGER := 0;
BEGIN
    -- Generate unique room code
    LOOP
        new_room_code := generate_room_code();
        
        -- Check if room code already exists
        IF NOT EXISTS (SELECT 1 FROM public.sessions WHERE room_code = new_room_code) THEN
            EXIT;
        END IF;
        
        attempt_count := attempt_count + 1;
        IF attempt_count >= max_attempts THEN
            RAISE EXCEPTION 'Could not generate unique room code after % attempts', max_attempts;
        END IF;
    END LOOP;
    
    -- Insert new session
    INSERT INTO public.sessions (room_code, facilitator_id, config)
    VALUES (new_room_code, p_facilitator_id, p_config)
    RETURNING * INTO new_session;
    
    RETURN new_session;
END;
$$ LANGUAGE plpgsql;

-- Create view for active sessions with participant counts
CREATE OR REPLACE VIEW public.active_sessions AS
SELECT 
    s.id,
    s.room_code,
    s.created_at,
    s.config,
    s.status,
    COALESCE(p.active_participants, 0) as active_participants,
    ss.current_scenario_id,
    sc.title as current_scenario_title
FROM public.sessions s
LEFT JOIN (
    SELECT 
        session_id, 
        COUNT(*) as active_participants
    FROM public.participants 
    WHERE is_active = TRUE 
    GROUP BY session_id
) p ON s.id = p.session_id
LEFT JOIN (
    SELECT DISTINCT ON (session_id)
        session_id,
        scenario_id as current_scenario_id
    FROM public.session_scenarios
    WHERE status = 'active'
    ORDER BY session_id, started_at DESC
) ss ON s.id = ss.session_id
LEFT JOIN public.scenarios sc ON ss.current_scenario_id = sc.id
WHERE s.status IN ('waiting', 'active');

-- Create view for vote summaries
CREATE OR REPLACE VIEW public.vote_summary AS
SELECT 
    v.session_id,
    v.scenario_id,
    COUNT(*) as total_votes,
    SUM(CASE WHEN v.vote = 'pull' THEN 1 ELSE 0 END) as pull_votes,
    SUM(CASE WHEN v.vote = 'dont_pull' THEN 1 ELSE 0 END) as dont_pull_votes,
    AVG(v.latency_ms) as avg_latency_ms
FROM public.votes v
GROUP BY v.session_id, v.scenario_id;

-- Insert the 10 nonprofit scenarios
INSERT INTO public.scenarios (title, context, ai_option, non_ai_option, assumptions, ethical_axes, risk_notes, metrics, content_warnings, difficulty_level, discussion_prompts) VALUES
('Food Bank Resource Allocation', 'Your food bank serves 10,000 families monthly but struggles with inefficient distribution. An AI system could predict demand patterns and optimize delivery routes, potentially serving 2,000 more families with the same resources. However, the AI might deprioritize elderly recipients who order irregularly or rural families with inconsistent internet access, potentially leaving 200-300 vulnerable households underserved.', 'Pull the lever: Deploy AI to optimize food distribution, reaching 2,000 more families but risking exclusion of irregular users.', 'Don''t pull: Keep current human-managed system that serves fewer families but maintains personal knowledge of vulnerable cases.', ARRAY['AI predictions are 85% accurate based on historical data', 'Current staff can manually track about 50 special cases', 'The 2,000 additional families are food-insecure but not at crisis level'], ARRAY['equity', 'bias', 'safety'], 'AI might systematically exclude those who need help most but engage least predictably with services.', '{"benefit_estimate": "+2,000 families served monthly", "error_rate": "3-5% misallocation rate", "cost_comparison": "40% reduction in distribution costs"}', ARRAY['poverty'], 'intermediate', ARRAY['How do we balance serving more people versus ensuring we don''t abandon the most vulnerable?', 'What safeguards could protect irregular users while still leveraging AI benefits?']),

('Youth Mental Health Crisis Screening', 'Your nonprofit provides mental health support to 5,000 at-risk youth annually. An AI chatbot could provide 24/7 initial screening and crisis detection, potentially identifying 500 more youth in crisis early. However, the AI has a 2% false positive rate that could traumatize healthy teens with crisis interventions, and a 0.5% false negative rate that might miss genuine crisis cases who use coded language or cultural expressions the AI doesn''t recognize.', 'Pull the lever: Deploy AI screening to catch 500 more youth in crisis, accepting false positives and potential missed cases.', 'Don''t pull: Maintain human-only screening during business hours, reaching fewer youth but with trained counselor judgment.', ARRAY['Current counselors work 40 hours/week and can screen 20 youth daily', 'AI operates 24/7 and can handle unlimited concurrent conversations', 'Youth are more likely to engage with anonymous AI than schedule appointments'], ARRAY['safety', 'privacy', 'autonomy'], 'False negatives in crisis detection could have fatal consequences; false positives could breach trust and stigmatize healthy youth.', '{"benefit_estimate": "+500 at-risk youth identified annually", "error_rate": "2% false positive, 0.5% false negative", "cost_comparison": "24/7 availability vs 40hr/week human coverage"}', ARRAY['mental_health', 'crisis'], 'advanced', ARRAY['Is it ethical to use AI for mental health screening given the stakes?', 'How do we weigh increased reach against the risk of errors in crisis detection?']),

('Donor Targeting and Engagement', 'Your nonprofit needs to raise $1M annually to maintain services. An AI system analyzing donor data could identify high-potential major donors and optimize outreach timing, potentially increasing donations by 30% ($300K). However, this system would deprioritize small-dollar grassroots donors who provide community legitimacy and volunteer hours, possibly alienating the 2,000 donors who give under $100 but provide 5,000 volunteer hours annually.', 'Pull the lever: Use AI to maximize donation revenue through targeted major donor cultivation.', 'Don''t pull: Maintain current inclusive approach that values all donors equally regardless of capacity.', ARRAY['Major donors (>$1,000) comprise 20% of donors but 80% of revenue', 'Small donors (<$100) comprise 70% of donors and 60% of volunteers', 'AI can predict optimal engagement timing with 75% accuracy'], ARRAY['equity', 'transparency', 'accountability'], 'Focusing on major donors could transform organization from community-based to elite-funded, changing mission alignment.', '{"benefit_estimate": "+$300,000 annual revenue", "error_rate": "25% engagement mistiming", "cost_comparison": "3x ROI on fundraising efforts"}', ARRAY[], 'beginner', ARRAY['Should nonprofits optimize for financial sustainability or community engagement?', 'What are the long-term costs of alienating grassroots supporters?']);

-- Add the remaining 7 scenarios (continuing the INSERT...)
INSERT INTO public.scenarios (title, context, ai_option, non_ai_option, assumptions, ethical_axes, risk_notes, metrics, content_warnings, difficulty_level, discussion_prompts) VALUES
('Homeless Services Predictive Routing', 'Your outreach team serves 800 homeless individuals across the city but can only visit 60 locations daily. An AI system using weather, police activity, and historical data could predict where people will be, potentially increasing daily contacts by 40%. However, the AI relies on surveillance data and might miss new arrivals or individuals avoiding tracked areas, while raising privacy concerns about monitoring vulnerable populations.', 'Pull the lever: Deploy predictive routing to increase daily outreach contacts by 40%.', 'Don''t pull: Continue relationship-based outreach that reaches fewer people but builds deeper trust.', ARRAY['Current team visits 60 of 200 known locations daily', 'AI predictions based on 2 years of data show 80% accuracy', 'Weather and events significantly impact where people shelter'], ARRAY['privacy', 'surveillance', 'dignity'], 'Using surveillance data to track homeless populations raises serious ethical concerns about consent and dignity.', '{"benefit_estimate": "+24 daily contacts (40% increase)", "error_rate": "20% location prediction failures", "cost_comparison": "Same staff costs, higher contact rate"}', ARRAY['homelessness'], 'intermediate', ARRAY['Is it acceptable to use surveillance data to help vulnerable populations?', 'How do we balance efficiency gains against privacy and dignity concerns?']),

('Scholarship Award Optimization', 'Your education nonprofit awards $500K in scholarships annually to 200 students from 2,000 applicants. An AI system could analyze academic records, essays, and demographic data to identify students most likely to succeed and graduate, potentially increasing graduation rates from 70% to 85%. However, this might systematically favor students with stable home environments and strong academic support, excluding equally deserving students facing greater obstacles who might benefit most from assistance.', 'Pull the lever: Use AI to optimize scholarship selection for higher graduation rates.', 'Don''t pull: Keep holistic human review that considers intangible factors and life circumstances.', ARRAY['Current graduation rate is 70% for scholarship recipients', 'AI analysis suggests 85% rate possible with different selection', '30% of applicants face significant family/economic obstacles'], ARRAY['bias', 'equity', 'opportunity'], 'AI optimization might reinforce existing educational inequalities by favoring already-advantaged students.', '{"benefit_estimate": "+15% graduation rate increase", "error_rate": "Bias against non-traditional students", "cost_comparison": "50% reduction in review time"}', ARRAY[], 'advanced', ARRAY['Should we optimize for success rates or provide opportunities to those facing greater challenges?', 'How do we measure "success" in ways that don''t perpetuate inequality?']),

('Elderly Care Monitoring System', 'Your senior services nonprofit monitors 1,500 at-risk elderly clients through weekly check-ins. An AI system analyzing smart device data could provide 24/7 health monitoring and fall detection, potentially preventing 200 emergency situations annually. However, constant monitoring feels invasive to many seniors, and the system has a 5% false alarm rate that could overwhelm emergency services while creating anxiety for families receiving false crisis alerts.', 'Pull the lever: Deploy 24/7 AI monitoring to prevent 200 emergency situations per year.', 'Don''t pull: Maintain weekly human check-ins that provide social connection but less comprehensive safety monitoring.', ARRAY['Current system catches emergencies within 3-7 days average', 'AI monitoring could detect issues within hours', '60% of seniors express privacy concerns about constant monitoring'], ARRAY['privacy', 'autonomy', 'safety'], 'Constant monitoring may erode seniors'' sense of independence and dignity while creating anxiety about false alarms.', '{"benefit_estimate": "-200 emergency situations annually", "error_rate": "5% false alarm rate", "cost_comparison": "80% cost reduction per monitoring hour"}', ARRAY[], 'intermediate', ARRAY['How do we balance safety monitoring with seniors'' privacy and autonomy?', 'What level of false alarms is acceptable when lives are at stake?']),

('Immigration Legal Aid Triage', 'Your legal aid nonprofit receives 5,000 immigration cases annually but can only take 1,200 due to capacity limits. An AI system could analyze case details to identify which applicants have the highest chance of successful outcomes, potentially increasing success rates from 60% to 80%. However, this would systematically deprioritize complex cases involving trafficking victims, asylum seekers with trauma, or families with mixed documentation status who most desperately need legal help.', 'Pull the lever: Use AI triage to focus on high-success cases and improve overall outcomes.', 'Don''t pull: Continue first-come-first-served system that helps complex cases but with lower overall success rates.', ARRAY['Current acceptance rate: 1,200 of 5,000 annual applications', 'AI could improve success rate from 60% to 80%', 'Complex cases often involve the most vulnerable populations'], ARRAY['justice', 'equity', 'bias'], 'Optimizing for success rates might abandon those most in need of legal protection who have complex circumstances.', '{"benefit_estimate": "+20% case success rate", "error_rate": "Systematic exclusion of complex cases", "cost_comparison": "Same resources, higher success rate"}', ARRAY[], 'advanced', ARRAY['Should legal aid prioritize winnable cases or those with greatest need?', 'How do we define "success" in immigration legal aid?']),

('Disaster Relief Resource Distribution', 'After natural disasters, your nonprofit distributes emergency supplies to affected communities. An AI system could analyze satellite imagery, social media, and demographic data to predict need and optimize distribution routes, potentially reaching 30% more families in the critical first 72 hours. However, the AI might miss isolated communities without internet connectivity or social media presence, and could be biased toward English-language posts and urban areas with better data coverage.', 'Pull the lever: Deploy AI-optimized disaster response to reach 30% more families quickly.', 'Don''t pull: Use traditional community-based distribution that reaches fewer people but ensures isolated communities aren''t forgotten.', ARRAY['First 72 hours are critical for emergency aid effectiveness', 'AI analysis shows 30% efficiency improvement possible', '15% of affected populations live in areas with poor connectivity'], ARRAY['equity', 'bias', 'urgency'], 'AI optimization might systematically exclude the most isolated and vulnerable disaster victims who lack digital connectivity.', '{"benefit_estimate": "+30% families reached in first 72 hours", "error_rate": "Missed isolated communities", "cost_comparison": "40% faster initial deployment"}', ARRAY['disaster'], 'intermediate', ARRAY['In disaster response, is it better to help more people quickly or ensure no community is left behind?', 'How do we account for digital divides in emergency response planning?']),

('Community Health Intervention Targeting', 'Your public health nonprofit runs intervention programs for chronic disease prevention, currently serving 3,000 community members annually. An AI system analyzing health records, pharmacy data, and demographic information could identify individuals at highest risk for diabetes and heart disease, potentially preventing 150 more cases per year through early intervention. However, this approach raises serious privacy concerns and might miss cultural factors or hesitancy to engage with data-driven health outreach in immigrant or marginalized communities.', 'Pull the lever: Use AI health data analysis to prevent 150 more chronic disease cases annually.', 'Don''t pull: Continue community-based outreach that respects privacy but identifies fewer at-risk individuals.', ARRAY['Current program prevents ~300 chronic disease cases annually', 'AI could identify high-risk individuals with 90% accuracy', '25% of target community distrusts data-driven health programs'], ARRAY['privacy', 'trust', 'health_equity'], 'Using personal health data for outreach might erode community trust and exclude populations already wary of health surveillance.', '{"benefit_estimate": "+150 chronic disease cases prevented", "error_rate": "Cultural sensitivity gaps", "cost_comparison": "25% more efficient resource allocation"}', ARRAY['health'], 'advanced', ARRAY['Is it ethical to use personal health data for preventive outreach?', 'How do we balance population health benefits against individual privacy rights?']),

('Youth Job Training Program Selection', 'Your workforce development nonprofit provides job training to 500 at-risk youth annually from 1,500 applicants. An AI system analyzing academic records, family income, previous employment, and neighborhood data could predict which applicants are most likely to complete training and find sustainable employment, potentially increasing program success rates from 55% to 75%. However, this might exclude youth facing the greatest barriers who could benefit most from intervention, effectively reinforcing existing inequalities in employment outcomes.', 'Pull the lever: Use AI to select trainees most likely to succeed and improve overall program effectiveness.', 'Don''t pull: Maintain current holistic selection that gives opportunities to youth facing the greatest barriers.', ARRAY['Current program completion rate: 55%', 'AI predicts 75% completion rate with optimized selection', 'Youth facing greatest barriers often benefit most from intervention'], ARRAY['opportunity', 'bias', 'social_mobility'], 'Optimizing for program success rates might perpetuate employment inequalities by excluding those who face the greatest systemic barriers.', '{"benefit_estimate": "+20% program completion rate", "error_rate": "Systematic exclusion of high-barrier youth", "cost_comparison": "Same program costs, higher reported success"}', ARRAY[], 'beginner', ARRAY['Should job training programs optimize for success rates or focus on those who need help most?', 'How do we measure program impact beyond simple completion statistics?']);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rationales ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access to scenarios
CREATE POLICY "Allow public read access to active scenarios" ON public.scenarios
    FOR SELECT USING (is_active = true);

-- Create RLS policies for session management (allow all operations for now - you can restrict later)
CREATE POLICY "Allow all operations on sessions" ON public.sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on participants" ON public.participants FOR ALL USING (true);
CREATE POLICY "Allow all operations on session_scenarios" ON public.session_scenarios FOR ALL USING (true);
CREATE POLICY "Allow all operations on votes" ON public.votes FOR ALL USING (true);
CREATE POLICY "Allow all operations on rationales" ON public.rationales FOR ALL USING (true);

-- Set up realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rationales;

COMMIT;