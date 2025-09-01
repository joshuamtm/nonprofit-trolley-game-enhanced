// Hybrid room service that works with or without backend
import { generateFingerprint } from '../utils/fingerprint';
import { Database } from './supabaseCompat';
import { MockRoomService } from './mockData';
import { RoomService as ApiRoomService } from './roomsApi';

type Session = Database['public']['Tables']['sessions']['Row'];
type Participant = Database['public']['Tables']['participants']['Row'];
type Vote = Database['public']['Tables']['votes']['Row'];
type Scenario = Database['public']['Tables']['scenarios']['Row'];

export interface RoomConfig {
  timerDuration?: number;
  maxParticipants?: number;
  moderationEnabled?: boolean;
  contentWarnings?: boolean;
}

// Check if we have a backend configured
const hasBackend = !!process.env.REACT_APP_API_URL;

export class RoomService {
  static async createRoom(config: RoomConfig = {}): Promise<{ room: Session; error: Error | null }> {
    console.log('🔧 RoomService.createRoom - hasBackend:', hasBackend);
    
    if (!hasBackend) {
      console.log('📱 Using MockRoomService (no backend configured)');
      return MockRoomService.createRoom(config);
    }
    
    console.log('🌐 Using API RoomService');
    return ApiRoomService.createRoom(config);
  }

  static async joinRoom(roomCode: string): Promise<{ participant: Participant; error: Error | null }> {
    console.log('🔧 RoomService.joinRoom - hasBackend:', hasBackend, 'roomCode:', roomCode);
    
    if (!hasBackend) {
      console.log('📱 Using MockRoomService (no backend configured)');
      return MockRoomService.joinRoom(roomCode);
    }
    
    console.log('🌐 Using API RoomService');
    return ApiRoomService.joinRoom(roomCode);
  }

  static async getRoomStatus(roomCode: string) {
    if (!hasBackend) {
      return MockRoomService.getRoomStatus(roomCode);
    }
    return ApiRoomService.getRoomStatus(roomCode);
  }

  static async startScenario(sessionId: string, scenarioId: string) {
    if (!hasBackend) {
      return MockRoomService.startScenario(sessionId, scenarioId);
    }
    return ApiRoomService.startScenario(sessionId, scenarioId);
  }

  static async submitVote(
    sessionId: string,
    participantId: string,
    scenarioId: string,
    vote: 'pull' | 'dont_pull',
    rationale?: string,
    mitigation?: string
  ) {
    if (!hasBackend) {
      return MockRoomService.submitVote(sessionId, participantId, scenarioId, vote, rationale, mitigation);
    }
    return ApiRoomService.submitVote(sessionId, participantId, scenarioId, vote, rationale, mitigation);
  }

  static async getVoteSummary(sessionId: string, scenarioId: string) {
    if (!hasBackend) {
      return MockRoomService.getVoteSummary(sessionId, scenarioId);
    }
    return ApiRoomService.getVoteSummary(sessionId, scenarioId);
  }

  static async getRationales(sessionId: string, scenarioId: string) {
    if (!hasBackend) {
      return MockRoomService.getRationales(sessionId, scenarioId);
    }
    return ApiRoomService.getRationales(sessionId, scenarioId);
  }

  static async getMitigations(sessionId: string, scenarioId: string) {
    if (!hasBackend) {
      return MockRoomService.getMitigations(sessionId, scenarioId);
    }
    return ApiRoomService.getMitigations(sessionId, scenarioId);
  }

  static async endSession(sessionId: string) {
    if (!hasBackend) {
      return MockRoomService.endSession(sessionId);
    }
    return ApiRoomService.endSession(sessionId);
  }

  static async loadScenarios(difficulty?: 'beginner' | 'intermediate' | 'advanced') {
    if (!hasBackend) {
      return MockRoomService.loadScenarios(difficulty);
    }
    return ApiRoomService.loadScenarios(difficulty);
  }
}