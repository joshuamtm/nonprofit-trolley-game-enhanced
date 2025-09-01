import { ApiService, type Session, type Participant, type Vote, type Scenario } from './api';
import { generateFingerprint } from '../utils/fingerprint';

export interface RoomConfig {
  timerDuration?: number;
  maxParticipants?: number;
  moderationEnabled?: boolean;
  contentWarnings?: boolean;
}

export class RoomServiceNew {
  static async createRoom(config: RoomConfig = {}): Promise<{ room: Session; error: Error | null }> {
    return ApiService.createRoom(config);
  }

  static async joinRoom(roomCode: string): Promise<{ participant: Participant; error: Error | null }> {
    try {
      // Generate fingerprint for this participant
      const fingerprint = generateFingerprint();
      
      const result = await ApiService.joinRoom(roomCode, fingerprint);
      
      if (result.error) {
        return { participant: null as any, error: result.error };
      }
      
      return { participant: result.participant, error: null };
    } catch (error) {
      console.error('Failed to join room:', error);
      return { participant: null as any, error: error as Error };
    }
  }

  static async getRoomStatus(roomCode: string) {
    return ApiService.getRoomStatus(roomCode);
  }

  static async startScenario(sessionId: string, scenarioId: string) {
    return ApiService.startScenario(sessionId, scenarioId);
  }

  static async submitVote(
    sessionId: string,
    participantId: string,
    scenarioId: string,
    vote: 'pull' | 'dont_pull',
    rationale?: string,
    mitigation?: string
  ) {
    return ApiService.submitVote(sessionId, participantId, scenarioId, vote, rationale, mitigation);
  }

  static async getVoteSummary(sessionId: string, scenarioId: string) {
    return ApiService.getVoteSummary(sessionId, scenarioId);
  }

  static async getRationales(sessionId: string, scenarioId: string) {
    return ApiService.getRationales(sessionId, scenarioId);
  }

  static async getMitigations(sessionId: string, scenarioId: string) {
    return ApiService.getMitigations(sessionId, scenarioId);
  }

  static async endSession(sessionId: string) {
    return ApiService.endSession(sessionId);
  }

  static async loadScenarios(difficulty?: 'beginner' | 'intermediate' | 'advanced') {
    return ApiService.loadScenarios(difficulty);
  }
}