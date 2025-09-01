-- Update scenarios table to add mitigations field
ALTER TABLE public.scenarios 
ADD COLUMN IF NOT EXISTS mitigations TEXT[] DEFAULT '{}';

-- Add ecological impact scenario
INSERT INTO public.scenarios (
    title, 
    context, 
    ai_option, 
    non_ai_option, 
    assumptions, 
    ethical_axes, 
    risk_notes, 
    metrics, 
    content_warnings, 
    difficulty_level, 
    discussion_prompts,
    mitigations
) VALUES (
    'Environmental Impact of Grant Writing AI',
    'Your nonprofit needs to submit 50 grant applications this year to maintain funding. Using AI tools for grant writing could increase your success rate from 20% to 35%, potentially securing an additional $750,000 in funding that would help 1,500 more beneficiaries. However, each AI-assisted grant application generates approximately 10-20 kg of CO2 emissions (equivalent to driving 50-100 miles), totaling 500-1,000 kg of CO2 annually. Your organization has committed to carbon neutrality and environmental justice, serving communities already disproportionately affected by climate change.',
    'Pull the lever: Use AI for grant writing to secure $750,000 more funding and help 1,500 additional people, accepting the carbon footprint of 500-1,000 kg CO2 annually.',
    'Don''t pull: Continue manual grant writing with lower success rates but maintain your carbon-neutral commitment to communities affected by climate change.',
    ARRAY[
        'ChatGPT uses 2.9 watt-hours per query vs 0.3 for a Google search',
        'Average grant application requires 100-200 AI queries for drafting and revision',
        'US electricity grid is 60% fossil fuels, making each query contribute to emissions',
        'Additional funding would provide critical services to climate-vulnerable populations'
    ],
    ARRAY['environmental_justice', 'sustainability', 'effectiveness'],
    'Using AI while serving climate-affected communities creates ethical tension between immediate help and long-term environmental harm.',
    '{
        "benefit_estimate": "+$750,000 funding, +1,500 beneficiaries served",
        "environmental_cost": "500-1,000 kg CO2/year (equivalent to 2,500-5,000 miles driven)",
        "success_rate_change": "20% to 35% grant success rate"
    }',
    ARRAY['climate_change'],
    'advanced',
    ARRAY[
        'How do we balance immediate community needs against long-term environmental impact?',
        'Is it hypocritical to use high-carbon tools while serving climate-affected communities?',
        'What level of environmental impact is acceptable for increased social good?'
    ],
    ARRAY[
        'Purchase verified carbon offsets for all AI usage',
        'Use AI only for highest-value grant applications',
        'Run AI queries during off-peak hours when renewable energy is more available',
        'Choose more efficient AI models when possible',
        'Batch queries to reduce redundant processing'
    ]
);

-- Update existing scenarios with mitigations
UPDATE public.scenarios SET mitigations = ARRAY[
    'Implement human review for all AI decisions affecting vulnerable populations',
    'Create an appeals process for those excluded by AI recommendations',
    'Maintain a dedicated team member to handle edge cases',
    'Regular audits of AI decisions for bias patterns',
    'Transparent communication about AI use in decision-making'
] WHERE title = 'Food Bank Resource Allocation';

UPDATE public.scenarios SET mitigations = ARRAY[
    'Mandatory human review for all crisis flags',
    'Cultural competency training for AI models',
    'Clear disclaimers that AI is not a replacement for professional help',
    'Regular false positive/negative rate monitoring',
    'Backup human counselor always available for escalation'
] WHERE title = 'Youth Mental Health Crisis Screening';

UPDATE public.scenarios SET mitigations = ARRAY[
    'Maintain separate engagement tracks for small and major donors',
    'Set minimum percentage of outreach reserved for grassroots donors',
    'Use AI insights to improve but not replace human relationship building',
    'Regular review of donor diversity metrics',
    'Transparent communication about how donor data is used'
] WHERE title = 'Donor Targeting and Engagement';

UPDATE public.scenarios SET mitigations = ARRAY[
    'Obtain explicit consent for location tracking',
    'Use aggregated rather than individual data when possible',
    'Maintain traditional outreach for areas with privacy concerns',
    'Regular data deletion policies',
    'Community input on acceptable data use'
] WHERE title = 'Homeless Services Predictive Routing';

UPDATE public.scenarios SET mitigations = ARRAY[
    'Weighted scoring that accounts for obstacles faced',
    'Reserve percentage of scholarships for high-barrier students',
    'Human review of all AI recommendations',
    'Track long-term outcomes beyond graduation',
    'Regular bias audits of selection patterns'
] WHERE title = 'Scholarship Award Optimization';

UPDATE public.scenarios SET mitigations = ARRAY[
    'Opt-in system with easy opt-out options',
    'Adjustable sensitivity settings for alerts',
    'Regular false alarm rate monitoring and adjustment',
    'Human check-ins to supplement monitoring',
    'Family training on system limitations'
] WHERE title = 'Elderly Care Monitoring System';

UPDATE public.scenarios SET mitigations = ARRAY[
    'Reserve capacity for urgent/complex cases regardless of success probability',
    'Pro bono hours specifically for high-need cases',
    'Partner with other organizations for complex case referrals',
    'Track and report on cases declined due to complexity',
    'Regular review of triage criteria with community input'
] WHERE title = 'Immigration Legal Aid Triage';

UPDATE public.scenarios SET mitigations = ARRAY[
    'Maintain ground teams for connectivity-poor areas',
    'Use multiple data sources beyond digital platforms',
    'Partner with local organizations who know isolated communities',
    'Pre-disaster mapping of digitally disconnected areas',
    'Regular post-disaster audits of missed communities'
] WHERE title = 'Disaster Relief Resource Distribution';

UPDATE public.scenarios SET mitigations = ARRAY[
    'Strict data governance and privacy policies',
    'Opt-in rather than automatic enrollment',
    'Community health workers for culturally sensitive outreach',
    'Anonymous options for engagement',
    'Regular community feedback on program acceptability'
] WHERE title = 'Community Health Intervention Targeting';

UPDATE public.scenarios SET mitigations = ARRAY[
    'Holistic scoring that values potential over probability',
    'Reserved slots for highest-barrier applicants',
    'Mentorship programs for those facing challenges',
    'Track impact on participants lives beyond job placement',
    'Community advisory board for selection criteria'
] WHERE title = 'Youth Job Training Program Selection';