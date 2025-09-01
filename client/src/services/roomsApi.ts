// API-based room service (replaces Supabase implementation)
import { ApiService } from './api';
import { generateFingerprint } from '../utils/fingerprint';
import { Database } from './supabaseCompat';

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

export class RoomService {
  static async createRoom(config: RoomConfig = {}): Promise<{ room: Session; error: Error | null }> {
    try {
      const result = await ApiService.createRoom(config);
      
      // Transform the response to match the expected Session type
      if (result.room) {
        const room: Session = {
          id: result.room.id,
          room_code: result.room.roomCode,
          facilitator_id: result.room.facilitatorId,
          created_at: result.room.createdAt,
          ended_at: result.room.endedAt,
          config: result.room.config as any,
          status: result.room.status,
          metadata: result.room.metadata,
        };
        return { room, error: null };
      }
      
      return { room: null as any, error: result.error };
    } catch (error) {
      console.error('Failed to create room:', error);
      return { room: null as any, error: error as Error };
    }
  }

  static async joinRoom(roomCode: string): Promise<{ participant: Participant; error: Error | null }> {
    try {
      const fingerprint = generateFingerprint();
      const result = await ApiService.joinRoom(roomCode, fingerprint);
      
      if (result.participant) {
        const participant: Participant = {
          id: result.participant.id,
          session_id: result.participant.sessionId,
          fingerprint: result.participant.fingerprint,
          joined_at: result.participant.joinedAt,
          left_at: result.participant.leftAt,
          user_agent: result.participant.userAgent,
          ip_hash: result.participant.ipHash,
          is_active: result.participant.isActive,
          metadata: result.participant.metadata,
        };
        return { participant, error: null };
      }
      
      return { participant: null as any, error: result.error };
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
    try {
      const result = await ApiService.loadScenarios(difficulty);
      
      if (result.data) {
        // Transform the response to match the expected Scenario type
        const scenarios: Scenario[] = result.data.map((s: any) => ({
          id: s.id,
          title: s.title,
          context: s.context,
          ai_option: s.aiOption,
          non_ai_option: s.nonAiOption,
          assumptions: s.assumptions,
          ethical_axes: s.ethicalAxes,
          risk_notes: s.riskNotes,
          metrics: s.metrics,
          content_warnings: s.contentWarnings,
          difficulty_level: s.difficultyLevel,
          discussion_prompts: s.discussionPrompts,
          mitigations: s.mitigations,
          is_active: s.isActive,
          created_at: s.createdAt,
          updated_at: s.updatedAt,
        }));
        
        return { data: scenarios, error: null };
      }
      
      return { data: null, error: result.error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}