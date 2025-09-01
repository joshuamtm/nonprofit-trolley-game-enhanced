import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
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

export interface Vote {
  id: string;
  sessionId: string;
  participantId: string;
  scenarioId: string;
  vote: 'pull' | 'dont_pull';
  createdAt: string;
  latencyMs: number | null;
}

export interface Scenario {
  id: string;
  title: string;
  context: string;
  aiOption: string;
  nonAiOption: string;
  assumptions: string[];
  ethicalAxes: string[];
  riskNotes: string | null;
  metrics: {
    benefit_estimate?: string;
    error_rate?: string;
    cost_comparison?: string;
  };
  contentWarnings: string[];
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  discussionPrompts: string[];
  mitigations?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class ApiService {
  static async createRoom(config: RoomConfig = {}): Promise<{ room: Session; error: Error | null }> {
    try {
      const response = await api.post('/rooms/create', { config });
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
      const response = await api.post('/rooms/join', {
        roomCode,
        fingerprint,
        userAgent: navigator.userAgent,
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

  static async getRoomStatus(roomCode: string) {
    try {
      const response = await api.get(`/rooms/${roomCode}/status`);
      return { data: response.data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  static async startScenario(sessionId: string, scenarioId: string) {
    try {
      const response = await api.post(`/sessions/${sessionId}/scenarios/${scenarioId}/start`);
      return { data: response.data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
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
      const response = await api.post('/votes', {
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

  static async getVoteSummary(sessionId: string, scenarioId: string) {
    try {
      const response = await api.get(`/sessions/${sessionId}/scenarios/${scenarioId}/votes`);
      return { data: response.data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  static async getRationales(sessionId: string, scenarioId: string) {
    try {
      const response = await api.get(`/sessions/${sessionId}/scenarios/${scenarioId}/rationales`);
      return { data: response.data, error: null };
    } catch (error) {
      return { data: { pull: [], dont_pull: [] }, error: error as Error };
    }
  }

  static async getMitigations(sessionId: string, scenarioId: string) {
    try {
      const response = await api.get(`/sessions/${sessionId}/scenarios/${scenarioId}/mitigations`);
      return { data: response.data, error: null };
    } catch (error) {
      return { data: [], error: error as Error };
    }
  }

  static async endSession(sessionId: string) {
    try {
      const response = await api.post(`/sessions/${sessionId}/end`);
      return { data: response.data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  static async loadScenarios(difficulty?: 'beginner' | 'intermediate' | 'advanced') {
    try {
      const response = await api.get('/scenarios', {
        params: difficulty ? { difficulty } : undefined,
      });
      return { data: response.data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}