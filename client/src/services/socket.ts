import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

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

export class SocketService {
  private socket: Socket | null = null;
  private sessionId: string | null = null;
  private participantId: string | null = null;
  private callbacks: Map<string, Set<(data: any) => void>> = new Map();

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.sessionId = null;
    this.participantId = null;
    this.callbacks.clear();
  }

  async joinRoom(sessionId: string, participantId: string): Promise<void> {
    if (!this.socket) {
      this.connect();
    }

    this.sessionId = sessionId;
    this.participantId = participantId;

    return new Promise((resolve) => {
      this.socket!.emit('join_room', { sessionId, participantId });
      resolve();
    });
  }

  async leaveRoom(): Promise<void> {
    if (!this.socket) {
      return;
    }

    return new Promise((resolve) => {
      this.socket!.emit('leave_room');
      this.sessionId = null;
      this.participantId = null;
      resolve();
    });
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

  emit<T extends RealtimeEventType>(
    event: T,
    data: RealtimeEvents[T]
  ): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit(event, data);
  }

  startTimer(sessionId: string, scenarioId: string, duration: number): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('start_timer', { sessionId, scenarioId, duration });
  }

  startScenario(sessionId: string, scenarioId: string, scenarioTitle: string): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('start_scenario', { sessionId, scenarioId, scenarioTitle });
  }

  announceDecision(
    sessionId: string,
    scenarioId: string,
    decision: 'ai_track' | 'non_ai_track' | 'tie',
    pullCount: number,
    dontPullCount: number,
    totalVotes: number
  ): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('announce_decision', {
      sessionId,
      scenarioId,
      decision,
      pullCount,
      dontPullCount,
      totalVotes,
    });
  }

  endSession(sessionId: string, roomCode: string): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('end_session', { sessionId, roomCode });
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Register all event types
    const eventTypes: RealtimeEventType[] = [
      'participant_joined',
      'participant_left',
      'vote_cast',
      'rationale_added',
      'timer_started',
      'timer_tick',
      'scenario_started',
      'session_ended',
      'decision_announced',
    ];

    eventTypes.forEach(eventType => {
      this.socket!.on(eventType, (data: any) => {
        const callbacks = this.callbacks.get(eventType);
        if (callbacks) {
          callbacks.forEach(callback => callback(data));
        }
      });
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      
      // Rejoin room if we were in one
      if (this.sessionId && this.participantId) {
        this.joinRoom(this.sessionId, this.participantId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }
}

// Singleton instance
export const socketService = new SocketService();