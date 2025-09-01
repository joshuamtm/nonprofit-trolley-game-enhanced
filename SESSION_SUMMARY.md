# Nonprofit Trolley Game - Session Summary

## Project Overview
- **Repository name and GitHub URL**: nonprofit-trolley-game - https://github.com/joshuamtm/nonprofit-trolley-game
- **Primary project goals**: Create an ethical decision-making simulation game for nonprofit organizations, exploring AI vs human judgment scenarios through the trolley problem framework
- **Tech stack and frameworks**: 
  - Frontend: React 18, TypeScript, React Router
  - Styling: CSS3 with MTM style guide implementation
  - Backend: Supabase (PostgreSQL, Real-time, Auth)
  - Deployment: Netlify
  - State Management: Zustand
  - Additional: QR codes, word clouds, countdown timers
- **Project structure overview**:
  ```
  nonprofit-trolley-game/
  ├── client/               # React frontend application
  │   ├── src/
  │   │   ├── components/   # React components
  │   │   ├── services/     # API and data services
  │   │   ├── stores/       # Zustand state management
  │   │   └── styles/       # MTM theme and global styles
  │   └── public/
  │       └── assets/       # MTM logos and favicons
  ├── supabase/            # Database configuration
  └── test documentation   # Testing cycle results
  ```

## Current Status
- **What we accomplished in this session**:
  - ✅ Applied complete MTM (Meet the Moment) style guide with brand colors and typography
  - ✅ Fixed critical issue: Game now waits for facilitator to manually start scenarios (was auto-starting)
  - ✅ Enhanced timer visibility with prominent display
  - ✅ Added MTM footer with branding
  - ✅ Completed comprehensive testing of all 4 scenarios from both roles
  - ✅ Created test documentation and issue tracking

- **Current working features**:
  - Room creation and management by facilitators
  - QR code generation for easy participant joining
  - 4 complete AI/Human decision scenarios
  - Real-time voting with rationale collection
  - Word cloud visualization of responses
  - Animated trolley results display
  - Export functionality (CSV/JSON)
  - Fully responsive design with accessibility features
  - Demo/Mock mode for testing without database

- **Known bugs or issues**:
  - Minor: MTM logo may not display in some environments (path issue)
  - Low priority: No loading indicator between scenario transitions
  - Note: Currently runs in demo mode only (Supabase integration pending deployment)

- **Next priorities/tasks**:
  1. Deploy to Netlify with production environment variables
  2. Connect to live Supabase instance
  3. Test multi-user functionality with real participants
  4. Add participant count display during active games
  5. Implement reconnection handling for dropped connections

- **Any pending decisions**:
  - Whether to add sound effects for timer warnings
  - Maximum participant limit for production (currently 200)
  - Session data retention policy

## Environment & Configuration
- **Required environment variables**:
  ```
  REACT_APP_SUPABASE_URL=your_supabase_url
  REACT_APP_SUPABASE_ANON_KEY=your_anon_key
  REACT_APP_ENVIRONMENT=production|development
  ```

- **Config files and their purposes**:
  - `client/package.json` - Dependencies and scripts
  - `client/tsconfig.json` - TypeScript configuration
  - `supabase/config.toml` - Supabase local development config
  - `supabase-schema.sql` - Complete database schema
  - `.env.local` - Local environment variables (not committed)

- **Development vs production settings**:
  - Development: Uses mock data, no Supabase connection required
  - Production: Requires Supabase credentials, real-time sync enabled

- **Any local setup requirements**:
  - Node.js 16+ required
  - npm or yarn package manager
  - Optional: Supabase CLI for database management

## External Services & Integrations
- **List all third-party services**:
  - **Netlify**: Frontend hosting and deployment
    - Site: nonprofit-trolley-game.netlify.app (to be configured)
    - Auto-deploy from GitHub main branch
  - **Supabase**: Backend services
    - Database: PostgreSQL with row-level security
    - Real-time: WebSocket subscriptions for live updates
    - Auth: Not currently implemented but structure ready

- **API endpoints and their purposes**:
  - Supabase REST API endpoints (auto-generated):
    - `/sessions` - Game session management
    - `/participants` - User participation tracking
    - `/votes` - Vote submission and retrieval
    - `/scenarios` - Scenario content management
    - `/rationales` - Text responses from participants

- **Authentication methods and credentials location**:
  - Supabase anon key: Public key stored in environment variables
  - No user authentication currently required (room codes act as auth)

- **Webhook configurations**: None currently configured

- **Database connections and schemas**:
  - Complete schema in `supabase-schema.sql`
  - Tables: sessions, participants, scenarios, votes, rationales, mitigations
  - Views: active_sessions, vote_summary
  - Real-time enabled on all tables

## Authentication & Security
- **Auth provider/system used**: Room code-based access (no user accounts)
- **Required API keys or tokens**:
  - Supabase URL (stored in env vars)
  - Supabase Anon Key (stored in env vars)
- **User roles and permissions**:
  - Facilitator: Can create rooms, start scenarios, control game flow
  - Participant: Can join rooms, submit votes and rationales
- **Security considerations**:
  - Content moderation for text inputs (profanity filter)
  - Room codes are 6-digit random numbers
  - No PII collected from participants
  - Anonymous voting system

## Development Workflow
- **Branch strategy**: Direct commits to main (small team project)
- **Testing approach**: Manual testing with comprehensive test cycles documented
- **Build and deployment process**:
  ```bash
  npm run build        # Creates production build
  netlify deploy       # Deploy to staging
  netlify deploy --prod # Deploy to production
  ```
- **CI/CD pipeline details**: Netlify auto-deploy on push to main branch

## Dependencies & Versions
- **Critical package versions**:
  ```json
  {
    "react": "^18.2.0",
    "typescript": "^4.9.5",
    "zustand": "^4.4.7",
    "@supabase/supabase-js": "^2.39.1",
    "react-router-dom": "^6.20.1",
    "qrcode": "^1.5.3",
    "react-countdown-circle-timer": "^3.2.1",
    "bad-words": "^3.0.4"
  }
  ```
- **Any version-specific requirements**: React 18+ for concurrent features
- **Known compatibility issues**: None identified

## File Context
- **Key files and their purposes**:
  - `client/src/components/GameRoom.tsx` - Main game logic and state management
  - `client/src/stores/gameStore.ts` - Zustand store for game state
  - `client/src/services/rooms.ts` - Room and voting service layer
  - `client/src/services/realtime.ts` - WebSocket real-time updates
  - `client/src/services/mockData.ts` - Demo mode data and scenarios
  - `client/src/styles/mtm-theme.css` - MTM brand design tokens

- **Any files with complex logic that need explanation**:
  - `GameRoom.tsx` - Handles phase transitions (waiting → voting → results)
  - `gameStore.ts` - Manages real-time sync between facilitator and participants
  - Timer sync logic uses both store state and local useEffect hooks

- **Generated files vs source files**:
  - Source: All files in `src/`
  - Generated: `build/` directory (not committed)
  - Database types: Auto-generated from Supabase schema

## Resume Instructions
- **Exact commands to run when resuming**:
  ```bash
  # Navigate to project
  cd /Users/joshua/nonprofit-trolley-game/client
  
  # Pull latest changes
  git pull origin main
  
  # Install dependencies (if needed)
  npm install
  
  # Start development server
  npm start
  
  # Open in browser
  open http://localhost:3000
  ```

- **Any manual steps required before coding**:
  1. Check if Supabase credentials are needed (currently runs in demo mode)
  2. Verify Node.js version is 16+
  3. Clear browser cache if seeing old styles

- **How to verify the environment is ready**:
  1. Server starts without errors on port 3000
  2. Homepage loads with MTM branding (cream background, blue/orange colors)
  3. Can create a room as facilitator
  4. Can join room as participant
  5. Console shows no errors

## 3. CRITICAL CODE SNIPPETS

### Facilitator Control Fix (Preventing Auto-start)
```javascript
// GameRoom.tsx - Only transition to voting when timer is active
useEffect(() => {
  if (currentScenario && timerActive && !isMockMode) {
    setGamePhase('voting');
    // Reset voting state...
  }
}, [currentScenario?.id, timerActive]);
```

### MTM Theme Variables
```css
:root {
  --mtm-primary: #1ab1d2;        /* Light Blue */
  --mtm-accent: #f18f38;         /* Orange */
  --mtm-navy: #1c487b;           /* Dark Blue */
  --mtm-soft-blue: #85abbd;      /* Muted Blue */
  --mtm-bg-cream: #fef4e3;       /* Background Cream */
  --mtm-bg-white: #fafdfe;       /* Background White */
}
```

### Scenario Start Logic
```javascript
const handleStartScenario = async () => {
  // ... load scenarios
  await startScenario(scenarioToStart.id);
  setGamePhase('voting'); // Explicitly set phase
  startTimer(30);
};
```

## 4. VALIDATION CHECKLIST
- [✅] All changes committed and pushed
- [✅] Tests passing (manual testing completed)
- [✅] No sensitive data in commits
- [✅] Documentation updated (test results, issues, summary)
- [✅] Environment variables documented

## Additional Notes
- **MTM Style Guide**: Full brand guide saved at `/Users/joshua/mtm-style-guide.md`
- **Test Results**: Comprehensive testing documented in `test-results-cycle-1.md`
- **Known Safe State**: Current main branch is stable and deployment-ready
- **Demo Access**: Application runs fully in demo mode without database connection

## Deployment Checklist
When ready to deploy to production:
1. Set up Supabase project and run schema migration
2. Configure Netlify environment variables
3. Update REACT_APP_ENVIRONMENT to "production"
4. Test real-time features with multiple users
5. Monitor for any CORS or WebSocket issues

---
*Session completed: 2025-08-10*
*All critical issues resolved, application ready for deployment*