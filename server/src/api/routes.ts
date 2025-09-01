import { Router } from 'express';
import { RoomService } from '../services/roomService';
import { RealtimeService } from '../services/realtimeService';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createRoomSchema = z.object({
  config: z.object({
    timerDuration: z.number().min(10).max(300).optional(),
    maxParticipants: z.number().min(1).max(500).optional(),
    moderationEnabled: z.boolean().optional(),
    contentWarnings: z.boolean().optional(),
  }).optional(),
});

const joinRoomSchema = z.object({
  roomCode: z.string().length(6),
  fingerprint: z.string().min(1),
  userAgent: z.string().optional(),
});

const submitVoteSchema = z.object({
  sessionId: z.string().uuid(),
  participantId: z.string().uuid(),
  scenarioId: z.string().uuid(),
  vote: z.enum(['pull', 'dont_pull']),
  rationale: z.string().optional(),
  mitigation: z.string().optional(),
});

export function createApiRoutes(realtimeService: RealtimeService) {
  // Create room
  router.post('/rooms/create', async (req, res) => {
    try {
      const { config } = createRoomSchema.parse(req.body);
      const result = await RoomService.createRoom(config);
      
      if (result.error) {
        return res.status(400).json({ error: result.error.message });
      }
      
      res.json({ room: result.room });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Join room
  router.post('/rooms/join', async (req, res) => {
    try {
      const { roomCode, fingerprint, userAgent } = joinRoomSchema.parse(req.body);
      const result = await RoomService.joinRoom(roomCode, fingerprint, userAgent);
      
      if (result.error) {
        return res.status(400).json({ error: result.error.message });
      }
      
      res.json({ 
        participant: result.participant,
        session: result.session,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get room status
  router.get('/rooms/:roomCode/status', async (req, res) => {
    try {
      const { roomCode } = req.params;
      const result = await RoomService.getRoomStatus(roomCode);
      
      if (result.error) {
        return res.status(404).json({ error: result.error.message });
      }
      
      res.json(result.data);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Start scenario
  router.post('/sessions/:sessionId/scenarios/:scenarioId/start', async (req, res) => {
    try {
      const { sessionId, scenarioId } = req.params;
      const result = await RoomService.startScenario(sessionId, scenarioId);
      
      if (result.error) {
        return res.status(400).json({ error: result.error.message });
      }
      
      res.json(result.data);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Submit vote
  router.post('/votes', async (req, res) => {
    try {
      const data = submitVoteSchema.parse(req.body);
      const result = await RoomService.submitVote(
        data.sessionId,
        data.participantId,
        data.scenarioId,
        data.vote,
        data.rationale,
        data.mitigation
      );
      
      if (result.error) {
        return res.status(400).json({ error: result.error.message });
      }

      // Get updated vote summary
      const summary = await RoomService.getVoteSummary(data.sessionId, data.scenarioId);
      
      if (summary.data) {
        // Broadcast vote update via Socket.io
        realtimeService.broadcastVoteCast(data.sessionId, {
          session_id: data.sessionId,
          scenario_id: data.scenarioId,
          vote: data.vote,
          total_votes: summary.data.totalVotes,
          pull_votes: summary.data.pullVotes,
          dont_pull_votes: summary.data.dontPullVotes,
        });
      }

      // Broadcast rationale if provided
      if (data.rationale) {
        realtimeService.broadcastRationaleAdded(data.sessionId, {
          session_id: data.sessionId,
          scenario_id: data.scenarioId,
          vote: data.vote,
          rationale: data.rationale,
          participant_id: data.participantId,
        });
      }
      
      res.json({ vote: result.data, summary: summary.data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get vote summary
  router.get('/sessions/:sessionId/scenarios/:scenarioId/votes', async (req, res) => {
    try {
      const { sessionId, scenarioId } = req.params;
      const result = await RoomService.getVoteSummary(sessionId, scenarioId);
      
      if (result.error) {
        return res.status(400).json({ error: result.error.message });
      }
      
      res.json(result.data);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get rationales
  router.get('/sessions/:sessionId/scenarios/:scenarioId/rationales', async (req, res) => {
    try {
      const { sessionId, scenarioId } = req.params;
      const result = await RoomService.getRationales(sessionId, scenarioId);
      
      if (result.error) {
        return res.status(400).json({ error: result.error.message });
      }
      
      res.json(result.data);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get mitigations
  router.get('/sessions/:sessionId/scenarios/:scenarioId/mitigations', async (req, res) => {
    try {
      const { sessionId, scenarioId } = req.params;
      const result = await RoomService.getMitigations(sessionId, scenarioId);
      
      if (result.error) {
        return res.status(400).json({ error: result.error.message });
      }
      
      res.json(result.data);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // End session
  router.post('/sessions/:sessionId/end', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const result = await RoomService.endSession(sessionId);
      
      if (result.error) {
        return res.status(400).json({ error: result.error.message });
      }
      
      res.json(result.data);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Load scenarios
  router.get('/scenarios', async (req, res) => {
    try {
      const difficulty = req.query.difficulty as 'beginner' | 'intermediate' | 'advanced' | undefined;
      const result = await RoomService.loadScenarios(difficulty);
      
      if (result.error) {
        return res.status(400).json({ error: result.error.message });
      }
      
      res.json(result.data);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}