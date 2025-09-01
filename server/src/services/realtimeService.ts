import { Server as SocketServer, Socket } from 'socket.io';
import { Server } from 'http';
import { RoomService } from './roomService';

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

export class RealtimeService {
  private io: SocketServer;
  private sessionTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(server: Server) {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on('join_room', async (data: { sessionId: string; participantId: string }) => {
        const { sessionId, participantId } = data;
        
        // Join the room
        socket.join(`room:${sessionId}`);
        socket.data.sessionId = sessionId;
        socket.data.participantId = participantId;

        // Get room status
        const activeCount = await RoomService.getActiveParticipantCount(sessionId);
        
        // Broadcast participant joined event
        this.io.to(`room:${sessionId}`).emit('participant_joined', {
          participant_id: participantId,
          room_code: sessionId,
          active_count: activeCount,
        });
      });

      socket.on('leave_room', async () => {
        const { sessionId, participantId } = socket.data;
        if (sessionId && participantId) {
          socket.leave(`room:${sessionId}`);
          
          const activeCount = await RoomService.getActiveParticipantCount(sessionId);
          
          // Broadcast participant left event
          this.io.to(`room:${sessionId}`).emit('participant_left', {
            participant_id: participantId,
            room_code: sessionId,
            active_count: activeCount,
          });
        }
      });

      socket.on('start_timer', (data: { sessionId: string; scenarioId: string; duration: number }) => {
        const { sessionId, scenarioId, duration } = data;
        
        // Clear any existing timer
        const existingTimer = this.sessionTimers.get(`${sessionId}-${scenarioId}`);
        if (existingTimer) {
          clearInterval(existingTimer);
        }

        // Start new timer
        let secondsRemaining = duration;
        const startTime = new Date().toISOString();

        // Emit timer started event
        this.io.to(`room:${sessionId}`).emit('timer_started', {
          session_id: sessionId,
          scenario_id: scenarioId,
          duration,
          start_time: startTime,
        });

        // Start countdown
        const timer = setInterval(() => {
          secondsRemaining--;
          
          this.io.to(`room:${sessionId}`).emit('timer_tick', {
            session_id: sessionId,
            scenario_id: scenarioId,
            seconds_remaining: secondsRemaining,
          });

          if (secondsRemaining <= 0) {
            clearInterval(timer);
            this.sessionTimers.delete(`${sessionId}-${scenarioId}`);
          }
        }, 1000);

        this.sessionTimers.set(`${sessionId}-${scenarioId}`, timer);
      });

      socket.on('start_scenario', (data: { sessionId: string; scenarioId: string; scenarioTitle: string }) => {
        const { sessionId, scenarioId, scenarioTitle } = data;
        
        this.io.to(`room:${sessionId}`).emit('scenario_started', {
          session_id: sessionId,
          scenario_id: scenarioId,
          scenario_title: scenarioTitle,
        });
      });

      socket.on('announce_decision', (data: {
        sessionId: string;
        scenarioId: string;
        decision: 'ai_track' | 'non_ai_track' | 'tie';
        pullCount: number;
        dontPullCount: number;
        totalVotes: number;
      }) => {
        const { sessionId, scenarioId, decision, pullCount, dontPullCount, totalVotes } = data;
        
        this.io.to(`room:${sessionId}`).emit('decision_announced', {
          session_id: sessionId,
          scenario_id: scenarioId,
          decision,
          pull_count: pullCount,
          dont_pull_count: dontPullCount,
          total_votes: totalVotes,
        });
      });

      socket.on('end_session', (data: { sessionId: string; roomCode: string }) => {
        const { sessionId, roomCode } = data;
        
        // Clear any timers for this session
        this.sessionTimers.forEach((timer, key) => {
          if (key.startsWith(sessionId)) {
            clearInterval(timer);
            this.sessionTimers.delete(key);
          }
        });

        this.io.to(`room:${sessionId}`).emit('session_ended', {
          session_id: sessionId,
          room_code: roomCode,
        });
      });

      socket.on('disconnect', async () => {
        console.log(`Client disconnected: ${socket.id}`);
        
        const { sessionId, participantId } = socket.data;
        if (sessionId && participantId) {
          const activeCount = await RoomService.getActiveParticipantCount(sessionId);
          
          // Broadcast participant left event
          this.io.to(`room:${sessionId}`).emit('participant_left', {
            participant_id: participantId,
            room_code: sessionId,
            active_count: activeCount,
          });
        }
      });
    });
  }

  public broadcastVoteCast(sessionId: string, data: RealtimeEvents['vote_cast']) {
    this.io.to(`room:${sessionId}`).emit('vote_cast', data);
  }

  public broadcastRationaleAdded(sessionId: string, data: RealtimeEvents['rationale_added']) {
    this.io.to(`room:${sessionId}`).emit('rationale_added', data);
  }
}