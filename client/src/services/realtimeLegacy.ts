// Legacy Supabase realtime implementation - replaced with Socket.io
// This is a stub to maintain compatibility during migration

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
  private sessionId: string | null = null;
  private callbacks: Map<string, Set<(data: any) => void>> = new Map();

  async joinRoom(sessionId: string): Promise<void> {
    this.sessionId = sessionId;
    console.warn('Legacy realtime service - please use Socket.io implementation');
  }

  async leaveRoom(): Promise<void> {
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
    console.warn('Broadcast not available in legacy mode');
  }

  private handleEvent(event: string, data: any): void {
    const callbacks = this.callbacks.get(event as RealtimeEventType);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

// Singleton instance
export const realtimeService = new RealtimeService();