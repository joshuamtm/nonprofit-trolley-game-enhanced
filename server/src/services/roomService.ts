import { db } from '../db';
import { sessions, participants, votes, rationales, mitigations, scenarios, sessionScenarios } from '../db/schema';
import { eq, and, inArray, sql, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { NewSession, NewParticipant, NewVote, NewRationale, NewMitigation } from '../db/schema';

export class RoomService {
  static generateRoomCode(): string {
    return nanoid(6).toUpperCase();
  }

  static async createRoom(config: any = {}) {
    try {
      const defaultConfig = {
        timerDuration: 30,
        maxParticipants: 200,
        moderationEnabled: true,
        contentWarnings: true,
        ...config,
      };

      const roomCode = this.generateRoomCode();
      
      const [room] = await db.insert(sessions).values({
        roomCode,
        config: defaultConfig,
        status: 'waiting',
      }).returning();

      return { room, error: null };
    } catch (error) {
      console.error('Failed to create room:', error);
      return { room: null, error: error as Error };
    }
  }

  static async joinRoom(roomCode: string, fingerprint: string, userAgent?: string) {
    try {
      // Check if room exists and is active
      const [session] = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.roomCode, roomCode),
            inArray(sessions.status, ['waiting', 'active'])
          )
        );

      if (!session) {
        throw new Error('Room not found or inactive');
      }

      // Check participant count
      const participantCount = await db
        .select({ count: sql<number>`count(*)` })
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
      const [existingParticipant] = await db
        .select()
        .from(participants)
        .where(
          and(
            eq(participants.sessionId, session.id),
            eq(participants.fingerprint, fingerprint)
          )
        );

      if (existingParticipant) {
        // Reactivate existing participant
        const [updatedParticipant] = await db
          .update(participants)
          .set({ 
            isActive: true, 
            joinedAt: new Date() 
          })
          .where(eq(participants.id, existingParticipant.id))
          .returning();

        return { participant: updatedParticipant, session, error: null };
      }

      // Create new participant
      const [participant] = await db
        .insert(participants)
        .values({
          sessionId: session.id,
          fingerprint,
          userAgent,
          isActive: true,
        })
        .returning();

      return { participant, session, error: null };
    } catch (error) {
      console.error('Failed to join room:', error);
      return { participant: null, session: null, error: error as Error };
    }
  }

  static async getRoomStatus(roomCode: string) {
    try {
      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.roomCode, roomCode));

      if (!session) {
        throw new Error('Room not found');
      }

      const participantCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(participants)
        .where(
          and(
            eq(participants.sessionId, session.id),
            eq(participants.isActive, true)
          )
        );

      return { 
        data: {
          ...session,
          activeParticipants: participantCount[0].count
        }, 
        error: null 
      };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  static async startScenario(sessionId: string, scenarioId: string) {
    try {
      // Mark current scenario as complete
      await db
        .update(sessionScenarios)
        .set({ 
          status: 'complete', 
          endedAt: new Date() 
        })
        .where(
          and(
            eq(sessionScenarios.sessionId, sessionId),
            eq(sessionScenarios.status, 'active')
          )
        );

      // Start new scenario
      const [data] = await db
        .insert(sessionScenarios)
        .values({
          sessionId,
          scenarioId,
          status: 'active',
          startedAt: new Date(),
        })
        .returning();

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
      const [voteData] = await db
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
      if (rationale && rationale.trim()) {
        await db.insert(rationales).values({
          voteId: voteData.id,
          originalText: rationale.trim(),
          processedText: rationale.trim().toLowerCase(),
          wordCount: rationale.trim().split(/\s+/).length,
        });
      }
      
      // Submit mitigation if provided
      if (mitigation && mitigation.trim()) {
        await db.insert(mitigations).values({
          voteId: voteData.id,
          originalText: mitigation.trim(),
          processedText: mitigation.trim().toLowerCase(),
          wordCount: mitigation.trim().split(/\s+/).length,
        });
      }

      return { data: voteData, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  static async getVoteSummary(sessionId: string, scenarioId: string) {
    try {
      const voteResults = await db
        .select({
          vote: votes.vote,
          count: sql<number>`count(*)`,
          avgLatency: sql<number>`avg(${votes.latencyMs})`,
        })
        .from(votes)
        .where(
          and(
            eq(votes.sessionId, sessionId),
            eq(votes.scenarioId, scenarioId)
          )
        )
        .groupBy(votes.vote);

      const summary = {
        totalVotes: 0,
        pullVotes: 0,
        dontPullVotes: 0,
        avgLatencyMs: 0,
      };

      voteResults.forEach(result => {
        const count = Number(result.count);
        summary.totalVotes += count;
        if (result.vote === 'pull') {
          summary.pullVotes = count;
        } else {
          summary.dontPullVotes = count;
        }
        summary.avgLatencyMs = Number(result.avgLatency) || 0;
      });

      return { data: summary, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  static async getRationales(sessionId: string, scenarioId: string) {
    try {
      const voteData = await db
        .select({
          vote: votes.vote,
          rationale: rationales.originalText,
        })
        .from(votes)
        .leftJoin(rationales, eq(rationales.voteId, votes.id))
        .where(
          and(
            eq(votes.sessionId, sessionId),
            eq(votes.scenarioId, scenarioId)
          )
        );

      const groupedRationales = {
        pull: [] as string[],
        dont_pull: [] as string[]
      };

      voteData.forEach(item => {
        if (item.rationale) {
          const voteType = item.vote === 'pull' ? 'pull' : 'dont_pull';
          groupedRationales[voteType].push(item.rationale);
        }
      });

      return { data: groupedRationales, error: null };
    } catch (error) {
      return { data: { pull: [], dont_pull: [] }, error: error as Error };
    }
  }

  static async getMitigations(sessionId: string, scenarioId: string) {
    try {
      const mitigationData = await db
        .select({
          mitigation: mitigations.originalText,
        })
        .from(votes)
        .leftJoin(mitigations, eq(mitigations.voteId, votes.id))
        .where(
          and(
            eq(votes.sessionId, sessionId),
            eq(votes.scenarioId, scenarioId)
          )
        );

      const mitigationTexts = mitigationData
        .filter(item => item.mitigation)
        .map(item => item.mitigation!);

      return { data: mitigationTexts, error: null };
    } catch (error) {
      return { data: [], error: error as Error };
    }
  }

  static async endSession(sessionId: string) {
    try {
      const [data] = await db
        .update(sessions)
        .set({
          status: 'complete',
          endedAt: new Date(),
        })
        .where(eq(sessions.id, sessionId))
        .returning();

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  static async loadScenarios(difficulty?: 'beginner' | 'intermediate' | 'advanced') {
    try {
      let query = db
        .select()
        .from(scenarios)
        .where(eq(scenarios.isActive, true));

      if (difficulty) {
        query = query.where(eq(scenarios.difficultyLevel, difficulty));
      }

      const data = await query;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  static async getActiveParticipantCount(sessionId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(participants)
      .where(
        and(
          eq(participants.sessionId, sessionId),
          eq(participants.isActive, true)
        )
      );
    
    return Number(result[0].count);
  }
}