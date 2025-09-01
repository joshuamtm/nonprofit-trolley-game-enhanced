# Setting Up Neon Database with Netlify

## Option 1: Netlify Dashboard Setup (Easiest)

1. **Go to Netlify Dashboard**
   - Visit: https://app.netlify.com/projects/nonprofit-trolley-game
   - Click on "Integrations" or "Plugins"

2. **Add Neon Integration**
   - Search for "Neon" 
   - Click "Enable" or "Install"
   - This will create a Neon database automatically

3. **Get Database Credentials**
   - After installation, Netlify will show you:
     - DATABASE_URL (automatically added to env vars)
   - Or check: Site Settings → Environment Variables

4. **Run Database Setup**
   ```bash
   # Copy the DATABASE_URL from Netlify
   # Then run this SQL in Neon console:
   ```
   - Go to Neon dashboard
   - Click "SQL Editor"
   - Paste contents of `neon-schema.sql`
   - Click "Run"

## Option 2: Manual Neon Setup

1. **Create Neon Account**
   - Go to https://neon.tech
   - Sign up (free)
   - Create new project

2. **Get Connection String**
   - In Neon dashboard, copy the connection string
   - It looks like: `postgresql://user:pass@host/database?sslmode=require`

3. **Add to Netlify Environment**
   ```bash
   netlify env:set DATABASE_URL "your-neon-connection-string"
   ```

4. **Create Tables**
   - In Neon SQL editor, run the `neon-schema.sql` file

## Test Your Setup

1. **Deploy Functions**
   ```bash
   git add -A
   git commit -m "Add Netlify Functions for database"
   git push
   ```

2. **Test Locally**
   ```bash
   # Install Netlify CLI if needed
   npm install -g netlify-cli
   
   # Run locally with functions
   netlify dev
   ```

3. **Test Room Creation**
   - Go to http://localhost:8888
   - Click "Create Room"
   - Should get a room code

## Current Limitations with Netlify Functions

✅ **What Works:**
- Create rooms
- Join rooms  
- Submit votes
- Basic gameplay

⚠️ **What's Limited:**
- No real-time updates (need to refresh)
- No live participant count
- No synchronized timers
- Results need manual refresh

## Why These Limitations?

Netlify Functions are **serverless**:
- They start when called, then stop
- Can't maintain WebSocket connections
- Can't push updates to clients

## Solutions:

### Quick Fix: Add Polling
```javascript
// In your React component
useEffect(() => {
  const interval = setInterval(() => {
    // Refresh vote count every 2 seconds
    fetchVoteCount();
  }, 2000);
  
  return () => clearInterval(interval);
}, []);
```

### Better Solution: Add Pusher or Ably
For real-time without a server:
1. Sign up for Pusher (free tier)
2. Add to Netlify Functions:
   ```javascript
   import Pusher from 'pusher';
   
   const pusher = new Pusher({
     appId: process.env.PUSHER_APP_ID,
     key: process.env.PUSHER_KEY,
     secret: process.env.PUSHER_SECRET,
     cluster: 'us2'
   });
   
   // After vote is saved
   pusher.trigger('room-' + sessionId, 'vote-cast', {
     voteCount: newCount
   });
   ```

3. Add to React:
   ```javascript
   import Pusher from 'pusher-js';
   
   const pusher = new Pusher('your-key', {
     cluster: 'us2'
   });
   
   const channel = pusher.subscribe('room-' + sessionId);
   channel.bind('vote-cast', (data) => {
     setVoteCount(data.voteCount);
   });
   ```

### Ultimate Solution: Deploy the Express Server
If you need full real-time features, you still need to deploy the Express server to Railway/Render.

## Comparison Table

| Feature | Netlify Functions Only | + Pusher/Ably | Express Server (Railway) |
|---------|----------------------|---------------|-------------------------|
| Create/Join Rooms | ✅ | ✅ | ✅ |
| Submit Votes | ✅ | ✅ | ✅ |
| Real-time Updates | ❌ | ✅ | ✅ |
| Live Participant Count | ❌ | ✅ | ✅ |
| Synchronized Timers | ❌ | ⚠️ | ✅ |
| Cost | Free | Free-$25/mo | Free-$5/mo |
| Complexity | Low | Medium | Low |
| Setup Time | 10 min | 20 min | 15 min |

## Recommendation

**For Testing/Demo:** Use Netlify Functions (what we just set up)
**For Production:** Add Pusher for real-time OR deploy Express to Railway

The Netlify Functions approach will work for basic gameplay, but users will need to refresh to see updates from other players.