import { socketService, type RealtimeEvents, type RealtimeEventType } from './socket';

export { RealtimeEvents, RealtimeEventType } from './socket';

export class RealtimeServiceNew {
  private sessionId: string | null = null;
  private participantId: string | null = null;

  constructor() {
    // Initialize socket connection
    socketService.connect();
  }

  async joinRoom(sessionId: string, participantId: string): Promise<void> {
    this.sessionId = sessionId;
    this.participantId = participantId;
    await socketService.joinRoom(sessionId, participantId);
  }

  async leaveRoom(): Promise<void> {
    await socketService.leaveRoom();
    this.sessionId = null;
    this.participantId = null;
  }

  on<T extends RealtimeEventType>(
    event: T,
    callback: (data: RealtimeEvents[T]) => void
  ): void {
    socketService.on(event, callback);
  }

  off<T extends RealtimeEventType>(
    event: T,
    callback: (data: RealtimeEvents[T]) => void
  ): void {
    socketService.off(event, callback);
  }

  async broadcast<T extends RealtimeEventType>(
    event: T,
    payload: RealtimeEvents[T]
  ): Promise<void> {
    socketService.emit(event, payload);
  }

  startTimer(duration: number): void {
    if (!this.sessionId) {
      throw new Error('Not connected to room');
    }
    
    // Assuming current scenario ID is available in the game state
    // This would need to be passed in or retrieved from store
    const scenarioId = 'current-scenario-id'; // TODO: Get from game state
    socketService.startTimer(this.sessionId, scenarioId, duration);
  }

  startScenario(scenarioId: string, scenarioTitle: string): void {
    if (!this.sessionId) {
      throw new Error('Not connected to room');
    }
    
    socketService.startScenario(this.sessionId, scenarioId, scenarioTitle);
  }

  announceDecision(
    scenarioId: string,
    decision: 'ai_track' | 'non_ai_track' | 'tie',
    pullCount: number,
    dontPullCount: number,
    totalVotes: number
  ): void {
    if (!this.sessionId) {
      throw new Error('Not connected to room');
    }
    
    socketService.announceDecision(
      this.sessionId,
      scenarioId,
      decision,
      pullCount,
      dontPullCount,
      totalVotes
    );
  }

  endSession(roomCode: string): void {
    if (!this.sessionId) {
      throw new Error('Not connected to room');
    }
    
    socketService.endSession(this.sessionId, roomCode);
  }
}

// Singleton instance
export const realtimeServiceNew = new RealtimeServiceNew();