import { supabase, isDemo, Database } from './supabaseCompat';
import { generateFingerprint } from '../utils/fingerprint';

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
    if (isDemo) {
      throw new Error('RoomService should not be used in demo mode. Use MockRoomService instead.');
    }
    
    try {
      const defaultConfig = {
        timerDuration: 30,
        maxParticipants: 200,
        moderationEnabled: true,
        contentWarnings: true,
        ...config,
      };

      const { data, error } = await supabase!.rpc('create_session', {
        p_config: defaultConfig,
      });

      if (error) throw error;
      return { room: data, error: null };
    } catch (error) {
      console.error('Failed to create room:', error);
      return { room: null as any, error: error as Error };
    }
  }

  static async joinRoom(roomCode: string): Promise<{ participant: Participant; error: Error | null }> {
    if (isDemo) {
      throw new Error('RoomService should not be used in demo mode. Use MockRoomService instead.');
    }
    
    try {
      // First, check if room exists and is active
      const { data: session, error: sessionError } = await supabase!
        .from('sessions')
        .select('*')
        .eq('room_code', roomCode)
        .in('status', ['waiting', 'active'])
        .single();

      if (sessionError || !session) {
        throw new Error('Room not found or inactive');
      }

      // Check participant count
      const { count, error: countError } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', session.id)
        .eq('is_active', true);

      if (countError) throw countError;
      if (count && count >= session.config.maxParticipants) {
        throw new Error('Room is full');
      }

      // Generate fingerprint for this participant
      const fingerprint = generateFingerprint();

      // Check if participant already exists
      const { data: existingParticipant } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', session.id)
        .eq('fingerprint', fingerprint)
        .single();

      if (existingParticipant) {
        // Reactivate existing participant
        const { data: updatedParticipant, error: updateError } = await supabase
          .from('participants')
          .update({ is_active: true, joined_at: new Date().toISOString() })
          .eq('id', existingParticipant.id)
          .select()
          .single();

        if (updateError) throw updateError;
        return { participant: updatedParticipant, error: null };
      }

      // Create new participant
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .insert({
          session_id: session.id,
          fingerprint,
          user_agent: navigator.userAgent,
          is_active: true,
        })
        .select()
        .single();

      if (participantError) throw participantError;
      return { participant, error: null };
    } catch (error) {
      console.error('Failed to join room:', error);
      return { participant: null as any, error: error as Error };
    }
  }

  static async getRoomStatus(roomCode: string) {
    try {
      const { data, error } = await supabase
        .from('active_sessions')
        .select('*')
        .eq('room_code', roomCode)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  static async startScenario(sessionId: string, scenarioId: string) {
    try {
      // Mark current scenario as complete
      await supabase
        .from('session_scenarios')
        .update({ status: 'complete', ended_at: new Date().toISOString() })
        .eq('session_id', sessionId)
        .eq('status', 'active');

      // Start new scenario
      const { data, error } = await supabase
        .from('session_scenarios')
        .insert({
          session_id: sessionId,
          scenario_id: scenarioId,
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
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
    const startTime = Date.now();
    
    try {
      // Submit vote
      const { data: voteData, error: voteError } = await supabase
        .from('votes')
        .insert({
          session_id: sessionId,
          participant_id: participantId,
          scenario_id: scenarioId,
          vote,
          latency_ms: Date.now() - startTime,
        })
        .select()
        .single();

      if (voteError) throw voteError;

      // Submit rationale if provided
      if (rationale && rationale.trim()) {
        const { error: rationaleError } = await supabase
          .from('rationales')
          .insert({
            vote_id: voteData.id,
            original_text: rationale.trim(),
            processed_text: rationale.trim().toLowerCase(),
            word_count: rationale.trim().split(/\s+/).length,
          });

        if (rationaleError) throw rationaleError;
      }
      
      // Submit mitigation if provided
      if (mitigation && mitigation.trim()) {
        const { error: mitigationError } = await supabase
          .from('mitigations')
          .insert({
            vote_id: voteData.id,
            original_text: mitigation.trim(),
            processed_text: mitigation.trim().toLowerCase(),
            word_count: mitigation.trim().split(/\s+/).length,
          });

        if (mitigationError) {
          // If mitigations table doesn't exist, we can still continue
          console.warn('Could not save mitigation:', mitigationError);
        }
      }

      return { data: voteData, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  static async getVoteSummary(sessionId: string, scenarioId: string) {
    try {
      const { data, error } = await supabase
        .from('vote_summary')
        .select('*')
        .eq('session_id', sessionId)
        .eq('scenario_id', scenarioId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  static async getRationales(sessionId: string, scenarioId: string) {
    try {
      // Get all votes for this session and scenario
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('id, vote')
        .eq('session_id', sessionId)
        .eq('scenario_id', scenarioId);

      if (votesError) throw votesError;
      if (!votes || votes.length === 0) return { data: { pull: [], dont_pull: [] }, error: null };

      // Get rationales for these votes
      const voteIds = votes.map(v => v.id);
      const { data: rationales, error: rationalesError } = await supabase
        .from('rationales')
        .select('vote_id, original_text')
        .in('vote_id', voteIds);

      if (rationalesError) throw rationalesError;

      // Group rationales by vote type
      const groupedRationales = {
        pull: [] as string[],
        dont_pull: [] as string[]
      };

      votes.forEach(vote => {
        const voteRationales = rationales?.filter(r => r.vote_id === vote.id) || [];
        const voteType = vote.vote === 'pull' ? 'pull' : 'dont_pull';
        voteRationales.forEach(r => {
          if (r.original_text) {
            groupedRationales[voteType].push(r.original_text);
          }
        });
      });

      return { data: groupedRationales, error: null };
    } catch (error) {
      return { data: { pull: [], dont_pull: [] }, error: error as Error };
    }
  }

  static async getMitigations(sessionId: string, scenarioId: string) {
    try {
      // Get all votes for this session and scenario
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('id')
        .eq('session_id', sessionId)
        .eq('scenario_id', scenarioId);

      if (votesError) throw votesError;
      if (!votes || votes.length === 0) return { data: [], error: null };

      // Get mitigations for these votes
      const voteIds = votes.map(v => v.id);
      const { data: mitigations, error: mitigationsError } = await supabase
        .from('mitigations')
        .select('original_text')
        .in('vote_id', voteIds);

      if (mitigationsError) {
        console.warn('Mitigations table not found:', mitigationsError);
        return { data: [], error: null };
      }

      // Return array of mitigation texts
      const mitigationTexts = mitigations?.map(m => m.original_text) || [];
      return { data: mitigationTexts, error: null };
    } catch (error) {
      return { data: [], error: error as Error };
    }
  }

  static async endSession(sessionId: string) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .update({
          status: 'complete',
          ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  static async loadScenarios(difficulty?: 'beginner' | 'intermediate' | 'advanced') {
    try {
      let query = supabase
        .from('scenarios')
        .select('*')
        .eq('is_active', true);

      if (difficulty) {
        query = query.eq('difficulty_level', difficulty);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}