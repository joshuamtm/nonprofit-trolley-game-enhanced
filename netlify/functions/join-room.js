import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export async function handler(event, context) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { roomCode, fingerprint } = JSON.parse(event.body || '{}');
    
    // Check if room exists
    const sessions = await sql`
      SELECT * FROM sessions 
      WHERE room_code = ${roomCode} 
      AND status IN ('waiting', 'active')
    `;

    if (sessions.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Room not found or inactive' }),
      };
    }

    const session = sessions[0];

    // Check for existing participant
    const existingParticipants = await sql`
      SELECT * FROM participants
      WHERE session_id = ${session.id}
      AND fingerprint = ${fingerprint}
    `;

    let participant;
    
    if (existingParticipants.length > 0) {
      // Reactivate existing participant
      const result = await sql`
        UPDATE participants
        SET is_active = true, joined_at = NOW()
        WHERE id = ${existingParticipants[0].id}
        RETURNING *
      `;
      participant = result[0];
    } else {
      // Create new participant
      const result = await sql`
        INSERT INTO participants (session_id, fingerprint, is_active)
        VALUES (${session.id}, ${fingerprint}, true)
        RETURNING *
      `;
      participant = result[0];
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        participant: {
          id: participant.id,
          sessionId: participant.session_id,
          fingerprint: participant.fingerprint,
          isActive: participant.is_active,
          joinedAt: participant.joined_at,
        },
        session: {
          id: session.id,
          roomCode: session.room_code,
          status: session.status,
          config: session.config,
        }
      }),
    };
  } catch (error) {
    console.error('Error joining room:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to join room' }),
    };
  }
}