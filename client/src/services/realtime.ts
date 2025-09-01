import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeEvents {
  participant_joined: {
    participant_id: string;
    room_code: string;
    active_count: number;
  };
  participant_left: {
    participant_id: string;
    room_code: string;
    active_count: number;
  };
  vote_cast: {
    session_id: string;
    scenario_id: string;
    vote: 'pull' | 'dont_pull';
    total_votes: number;
    pull_votes: number;
    dont_pull_votes: number;
  };
  rationale_added: {
    session_id: string;
    scenario_id: string;
    vote: 'pull' | 'dont_pull';
    rationale: string;
    participant_id: string;
  };
  timer_started: {
    session_id: string;
    scenario_id: string;
    duration: number;
    start_time: string;
  };
  timer_tick: {
    session_id: string;
    scenario_id: string;
    seconds_remaining: number;
  };
  scenario_started: {
    session_id: string;
    scenario_id: string;
    scenario_title: string;
  };
  session_ended: {
    session_id: string;
    room_code: string;
  };
  decision_announced: {
    session_id: string;
    scenario_id: string;
    decision: 'ai_track' | 'non_ai_track' | 'tie';
    pull_count: number;
    dont_pull_count: number;
    total_votes: number;
  };
}

export type RealtimeEventType = keyof RealtimeEvents;

export class RealtimeService {
  private channel: RealtimeChannel | null = null;
  private sessionId: string | null = null;
  private callbacks: Map<string, Set<(data: any) => void>> = new Map();

  async joinRoom(sessionId: string): Promise<void> {
    this.sessionId = sessionId;
    this.channel = supabase.channel(`room:${sessionId}`);

    // Subscribe to all realtime events for this session
    this.channel
      .on('broadcast', { event: '*' }, (payload) => {
        this.handleEvent(payload.event, payload.payload);
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'votes',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        this.handleVoteInsert(payload.new as any);
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'participants',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        this.handleParticipantInsert(payload.new as any);
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'participants',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        this.handleParticipantUpdate(payload.new as any);
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'session_scenarios',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        this.handleSessionScenarioInsert(payload.new as any);
      });

    await this.channel.subscribe();
  }

  async leaveRoom(): Promise<void> {
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }
    this.sessionId = null;
    this.callbacks.clear();
  }

  on<T extends RealtimeEventType>(
    event: T,
    callback: (data: RealtimeEvents[T]) => void
  ): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, new Set());
    }
    this.callbacks.get(event)!.add(callback);
  }

  off<T extends RealtimeEventType>(
    event: T,
    callback: (data: RealtimeEvents[T]) => void
  ): void {
    const eventCallbacks = this.callbacks.get(event);
    if (eventCallbacks) {
      eventCallbacks.delete(callback);
    }
  }

  async broadcast<T extends RealtimeEventType>(
    event: T,
    payload: RealtimeEvents[T]
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to room');
    }

    await this.channel.send({
      type: 'broadcast',
      event,
      payload,
    });
  }

  private handleEvent(event: string, data: any): void {
    const callbacks = this.callbacks.get(event as RealtimeEventType);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  private async handleVoteInsert(vote: any): Promise<void> {
    // Get updated vote summary
    const { data: summary } = await supabase
      .from('vote_summary')
      .select('*')
      .eq('session_id', vote.session_id)
      .eq('scenario_id', vote.scenario_id)
      .single();

    if (summary) {
      this.handleEvent('vote_cast', {
        session_id: vote.session_id,
        scenario_id: vote.scenario_id,
        vote: vote.vote,
        total_votes: summary.total_votes,
        pull_votes: summary.pull_votes,
        dont_pull_votes: summary.dont_pull_votes,
      });
    }
  }

  private async handleParticipantInsert(participant: any): Promise<void> {
    // Get active participant count
    const { count } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', participant.session_id)
      .eq('is_active', true);

    // Get room code
    const { data: session } = await supabase
      .from('sessions')
      .select('room_code')
      .eq('id', participant.session_id)
      .single();

    if (session && count !== null) {
      this.handleEvent('participant_joined', {
        participant_id: participant.id,
        room_code: session.room_code,
        active_count: count,
      });
    }
  }

  private async handleParticipantUpdate(participant: any): Promise<void> {
    if (!participant.is_active) {
      // Participant left
      const { count } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', participant.session_id)
        .eq('is_active', true);

      const { data: session } = await supabase
        .from('sessions')
        .select('room_code')
        .eq('id', participant.session_id)
        .single();

      if (session && count !== null) {
        this.handleEvent('participant_left', {
          participant_id: participant.id,
          room_code: session.room_code,
          active_count: count,
        });
      }
    }
  }

  private async handleSessionScenarioInsert(sessionScenario: any): Promise<void> {
    if (sessionScenario.status === 'active') {
      // New scenario started - emit scenario_started event
      this.handleEvent('scenario_started', {
        session_id: sessionScenario.session_id,
        scenario_id: sessionScenario.scenario_id,
        scenario_title: '', // We'll fetch this if needed
      });
    }
  }
}

// Singleton instance
export const realtimeService = new RealtimeService();