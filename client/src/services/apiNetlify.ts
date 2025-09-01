// API client for Netlify Functions (serverless backend)
import axios from 'axios';

// Use Netlify Functions URL
const API_URL = process.env.REACT_APP_API_URL || '/.netlify/functions';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface RoomConfig {
  timerDuration?: number;
  maxParticipants?: number;
  moderationEnabled?: boolean;
  contentWarnings?: boolean;
}

export interface Session {
  id: string;
  roomCode: string;
  facilitatorId: string | null;
  createdAt: string;
  endedAt: string | null;
  config: RoomConfig;
  status: 'waiting' | 'active' | 'complete' | 'cancelled';
  metadata: Record<string, any>;
}

export interface Participant {
  id: string;
  sessionId: string;
  fingerprint: string;
  joinedAt: string;
  leftAt: string | null;
  userAgent: string | null;
  ipHash: string | null;
  isActive: boolean;
  metadata: Record<string, any>;
}

export class ApiService {
  static async createRoom(config: RoomConfig = {}): Promise<{ room: Session; error: Error | null }> {
    try {
      const response = await api.post('/create-room', { config });
      return { room: response.data.room, error: null };
    } catch (error) {
      console.error('Failed to create room:', error);
      return { room: null as any, error: error as Error };
    }
  }

  static async joinRoom(roomCode: string, fingerprint: string): Promise<{ 
    participant: Participant; 
    session: Session;
    error: Error | null 
  }> {
    try {
      const response = await api.post('/join-room', {
        roomCode,
        fingerprint,
      });
      return { 
        participant: response.data.participant,
        session: response.data.session,
        error: null 
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message;
      return { 
        participant: null as any, 
        session: null as any,
        error: new Error(errorMessage) 
      };
    }
  }

  static async submitVote(
    sessionId: string,
    participantId: string,
    scenarioId: string,
    vote: 'pull' | 'dont_pull',
    rationale?: string,
    mitigation?: string
  ) {
    try {
      const response = await api.post('/submit-vote', {
        sessionId,
        participantId,
        scenarioId,
        vote,
        rationale,
        mitigation,
      });
      return { data: response.data.vote, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // For features that need real-time, we'll use polling
  static async pollVoteSummary(sessionId: string, scenarioId: string) {
    try {
      const response = await api.get(`/vote-summary?sessionId=${sessionId}&scenarioId=${scenarioId}`);
      return { data: response.data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  // Stub methods for features that won't work without WebSockets
  static async getRoomStatus(roomCode: string) {
    console.warn('getRoomStatus requires polling implementation');
    return { data: null, error: new Error('Not implemented for serverless') };
  }

  static async startScenario(sessionId: string, scenarioId: string) {
    console.warn('startScenario requires polling implementation');
    return { data: null, error: new Error('Not implemented for serverless') };
  }

  static async getVoteSummary(sessionId: string, scenarioId: string) {
    return this.pollVoteSummary(sessionId, scenarioId);
  }

  static async getRationales(sessionId: string, scenarioId: string) {
    console.warn('getRationales requires implementation');
    return { data: { pull: [], dont_pull: [] }, error: null };
  }

  static async getMitigations(sessionId: string, scenarioId: string) {
    console.warn('getMitigations requires implementation');
    return { data: [], error: null };
  }

  static async endSession(sessionId: string) {
    console.warn('endSession requires implementation');
    return { data: null, error: new Error('Not implemented for serverless') };
  }

  static async loadScenarios(difficulty?: 'beginner' | 'intermediate' | 'advanced') {
    // For now, return mock scenarios since we don't have a scenarios endpoint
    return {
      data: [{
        id: "1",
        title: "AI-Powered Volunteer Matching",
        context: "Your nonprofit needs to match 500 volunteers with opportunities",
        aiOption: "Use AI to automatically match volunteers",
        nonAiOption: "Continue manual matching by staff",
        assumptions: ["AI can identify patterns"],
        ethicalAxes: ["Efficiency vs Personal Touch"],
        riskNotes: "AI might miss nuanced factors",
        metrics: { benefit_estimate: "75% time reduction" },
        contentWarnings: [],
        difficultyLevel: "beginner" as const,
        discussionPrompts: ["How do we balance efficiency with personal connection?"],
        mitigations: ["Human review of AI suggestions"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }],
      error: null
    };
  }
}