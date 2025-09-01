# Supabase to Neon Migration Guide

## Overview
This guide documents the migration from Supabase to Neon database with a custom Node.js/Express backend for the Nonprofit Trolley Game application.

## Architecture Changes

### Before (Supabase)
- **Database**: Supabase PostgreSQL
- **Real-time**: Supabase Realtime
- **Authentication**: Supabase Auth (not used)
- **Client SDK**: @supabase/supabase-js
- **Hosting**: Client-only on Netlify

### After (Neon + Express)
- **Database**: Neon PostgreSQL
- **ORM**: Drizzle ORM
- **Real-time**: Socket.io
- **Backend**: Express.js API server
- **Client**: React + Socket.io-client
- **Hosting**: Client on Netlify, Server on Railway/Render/Fly.io

## Migration Steps

### 1. Set up Neon Database

1. Create a Neon account at https://neon.tech
2. Create a new project
3. Copy the connection string from the dashboard
4. Save it as `DATABASE_URL` in your `.env` file

### 2. Install Backend Dependencies

```bash
cd server
npm install
```

### 3. Configure Environment Variables

Create `server/.env`:
```env
DATABASE_URL=postgresql://username:password@host/database?sslmode=require
PORT=3001
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

Create `client/.env.local`:
```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_ENVIRONMENT=development
```

### 4. Run Database Migrations

```bash
cd server
npm run db:generate  # Generate migration files
npm run db:push      # Push schema to Neon
npm run db:migrate   # Run migrations
```

### 5. Seed Initial Data

Create and run `server/src/db/seed.ts`:
```bash
tsx src/db/seed.ts
```

### 6. Start the Backend Server

```bash
cd server
npm run dev
```

### 7. Update Frontend Code

The frontend code needs to be updated to use the new API client and Socket.io:

```typescript
// Old (Supabase)
import { supabase } from './services/supabase';
import { RoomService } from './services/rooms';
import { realtimeService } from './services/realtime';

// New (Neon + Express)
import { ApiService } from './services/api';
import { RoomServiceNew } from './services/roomsNew';
import { realtimeServiceNew } from './services/realtimeNew';
```

### 8. Install Frontend Dependencies

```bash
cd client
npm install socket.io-client
```

### 9. Start the Frontend

```bash
cd client
npm start
```

## Key Code Changes

### Database Queries

**Before (Supabase):**
```typescript
const { data, error } = await supabase
  .from('sessions')
  .select('*')
  .eq('room_code', roomCode)
  .single();
```

**After (Drizzle ORM):**
```typescript
const [session] = await db
  .select()
  .from(sessions)
  .where(eq(sessions.roomCode, roomCode));
```

### Real-time Events

**Before (Supabase Realtime):**
```typescript
const channel = supabase.channel(`room:${sessionId}`);
channel
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'votes'
  }, handleVoteInsert)
  .subscribe();
```

**After (Socket.io):**
```typescript
socket.on('vote_cast', (data) => {
  handleVoteCast(data);
});

socket.emit('submit_vote', voteData);
```

## API Endpoints

The new Express backend provides these endpoints:

- `POST /api/rooms/create` - Create a new room
- `POST /api/rooms/join` - Join a room
- `GET /api/rooms/:roomCode/status` - Get room status
- `POST /api/sessions/:sessionId/scenarios/:scenarioId/start` - Start scenario
- `POST /api/votes` - Submit vote
- `GET /api/sessions/:sessionId/scenarios/:scenarioId/votes` - Get vote summary
- `GET /api/sessions/:sessionId/scenarios/:scenarioId/rationales` - Get rationales
- `GET /api/sessions/:sessionId/scenarios/:scenarioId/mitigations` - Get mitigations
- `POST /api/sessions/:sessionId/end` - End session
- `GET /api/scenarios` - Load scenarios

## Socket.io Events

Real-time events handled via Socket.io:

- `participant_joined` - User joins room
- `participant_left` - User leaves room
- `vote_cast` - Vote submitted
- `rationale_added` - Rationale submitted
- `timer_started` - Timer starts
- `timer_tick` - Timer countdown
- `scenario_started` - New scenario begins
- `session_ended` - Session ends
- `decision_announced` - Decision revealed

## Deployment

### Backend Deployment (Railway/Render)

1. Push code to GitHub
2. Connect repository to Railway/Render
3. Set environment variables:
   - `DATABASE_URL` - Neon connection string
   - `CLIENT_URL` - Frontend URL
   - `NODE_ENV` - production

### Frontend Deployment (Netlify)

1. Update environment variables:
   - `REACT_APP_API_URL` - Backend URL
   - `REACT_APP_ENVIRONMENT` - production

2. Deploy:
```bash
npm run build
netlify deploy --prod --dir=build
```

## Security Improvements

1. **Rate Limiting**: Added Express rate limiter
2. **CORS**: Configured for specific origins
3. **Helmet**: Security headers
4. **Input Validation**: Zod schemas for all inputs
5. **SQL Injection Prevention**: Parameterized queries via Drizzle ORM

## Performance Improvements

1. **Connection Pooling**: Neon serverless driver
2. **Database Indexes**: Optimized query performance
3. **Socket.io Optimization**: Event throttling
4. **Caching**: Ready for Redis integration

## Monitoring

Add monitoring with:
- **Application**: Winston logging
- **Database**: Neon dashboard
- **Real-time**: Socket.io admin UI
- **APM**: New Relic or DataDog

## Rollback Plan

If issues arise:

1. Keep Supabase instance running during migration
2. Use feature flags to switch between old/new services
3. Maintain database sync during transition period
4. Have backup/restore procedures ready

## Testing

Run tests:
```bash
# Backend tests
cd server
npm test

# Frontend tests
cd client
npm test
```

## Troubleshooting

### Common Issues

1. **Connection refused**: Check server is running and ports are correct
2. **CORS errors**: Verify CLIENT_URL in backend .env
3. **Socket disconnections**: Check firewall and WebSocket support
4. **Database errors**: Verify DATABASE_URL and SSL settings

### Debug Mode

Enable debug logging:
```bash
DEBUG=* npm run dev
```

## Support

For issues or questions:
- Check server logs: `server/logs/`
- Database metrics: Neon dashboard
- Socket.io debug: Chrome DevTools WS tab