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
    const { config = {} } = JSON.parse(event.body || '{}');
    
    // Generate room code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Create room in database
    const result = await sql`
      INSERT INTO sessions (room_code, config, status)
      VALUES (${roomCode}, ${JSON.stringify(config)}, 'waiting')
      RETURNING *
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        room: {
          id: result[0].id,
          roomCode: result[0].room_code,
          config: result[0].config,
          status: result[0].status,
          createdAt: result[0].created_at,
        }
      }),
    };
  } catch (error) {
    console.error('Error creating room:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to create room' }),
    };
  }
}