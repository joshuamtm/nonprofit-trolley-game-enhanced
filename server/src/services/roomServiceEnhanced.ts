import { db } from '../db';
import { sessions, participants, votes, rationales, mitigations, scenarios, sessionScenarios } from '../db/schema';
import { eq, and, inArray, sql, desc } from 'drizzle-orm';
import { AuthService } from './authService';
import { SanitizationService } from './sanitizationService';
import { resilientDatabase } from '../utils/resilience';
import type { NewSession, NewParticipant, NewVote, NewRationale, NewMitigation } from '../db/schema';
import winston from 'winston';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/room-service.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

export class RoomServiceEnhanced {
  /**
   * Create a room with secure code generation
   */
  static async createRoom(config: any = {}) {
    try {
      const defaultConfig = {
        timerDuration: 30,
        maxParticipants: 200,
        moderationEnabled: true,
        contentWarnings: true,
        ...config,
      };

      // Validate config
      if (defaultConfig.timerDuration < 10 || defaultConfig.timerDuration > 300) {
        throw new Error('Timer duration must be between 10 and 300 seconds');
      }
      if (defaultConfig.maxParticipants < 1 || defaultConfig.maxParticipants > 500) {
        throw new Error('Max participants must be between 1 and 500');
      }

      // Use transaction for room creation
      const room = await db.transaction(async (tx) => {
        let roomCode: string;
        let attempts = 0;
        const maxAttempts = 10;

        // Try to generate unique room code
        while (attempts < maxAttempts) {
          roomCode = AuthService.generateSecureRoomCode();
          
          // Check if code already exists
          const existing = await tx
            .select()
            .from(sessions)
            .where(eq(sessions.roomCode, roomCode));

          if (existing.length === 0) {
            // Create the room
            const [newRoom] = await tx
              .insert(sessions)
              .values({
                roomCode,
                config: defaultConfig,
                status: 'waiting',
              })
              .returning();

            logger.info(`Room created: ${roomCode}`);
            return newRoom;
          }

          attempts++;
        }

        throw new Error('Failed to generate unique room code');
      });

      return { room, error: null };
    } catch (error) {
      logger.error('Failed to create room:', error);
      return { room: null, error: error as Error };
    }
  }

  /**
   * Join room with enhanced security and validation
   */
  static async joinRoom(roomCode: string, fingerprint: string, userAgent?: string) {
    try {
      // Sanitize inputs
      const sanitizedRoomCode = SanitizationService.sanitizeRoomCode(roomCode);
      const sanitizedFingerprint = SanitizationService.sanitizeFingerprint(fingerprint);

      if (!sanitizedRoomCode || !sanitizedFingerprint) {
        throw new Error('Invalid room code or fingerprint');
      }

      // Use resilient database query
      const result = await resilientDatabase.query('join-room', async () => {
        return await db.transaction(async (tx) => {
          // Check if room exists and is active
          const [session] = await tx
            .select()
            .from(sessions)
            .where(
              and(
                eq(sessions.roomCode, sanitizedRoomCode),
                inArray(sessions.status, ['waiting', 'active'])
              )
            );

          if (!session) {
            throw new Error('Room not found or inactive');
          }

          // Check participant count
          const participantCount = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(participants)
            .where(
              and(
                eq(participants.sessionId, session.id),
                eq(participants.isActive, true)
              )
            );

          const config = session.config as any;
          if (participantCount[0].count >= config.maxParticipants) {
            throw new Error('Room is full');
          }

          // Check if participant already exists
          const [existingParticipant] = await tx
            .select()
            .from(participants)
            .where(
              and(
                eq(participants.sessionId, session.id),
                eq(participants.fingerprint, sanitizedFingerprint)
              )
            );

          if (existingParticipant) {
            // Reactivate existing participant
            const [updatedParticipant] = await tx
              .update(participants)
              .set({ 
                isActive: true, 
                joinedAt: new Date() 
              })
              .where(eq(participants.id, existingParticipant.id))
              .returning();

            logger.info(`Participant rejoined room ${sanitizedRoomCode}`);
            return { participant: updatedParticipant, session };
          }

          // Create new participant
          const [participant] = await tx
            .insert(participants)
            .values({
              sessionId: session.id,
              fingerprint: sanitizedFingerprint,
              userAgent: userAgent ? userAgent.substring(0, 500) : null,
              isActive: true,
            })
            .returning();

          logger.info(`New participant joined room ${sanitizedRoomCode}`);
          return { participant, session };
        });
      });

      return { ...result, error: null };
    } catch (error) {
      logger.error('Failed to join room:', error);
      return { participant: null, session: null, error: error as Error };
    }
  }

  /**
   * Submit vote with transaction and sanitization
   */
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
      // Validate vote value
      if (!['pull', 'dont_pull'].includes(vote)) {
        throw new Error('Invalid vote value');
      }

      // Sanitize text inputs
      const sanitizedRationale = rationale 
        ? SanitizationService.sanitizeRationale(rationale) 
        : undefined;
      const sanitizedMitigation = mitigation 
        ? SanitizationService.sanitizeMitigation(mitigation) 
        : undefined;

      // Use transaction for atomic vote submission
      const voteData = await db.transaction(async (tx) => {
        // Check if participant has already voted for this scenario
        const existingVote = await tx
          .select()
          .from(votes)
          .where(
            and(
              eq(votes.sessionId, sessionId),
              eq(votes.participantId, participantId),
              eq(votes.scenarioId, scenarioId)
            )
          );

        if (existingVote.length > 0) {
          throw new Error('Participant has already voted for this scenario');
        }

        // Submit vote
        const [newVote] = await tx
          .insert(votes)
          .values({
            sessionId,
            participantId,
            scenarioId,
            vote,
            latencyMs: Date.now() - startTime,
          })
          .returning();

        // Submit rationale if provided
        if (sanitizedRationale && sanitizedRationale.trim()) {
          await tx.insert(rationales).values({
            voteId: newVote.id,
            originalText: sanitizedRationale.trim(),
            processedText: sanitizedRationale.trim().toLowerCase(),
            wordCount: sanitizedRationale.trim().split(/\s+/).length,
            moderated: false,
          });
        }
        
        // Submit mitigation if provided
        if (sanitizedMitigation && sanitizedMitigation.trim()) {
          await tx.insert(mitigations).values({
            voteId: newVote.id,
            originalText: sanitizedMitigation.trim(),
            processedText: sanitizedMitigation.trim().toLowerCase(),
            wordCount: sanitizedMitigation.trim().split(/\s+/).length,
            moderated: false,
          });
        }

        logger.info(`Vote submitted for scenario ${scenarioId}`);
        return newVote;
      });

      return { data: voteData, error: null };
    } catch (error) {
      logger.error('Failed to submit vote:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get vote summary with optimized query
   */
  static async getVoteSummary(sessionId: string, scenarioId: string) {
    try {
      const result = await resilientDatabase.query('vote-summary', async () => {
        // Single optimized query with aggregation
        const summary = await db
          .select({
            vote: votes.vote,
            count: sql<number>`count(*)::int`,
            avgLatency: sql<number>`avg(${votes.latencyMs})::int`,
            rationales: sql<string[]>`
              array_agg(
                DISTINCT ${rationales.originalText}
              ) FILTER (WHERE ${rationales.originalText} IS NOT NULL)
            `,
          })
          .from(votes)
          .leftJoin(rationales, eq(rationales.voteId, votes.id))
          .where(
            and(
              eq(votes.sessionId, sessionId),
              eq(votes.scenarioId, scenarioId)
            )
          )
          .groupBy(votes.vote);

        // Process results
        const result = {
          totalVotes: 0,
          pullVotes: 0,
          dontPullVotes: 0,
          avgLatencyMs: 0,
          rationales: {
            pull: [] as string[],
            dont_pull: [] as string[]
          }
        };

        summary.forEach(row => {
          const count = Number(row.count);
          result.totalVotes += count;
          
          if (row.vote === 'pull') {
            result.pullVotes = count;
            result.rationales.pull = row.rationales || [];
          } else {
            result.dontPullVotes = count;
            result.rationales.dont_pull = row.rationales || [];
          }
          
          result.avgLatencyMs = Number(row.avgLatency) || 0;
        });

        return result;
      });

      return { data: result, error: null };
    } catch (error) {
      logger.error('Failed to get vote summary:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * End session with cleanup
   */
  static async endSession(sessionId: string) {
    try {
      const data = await db.transaction(async (tx) => {
        // Update session status
        const [updatedSession] = await tx
          .update(sessions)
          .set({
            status: 'complete',
            endedAt: new Date(),
          })
          .where(eq(sessions.id, sessionId))
          .returning();

        // Mark all participants as inactive
        await tx
          .update(participants)
          .set({
            isActive: false,
            leftAt: new Date(),
          })
          .where(eq(participants.sessionId, sessionId));

        // Mark all scenarios as complete
        await tx
          .update(sessionScenarios)
          .set({
            status: 'complete',
            endedAt: new Date(),
          })
          .where(eq(sessionScenarios.sessionId, sessionId));

        logger.info(`Session ${sessionId} ended`);
        return updatedSession;
      });

      return { data, error: null };
    } catch (error) {
      logger.error('Failed to end session:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Load scenarios with caching consideration
   */
  static async loadScenarios(difficulty?: 'beginner' | 'intermediate' | 'advanced') {
    try {
      const result = await resilientDatabase.query('load-scenarios', async () => {
        let query = db
          .select()
          .from(scenarios)
          .where(eq(scenarios.isActive, true));

        if (difficulty && ['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
          query = query.where(eq(scenarios.difficultyLevel, difficulty));
        }

        return await query;
      }, {
        circuitBreaker: {
          timeout: 5000,
          errorThresholdPercentage: 20,
        }
      });

      return { data: result, error: null };
    } catch (error) {
      logger.error('Failed to load scenarios:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get active participant count with optimized query
   */
  static async getActiveParticipantCount(sessionId: string): Promise<number> {
    try {
      const result = await resilientDatabase.query('participant-count', async () => {
        const [row] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(participants)
          .where(
            and(
              eq(participants.sessionId, sessionId),
              eq(participants.isActive, true)
            )
          );
        
        return Number(row.count);
      });

      return result;
    } catch (error) {
      logger.error('Failed to get participant count:', error);
      return 0;
    }
  }

  /**
   * Clean up stale sessions
   */
  static async cleanupStaleSessions() {
    try {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      const result = await db.transaction(async (tx) => {
        // Find stale sessions
        const staleSessions = await tx
          .select({ id: sessions.id })
          .from(sessions)
          .where(
            and(
              inArray(sessions.status, ['waiting', 'active']),
              sql`${sessions.createdAt} < ${cutoffTime}`
            )
          );

        if (staleSessions.length > 0) {
          const sessionIds = staleSessions.map(s => s.id);
          
          // Mark sessions as cancelled
          await tx
            .update(sessions)
            .set({
              status: 'cancelled',
              endedAt: new Date(),
            })
            .where(inArray(sessions.id, sessionIds));

          // Mark participants as inactive
          await tx
            .update(participants)
            .set({
              isActive: false,
              leftAt: new Date(),
            })
            .where(inArray(participants.sessionId, sessionIds));

          logger.info(`Cleaned up ${staleSessions.length} stale sessions`);
        }

        return staleSessions.length;
      });

      return result;
    } catch (error) {
      logger.error('Failed to cleanup stale sessions:', error);
      return 0;
    }
  }
}