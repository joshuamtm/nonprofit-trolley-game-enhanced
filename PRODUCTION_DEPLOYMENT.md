# Production Deployment Guide

## Step 1: Set Up Neon Database (5 minutes)

1. **Create Neon Account**
   - Go to https://neon.tech
   - Sign up for free account
   - Create a new project named "nonprofit-trolley-game"

2. **Get Database URL**
   - In Neon dashboard, click on your project
   - Copy the connection string (looks like: `postgresql://username:password@host/database?sslmode=require`)
   - Save this for later

3. **Create Database Schema**
   ```bash
   # In your terminal, run:
   cd server
   
   # Create .env file with your Neon URL
   echo "DATABASE_URL=your-neon-connection-string-here" > .env
   
   # Install dependencies
   npm install
   
   # Push schema to Neon
   npm run db:push
   ```

## Step 2: Deploy Backend to Railway (10 minutes)

### Option A: Railway (Recommended - Easiest)

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign in with GitHub

2. **Deploy from GitHub**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `nonprofit-trolley-game-enhanced`
   - Select the `/server` directory as root

3. **Set Environment Variables**
   In Railway dashboard, go to Variables and add:
   ```
   DATABASE_URL=your-neon-connection-string
   PORT=3001
   CLIENT_URL=https://nonprofit-trolley-game.netlify.app
   JWT_SECRET=generate-a-random-32-char-string
   NODE_ENV=production
   ```

4. **Get Your Backend URL**
   - Railway will provide a URL like: `https://your-app.up.railway.app`
   - Copy this URL

### Option B: Render (Free tier available)

1. **Create Render Account**
   - Go to https://render.com
   - Sign up for free

2. **Create Web Service**
   - Click "New +"
   - Select "Web Service"
   - Connect GitHub repo
   - Configure:
     - Name: `nonprofit-trolley-backend`
     - Root Directory: `server`
     - Build Command: `npm install`
     - Start Command: `npm start`

3. **Add Environment Variables**
   Same as Railway above

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (~5 minutes)
   - Copy the provided URL

## Step 3: Update Frontend Configuration (5 minutes)

1. **Update Frontend Environment**
   Create `/client/.env.production`:
   ```env
   REACT_APP_API_URL=https://your-backend-url.railway.app/api
   REACT_APP_ENVIRONMENT=production
   ```

2. **Rebuild and Redeploy Frontend**
   ```bash
   cd client
   
   # Build with production env
   npm run build
   
   # Deploy to Netlify
   netlify deploy --prod --dir=build
   ```

## Step 4: Initialize Database with Scenarios (2 minutes)

Create and run this seed script:

```bash
cd server
cat > src/db/seed.ts << 'EOF'
import { db } from './connection';
import { scenarios } from './schema';

const seedScenarios = [
  {
    title: "AI-Powered Volunteer Matching",
    context: "Your nonprofit needs to match 500 volunteers with opportunities across 50 partner organizations",
    aiOption: "Use AI to analyze skills, availability, and preferences to automatically match volunteers",
    nonAiOption: "Continue manual matching by staff reviewing each application individually",
    assumptions: ["AI can identify patterns in successful matches", "Volunteer data is accurate"],
    ethicalAxes: ["Efficiency vs Personal Touch", "Scale vs Individual Attention"],
    riskNotes: "AI might miss nuanced personal factors that make great matches",
    metrics: { benefit_estimate: "75% time reduction", error_rate: "5-10%" },
    contentWarnings: [],
    difficultyLevel: "beginner" as const,
    discussionPrompts: ["How do we balance efficiency with personal connection?"],
    mitigations: ["Human review of AI suggestions", "Feedback loop for improvements"],
    isActive: true
  },
  // Add more scenarios here
];

async function seed() {
  console.log('Seeding database...');
  
  for (const scenario of seedScenarios) {
    await db.insert(scenarios).values(scenario);
    console.log(`Added scenario: ${scenario.title}`);
  }
  
  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch(console.error);
EOF

# Run the seed script
npx tsx src/db/seed.ts
```

## Step 5: Test Everything (5 minutes)

1. **Test Room Creation**
   - Go to https://nonprofit-trolley-game.netlify.app
   - Click "Create Room"
   - You should get a 6-character room code

2. **Test Participant Join**
   - Open another browser/incognito window
   - Go to homepage
   - Enter the room code
   - Click "Join as Participant"

3. **Test Voting**
   - Start a scenario as facilitator
   - Vote as participant
   - Check if results show up

## Troubleshooting

### "Room not found" Error
- Backend is not running
- Check Railway/Render logs
- Verify DATABASE_URL is correct

### CORS Errors
- Check CLIENT_URL in backend env vars
- Should be: `https://nonprofit-trolley-game.netlify.app`

### Connection Refused
- Backend URL is wrong in frontend
- Check REACT_APP_API_URL in Netlify env vars

### Database Connection Failed
- Check DATABASE_URL format
- Must include `?sslmode=require` at the end
- Verify Neon database is active

## Quick Setup Script

Run this to set everything up quickly:

```bash
#!/bin/bash

# 1. Set your variables
NEON_DB_URL="postgresql://user:pass@host/db?sslmode=require"
BACKEND_URL="https://your-app.railway.app"

# 2. Setup backend
cd server
echo "DATABASE_URL=$NEON_DB_URL" > .env
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
npm install
npm run db:push

# 3. Setup frontend
cd ../client
echo "REACT_APP_API_URL=$BACKEND_URL/api" > .env.production
npm run build

# 4. Deploy
netlify deploy --prod --dir=build

echo "✅ Deployment complete!"
```

## Monitoring

### Check Backend Health
```bash
curl https://your-backend.railway.app/health
```

### View Logs
- Railway: Dashboard → Logs
- Render: Dashboard → Logs
- Neon: Dashboard → Monitoring

### Database Queries
In Neon dashboard, you can run SQL queries:
```sql
-- Check active sessions
SELECT * FROM sessions WHERE status = 'active';

-- Check participant count
SELECT session_id, COUNT(*) as participants 
FROM participants 
WHERE is_active = true 
GROUP BY session_id;
```

## Support

If you encounter issues:
1. Check backend logs for errors
2. Verify all environment variables are set
3. Test backend API directly with curl
4. Check browser console for frontend errors

Backend API test:
```bash
# Test room creation
curl -X POST https://your-backend.railway.app/api/rooms/create \
  -H "Content-Type: application/json" \
  -d '{"config": {}}'
```