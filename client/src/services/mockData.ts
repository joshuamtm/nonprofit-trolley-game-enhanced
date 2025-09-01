// Mock data for development and testing without Supabase
import { isDemo } from './supabase';

export const mockScenarios = [
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    title: "Food Bank Resource Allocation",
    context: "Your food bank serves 10,000 families monthly but struggles with inefficient distribution. An AI system could predict demand patterns and optimize delivery routes, potentially serving 2,000 more families with the same resources. However, the AI might deprioritize elderly recipients who order irregularly or rural families with inconsistent internet access, potentially leaving 200-300 vulnerable households underserved.",
    ai_option: "Pull the lever: Deploy AI to optimize food distribution, reaching 2,000 more families but risking exclusion of irregular users.",
    non_ai_option: "Don't pull: Keep current human-managed system that serves fewer families but maintains personal knowledge of vulnerable cases.",
    assumptions: [
      "AI predictions are 85% accurate based on historical data",
      "Current staff can manually track about 50 special cases",
      "The 2,000 additional families are food-insecure but not at crisis level"
    ],
    ethical_axes: ["equity", "bias", "safety"],
    risk_notes: "AI might systematically exclude those who need help most but engage least predictably with services.",
    metrics: {
      benefit_estimate: "+2,000 families served monthly",
      error_rate: "3-5% misallocation rate",
      cost_comparison: "40% reduction in distribution costs"
    },
    content_warnings: ["poverty"],
    difficulty_level: "intermediate" as const,
    discussion_prompts: [
      "How do we balance serving more people versus ensuring we don't abandon the most vulnerable?",
      "What safeguards could protect irregular users while still leveraging AI benefits?"
    ],
    mitigations: [
      "Implement human review for all AI decisions affecting vulnerable populations",
      "Create an appeals process for those excluded by AI recommendations",
      "Maintain a dedicated team member to handle edge cases",
      "Regular audits of AI decisions for bias patterns",
      "Transparent communication about AI use in decision-making"
    ],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
    title: "Youth Mental Health Crisis Screening",
    context: "Your nonprofit provides mental health support to 5,000 at-risk youth annually. An AI chatbot could provide 24/7 initial screening and crisis detection, potentially identifying 500 more youth in crisis early. However, the AI has a 2% false positive rate that could traumatize healthy teens with crisis interventions, and a 0.5% false negative rate that might miss genuine crisis cases who use coded language or cultural expressions the AI doesn't recognize.",
    ai_option: "Pull the lever: Deploy AI screening to catch 500 more youth in crisis, accepting false positives and potential missed cases.",
    non_ai_option: "Don't pull: Maintain human-only screening during business hours, reaching fewer youth but with trained counselor judgment.",
    assumptions: [
      "Current counselors work 40 hours/week and can screen 20 youth daily",
      "AI operates 24/7 and can handle unlimited concurrent conversations",
      "Youth are more likely to engage with anonymous AI than schedule appointments"
    ],
    ethical_axes: ["safety", "privacy", "autonomy"],
    risk_notes: "False negatives in crisis detection could have fatal consequences; false positives could breach trust and stigmatize healthy youth.",
    metrics: {
      benefit_estimate: "+500 at-risk youth identified annually",
      error_rate: "2% false positive, 0.5% false negative",
      cost_comparison: "24/7 availability vs 40hr/week human coverage"
    },
    content_warnings: ["mental_health", "crisis"],
    difficulty_level: "advanced" as const,
    discussion_prompts: [
      "Is it ethical to use AI for mental health screening given the stakes?",
      "How do we weigh increased reach against the risk of errors in crisis detection?"
    ],
    mitigations: [
      "Mandatory human review for all crisis flags",
      "Cultural competency training for AI models",
      "Clear disclaimers that AI is not a replacement for professional help",
      "Regular false positive/negative rate monitoring",
      "Backup human counselor always available for escalation"
    ],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "f6a7b8c9-d0e1-2345-fabc-678901234567",
    title: "Donor Targeting and Engagement",
    context: "Your nonprofit needs to raise $1M annually to maintain services. An AI system analyzing donor data could identify high-potential major donors and optimize outreach timing, potentially increasing donations by 30% ($300K). However, this system would deprioritize small-dollar grassroots donors who provide community legitimacy and volunteer hours, possibly alienating the 2,000 donors who give under $100 but provide 5,000 volunteer hours annually.",
    ai_option: "Pull the lever: Use AI to maximize donation revenue through targeted major donor cultivation.",
    non_ai_option: "Don't pull: Maintain current inclusive approach that values all donors equally regardless of capacity.",
    assumptions: [
      "Major donors (>$1,000) comprise 20% of donors but 80% of revenue",
      "Small donors (<$100) comprise 70% of donors and 60% of volunteers",
      "AI can predict optimal engagement timing with 75% accuracy"
    ],
    ethical_axes: ["equity", "transparency", "accountability"],
    risk_notes: "Focusing on major donors could transform organization from community-based to elite-funded, changing mission alignment.",
    metrics: {
      benefit_estimate: "+$300,000 annual revenue",
      error_rate: "25% engagement mistiming",
      cost_comparison: "3x ROI on fundraising efforts"
    },
    content_warnings: [],
    difficulty_level: "beginner" as const,
    discussion_prompts: [
      "Should nonprofits optimize for financial sustainability or community engagement?",
      "What are the long-term costs of alienating grassroots supporters?"
    ],
    mitigations: [
      "Maintain separate engagement tracks for small and major donors",
      "Set minimum percentage of outreach reserved for grassroots donors",
      "Use AI insights to improve but not replace human relationship building",
      "Regular review of donor diversity metrics",
      "Transparent communication about how donor data is used"
    ],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "c3d4e5f6-a7b8-9012-cdef-f34567890123",
    title: "Environmental Impact of Grant Writing AI",
    context: "Your nonprofit needs to submit 50 grant applications this year to maintain funding. Using AI tools for grant writing could increase your success rate from 20% to 35%, potentially securing an additional $750,000 in funding that would help 1,500 more beneficiaries. However, each AI-assisted grant application generates approximately 10-20 kg of CO2 emissions (equivalent to driving 50-100 miles), totaling 500-1,000 kg of CO2 annually. Your organization has committed to carbon neutrality and environmental justice, serving communities already disproportionately affected by climate change.",
    ai_option: "Pull the lever: Use AI for grant writing to secure $750,000 more funding and help 1,500 additional people, accepting the carbon footprint of 500-1,000 kg CO2 annually.",
    non_ai_option: "Don't pull: Continue manual grant writing with lower success rates but maintain your carbon-neutral commitment to communities affected by climate change.",
    assumptions: [
      "ChatGPT uses 2.9 watt-hours per query vs 0.3 for a Google search",
      "Average grant application requires 100-200 AI queries for drafting and revision",
      "US electricity grid is 60% fossil fuels, making each query contribute to emissions",
      "Additional funding would provide critical services to climate-vulnerable populations"
    ],
    ethical_axes: ["environmental_justice", "sustainability", "effectiveness"],
    risk_notes: "Using AI while serving climate-affected communities creates ethical tension between immediate help and long-term environmental harm.",
    metrics: {
      benefit_estimate: "+$750,000 funding, +1,500 beneficiaries served",
      environmental_cost: "500-1,000 kg CO2/year (equivalent to 2,500-5,000 miles driven)",
      success_rate_change: "20% to 35% grant success rate"
    },
    content_warnings: ["climate_change"],
    difficulty_level: "advanced" as const,
    discussion_prompts: [
      "How do we balance immediate community needs against long-term environmental impact?",
      "Is it hypocritical to use high-carbon tools while serving climate-affected communities?",
      "What level of environmental impact is acceptable for increased social good?"
    ],
    mitigations: [
      "Purchase verified carbon offsets for all AI usage",
      "Use AI only for highest-value grant applications",
      "Run AI queries during off-peak hours when renewable energy is more available",
      "Choose more efficient AI models when possible",
      "Batch queries to reduce redundant processing"
    ],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
];

export class MockRoomService {
  private static sessions: Map<string, any> = new Map();
  private static participants: Map<string, any> = new Map();
  private static votes: Map<string, any> = new Map();
  
  static async createRoom(config: any = {}): Promise<{ room: any; error: Error | null }> {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const session = {
      id: `session-${Date.now()}`,
      room_code: roomCode,
      facilitator_id: null,
      created_at: new Date().toISOString(),
      ended_at: null,
      config: {
        timerDuration: 30,
        maxParticipants: 200,
        moderationEnabled: true,
        contentWarnings: true,
        ...config,
      },
      status: 'waiting',
      metadata: {},
    };
    
    this.sessions.set(session.id, session);
    return { room: session, error: null };
  }
  
  static async joinRoom(roomCode: string): Promise<{ participant: any; error: Error | null }> {
    const session = Array.from(this.sessions.values()).find(s => s.room_code === roomCode);
    
    if (!session) {
      return { participant: null, error: new Error('Room not found') };
    }
    
    const participant = {
      id: `participant-${Date.now()}-${Math.random()}`,
      session_id: session.id,
      fingerprint: `fp-${Math.random().toString(36)}`,
      joined_at: new Date().toISOString(),
      left_at: null,
      user_agent: navigator.userAgent,
      ip_hash: null,
      is_active: true,
      metadata: {},
    };
    
    this.participants.set(participant.id, participant);
    return { participant, error: null };
  }
  
  static async getRoomStatus(roomCode: string) {
    const session = Array.from(this.sessions.values()).find(s => s.room_code === roomCode);
    
    if (!session) {
      return { data: null, error: new Error('Room not found') };
    }
    
    const participantCount = Array.from(this.participants.values())
      .filter(p => p.session_id === session.id && p.is_active).length;
    
    return {
      data: {
        ...session,
        active_participants: participantCount,
        current_scenario_id: null,
        current_scenario_title: null,
      },
      error: null,
    };
  }
  
  static async submitVote(sessionId: string, participantId: string, scenarioId: string, vote: string, rationale?: string, mitigation?: string) {
    const voteId = `vote-${Date.now()}-${Math.random()}`;
    const voteData = {
      id: voteId,
      session_id: sessionId,
      participant_id: participantId,
      scenario_id: scenarioId,
      vote,
      created_at: new Date().toISOString(),
      latency_ms: Math.floor(Math.random() * 100) + 50,
    };
    
    this.votes.set(voteId, voteData);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return { data: voteData, error: null };
  }
  
  static async getVoteSummary(sessionId: string, scenarioId: string) {
    const votes = Array.from(this.votes.values())
      .filter(v => v.session_id === sessionId && v.scenario_id === scenarioId);
    
    const pullVotes = votes.filter(v => v.vote === 'pull').length;
    const dontPullVotes = votes.filter(v => v.vote === 'dont_pull').length;
    
    return {
      data: {
        session_id: sessionId,
        scenario_id: scenarioId,
        total_votes: votes.length,
        pull_votes: pullVotes,
        dont_pull_votes: dontPullVotes,
        avg_latency_ms: 75,
      },
      error: null,
    };
  }
  
  static async loadScenarios() {
    return { data: mockScenarios, error: null };
  }
}

// Use mock service when Supabase is not configured
export const isMockMode = isDemo;