import { Server as SocketServer, Socket } from 'socket.io';
import { Server } from 'http';
import { RoomService } from './roomService';
import { AuthService } from './authService';
import { SanitizationService } from './sanitizationService';
import winston from 'winston';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/socket-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/socket-combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

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

export class RealtimeServiceSecure {
  private io: SocketServer;
  private sessionTimers: Map<string, NodeJS.Timeout> = new Map();
  private connectionAttempts: Map<string, number> = new Map();
  private blockedIPs: Set<string> = new Set();

  constructor(server: Server) {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      // Limit payload size to prevent DoS
      maxHttpBufferSize: 1e6, // 1MB
      // Ping timeout settings
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupAuthentication();
    this.setupHandlers();
    this.startCleanupInterval();
  }

  private setupAuthentication() {
    // Authentication middleware for Socket.io
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const clientIP = this.getClientIP(socket);

        // Check if IP is blocked
        if (this.blockedIPs.has(clientIP)) {
          logger.warn(`Blocked connection attempt from IP: ${clientIP}`);
          return next(new Error('Access denied'));
        }

        // Rate limit connection attempts
        const attempts = this.connectionAttempts.get(clientIP) || 0;
        if (attempts > 10) {
          this.blockedIPs.add(clientIP);
          logger.error(`Blocking IP due to too many attempts: ${clientIP}`);
          return next(new Error('Too many connection attempts'));
        }
        this.connectionAttempts.set(clientIP, attempts + 1);

        // Verify token
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = AuthService.verifyToken(token);
        
        // Store authenticated data in socket
        socket.data.sessionId = decoded.sessionId;
        socket.data.participantId = decoded.participantId;
        socket.data.fingerprint = decoded.fingerprint;
        socket.data.roomCode = decoded.roomCode;
        socket.data.authenticated = true;

        logger.info(`Socket authenticated for participant ${decoded.participantId}`);
        next();
      } catch (error) {
        logger.error('Socket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupHandlers() {
    this.io.on('connection', (socket: Socket) => {
      const clientIP = this.getClientIP(socket);
      logger.info(`Client connected: ${socket.id} from IP: ${clientIP}`);

      // Automatically join the authenticated room
      const { sessionId, participantId, roomCode } = socket.data;
      if (sessionId && participantId) {
        socket.join(`room:${sessionId}`);
        this.handleParticipantJoined(sessionId, participantId, roomCode);
      }

      socket.on('join_room', async (data: { sessionId: string; participantId: string }) => {
        try {
          // Validate that the user can only join their authenticated room
          if (data.sessionId !== socket.data.sessionId || 
              data.participantId !== socket.data.participantId) {
            socket.emit('error', { message: 'Unauthorized room access' });
            return;
          }

          const { sessionId, participantId } = data;
          
          // Sanitize inputs
          const sanitizedSessionId = SanitizationService.sanitizeFingerprint(sessionId);
          const sanitizedParticipantId = SanitizationService.sanitizeFingerprint(participantId);
          
          // Join the room
          socket.join(`room:${sanitizedSessionId}`);
          
          await this.handleParticipantJoined(sanitizedSessionId, sanitizedParticipantId, socket.data.roomCode);
        } catch (error) {
          logger.error('Error joining room:', error);
          socket.emit('error', { message: 'Failed to join room' });
        }
      });

      socket.on('leave_room', async () => {
        try {
          const { sessionId, participantId, roomCode } = socket.data;
          if (sessionId && participantId) {
            socket.leave(`room:${sessionId}`);
            await this.handleParticipantLeft(sessionId, participantId, roomCode);
          }
        } catch (error) {
          logger.error('Error leaving room:', error);
        }
      });

      socket.on('start_timer', (data: { sessionId: string; scenarioId: string; duration: number }) => {
        try {
          // Validate authorization (only facilitator can start timer)
          if (data.sessionId !== socket.data.sessionId) {
            socket.emit('error', { message: 'Unauthorized action' });
            return;
          }

          const { sessionId, scenarioId, duration } = data;
          
          // Validate duration
          if (duration < 10 || duration > 300) {
            socket.emit('error', { message: 'Invalid timer duration' });
            return;
          }

          this.startTimer(sessionId, scenarioId, duration);
        } catch (error) {
          logger.error('Error starting timer:', error);
          socket.emit('error', { message: 'Failed to start timer' });
        }
      });

      socket.on('start_scenario', (data: { sessionId: string; scenarioId: string; scenarioTitle: string }) => {
        try {
          // Validate authorization
          if (data.sessionId !== socket.data.sessionId) {
            socket.emit('error', { message: 'Unauthorized action' });
            return;
          }

          const { sessionId, scenarioId } = data;
          const scenarioTitle = SanitizationService.sanitizeText(data.scenarioTitle, { stripHtml: true });
          
          this.io.to(`room:${sessionId}`).emit('scenario_started', {
            session_id: sessionId,
            scenario_id: scenarioId,
            scenario_title: scenarioTitle,
          });
        } catch (error) {
          logger.error('Error starting scenario:', error);
          socket.emit('error', { message: 'Failed to start scenario' });
        }
      });

      socket.on('announce_decision', (data: {
        sessionId: string;
        scenarioId: string;
        decision: 'ai_track' | 'non_ai_track' | 'tie';
        pullCount: number;
        dontPullCount: number;
        totalVotes: number;
      }) => {
        try {
          // Validate authorization
          if (data.sessionId !== socket.data.sessionId) {
            socket.emit('error', { message: 'Unauthorized action' });
            return;
          }

          const { sessionId, scenarioId, decision, pullCount, dontPullCount, totalVotes } = data;
          
          // Validate decision value
          if (!['ai_track', 'non_ai_track', 'tie'].includes(decision)) {
            socket.emit('error', { message: 'Invalid decision value' });
            return;
          }

          this.io.to(`room:${sessionId}`).emit('decision_announced', {
            session_id: sessionId,
            scenario_id: scenarioId,
            decision,
            pull_count: Math.max(0, pullCount),
            dont_pull_count: Math.max(0, dontPullCount),
            total_votes: Math.max(0, totalVotes),
          });
        } catch (error) {
          logger.error('Error announcing decision:', error);
          socket.emit('error', { message: 'Failed to announce decision' });
        }
      });

      socket.on('end_session', (data: { sessionId: string; roomCode: string }) => {
        try {
          // Validate authorization
          if (data.sessionId !== socket.data.sessionId) {
            socket.emit('error', { message: 'Unauthorized action' });
            return;
          }

          const { sessionId } = data;
          const roomCode = SanitizationService.sanitizeRoomCode(data.roomCode);
          
          // Clear any timers for this session
          this.clearSessionTimers(sessionId);

          this.io.to(`room:${sessionId}`).emit('session_ended', {
            session_id: sessionId,
            room_code: roomCode,
          });
        } catch (error) {
          logger.error('Error ending session:', error);
          socket.emit('error', { message: 'Failed to end session' });
        }
      });

      socket.on('disconnect', async () => {
        try {
          logger.info(`Client disconnected: ${socket.id}`);
          
          const { sessionId, participantId, roomCode } = socket.data;
          if (sessionId && participantId) {
            await this.handleParticipantLeft(sessionId, participantId, roomCode);
          }
        } catch (error) {
          logger.error('Error handling disconnect:', error);
        }
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  private async handleParticipantJoined(sessionId: string, participantId: string, roomCode: string) {
    try {
      const activeCount = await RoomService.getActiveParticipantCount(sessionId);
      
      this.io.to(`room:${sessionId}`).emit('participant_joined', {
        participant_id: participantId,
        room_code: roomCode,
        active_count: activeCount,
      });

      logger.info(`Participant ${participantId} joined room ${roomCode}`);
    } catch (error) {
      logger.error('Error handling participant joined:', error);
    }
  }

  private async handleParticipantLeft(sessionId: string, participantId: string, roomCode: string) {
    try {
      const activeCount = await RoomService.getActiveParticipantCount(sessionId);
      
      this.io.to(`room:${sessionId}`).emit('participant_left', {
        participant_id: participantId,
        room_code: roomCode,
        active_count: activeCount,
      });

      logger.info(`Participant ${participantId} left room ${roomCode}`);
    } catch (error) {
      logger.error('Error handling participant left:', error);
    }
  }

  private startTimer(sessionId: string, scenarioId: string, duration: number) {
    const timerKey = `${sessionId}-${scenarioId}`;
    
    // Clear any existing timer
    const existingTimer = this.sessionTimers.get(timerKey);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

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
      
      // Use volatile emit for non-critical timer ticks
      this.io.to(`room:${sessionId}`).volatile.emit('timer_tick', {
        session_id: sessionId,
        scenario_id: scenarioId,
        seconds_remaining: secondsRemaining,
      });

      if (secondsRemaining <= 0) {
        clearInterval(timer);
        this.sessionTimers.delete(timerKey);
      }
    }, 1000);

    this.sessionTimers.set(timerKey, timer);
  }

  private clearSessionTimers(sessionId: string) {
    this.sessionTimers.forEach((timer, key) => {
      if (key.startsWith(sessionId)) {
        clearInterval(timer);
        this.sessionTimers.delete(key);
      }
    });
  }

  private getClientIP(socket: Socket): string {
    return socket.handshake.headers['x-forwarded-for']?.toString().split(',')[0] || 
           socket.handshake.address || 
           'unknown';
  }

  private startCleanupInterval() {
    // Clean up connection attempts map every hour
    setInterval(() => {
      this.connectionAttempts.clear();
      logger.info('Cleared connection attempts map');
    }, 3600000);

    // Clear blocked IPs every 24 hours
    setInterval(() => {
      this.blockedIPs.clear();
      logger.info('Cleared blocked IPs');
    }, 86400000);
  }

  public broadcastVoteCast(sessionId: string, data: RealtimeEvents['vote_cast']) {
    // Sanitize the rationale if it exists in the data
    this.io.to(`room:${sessionId}`).emit('vote_cast', data);
  }

  public broadcastRationaleAdded(sessionId: string, data: RealtimeEvents['rationale_added']) {
    // Sanitize the rationale text before broadcasting
    const sanitizedData = {
      ...data,
      rationale: SanitizationService.sanitizeRationale(data.rationale)
    };
    this.io.to(`room:${sessionId}`).emit('rationale_added', sanitizedData);
  }

  public getConnectedSockets(): number {
    return this.io.sockets.sockets.size;
  }

  public disconnectSocket(socketId: string): void {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.disconnect(true);
    }
  }
}