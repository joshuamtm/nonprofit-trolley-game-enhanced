# Nonprofit Trolley Game - Session Context Document
*Generated: 2025-01-08*

## Project Overview
- **Repository name and GitHub URL:** nonprofit-trolley-game - https://github.com/joshuamtm/nonprofit-trolley-game
- **Primary project goals:** Create an interactive ethical decision-making game for nonprofit organizations to explore AI adoption scenarios through a trolley problem framework
- **Tech stack and frameworks:** 
  - Frontend: React 18, TypeScript, CSS3
  - Backend: Supabase (PostgreSQL + Realtime)
  - Deployment: Netlify
  - State Management: Zustand
  - Build Tool: Create React App
- **Project structure overview:**
  ```
  nonprofit-trolley-game/
  ├── client/               # React frontend application
  │   ├── src/
  │   │   ├── components/   # React components
  │   │   ├── services/     # API and data services
  │   │   ├── stores/       # Zustand state management
  │   │   ├── hooks/        # Custom React hooks
  │   │   └── utils/        # Utility functions
  │   ├── public/           # Static assets
  │   └── build/            # Production build
  └── supabase-schema.sql   # Database schema
  ```

## Current Status
- **What we accomplished in this session:**
  - Completed 2 comprehensive testing cycles
  - Fixed 11 identified issues across all priority levels
  - Fixed compilation errors and TypeScript type definitions
  - Enabled progression through all 4 scenarios
  - Fixed timer behavior to stop after voting
  - Resolved double-click voting issue
  - Added completion state UI
  - Improved UI labels and removed debug logs
  - Successfully deployed to production

- **Current working features:**
  - All 4 scenarios fully functional (Food Bank, Youth Mental Health, Donor Targeting, Environmental Impact)
  - Facilitator dashboard with live voting results
  - Participant voting interface with rationale and mitigation inputs
  - Real-time vote counting and results display
  - Timer system (30 seconds per scenario)
  - Scenario progression and completion tracking
  - Mock mode for testing without database
  - Responsive design for all screen sizes
  - Accessibility features (keyboard navigation, screen reader support)

- **Known bugs or issues:**
  - TypeScript warnings for 'any' types in map functions (non-blocking)
  - Unused variable warnings (non-blocking)
  - Supabase null check warnings (mock mode only, non-blocking)

- **Next priorities/tasks:**
  - Connect real Supabase backend for multi-user sessions
  - Add session persistence
  - Implement real-time updates between facilitator and participants
  - Add export functionality for session results
  - Improve TypeScript type definitions

- **Any pending decisions:**
  - Whether to add user authentication
  - Session data retention policy
  - Analytics integration approach

## Environment & Configuration
- **Required environment variables:**
  ```bash
  REACT_APP_SUPABASE_URL=https://tvphbojgzxhfmrqnckox.supabase.co
  REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2cGhib2pnenhoZm1ycW5ja294Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3Mzg3NDQsImV4cCI6MjA3MDMxNDc0NH0.JOR-g38tcVchtzOqcAUUFpU69PRZgxJGb3u_wHWJlVs
  REACT_APP_ENVIRONMENT=production  # or development
  ```

- **Config files and their purposes:**
  - `package.json` - Dependencies and scripts
  - `tsconfig.json` - TypeScript configuration
  - `.env.local` - Local environment variables (not committed)
  - `netlify.toml` - Netlify deployment configuration (if exists)

- **Development vs production settings:**
  - Development: Uses mock data, console logging enabled
  - Production: Connects to Supabase, optimized build

- **Any local setup requirements:**
  - Node.js 16+ and npm
  - Git for version control

## External Services & Integrations
- **List all third-party services:**
  - **Netlify:** Hosting and deployment (https://nonprofit-trolley-game.netlify.app)
  - **Supabase:** Database and real-time subscriptions (currently mock mode)
  - **GitHub:** Version control and source code repository

- **API endpoints and their purposes:**
  - Supabase REST API for CRUD operations
  - Supabase Realtime for live updates
  - All endpoints accessed via Supabase client library

- **Authentication methods and credentials location:**
  - Supabase anonymous authentication (public anon key in env vars)
  - No user authentication currently implemented

- **Webhook configurations:** None currently

- **Database connections and schemas:**
  - Schema defined in `supabase-schema.sql`
  - Tables: sessions, participants, scenarios, votes, rationales, mitigations
  - Views: active_sessions, vote_summary

## Authentication & Security
- **Auth provider/system used:** Supabase Auth (not yet implemented)
- **Required API keys or tokens:**
  - Supabase URL and Anon Key (stored in environment variables)
- **User roles and permissions:**
  - Facilitator: Can start/control scenarios
  - Participant: Can vote and submit responses
- **Security considerations:**
  - Text moderation for user inputs
  - Rate limiting on submissions
  - No PII collected

## Development Workflow
- **Branch strategy:** Main branch only (small project)
- **Testing approach:** Manual testing through UI, comprehensive test cycles documented
- **Build and deployment process:**
  ```bash
  # Build
  npm run build
  
  # Deploy
  netlify deploy --prod --dir=build
  ```
- **CI/CD pipeline details:** Manual deployment via Netlify CLI

## Dependencies & Versions
- **Critical package versions:**
  ```json
  {
    "react": "^18.2.0",
    "typescript": "^4.9.5",
    "@supabase/supabase-js": "^2.39.3",
    "zustand": "^4.4.7",
    "react-countdown-circle-timer": "^3.2.1"
  }
  ```
- **Any version-specific requirements:** React 18+ for concurrent features
- **Known compatibility issues:** None identified

## File Context
- **Key files and their purposes:**
  - `src/components/GameRoom.tsx` - Main game interface, handles voting and scenario progression
  - `src/components/FacilitatorDashboard.tsx` - Facilitator control panel
  - `src/services/rooms.ts` - Room and voting service layer
  - `src/stores/gameStore.ts` - Zustand state management
  - `src/services/mockData.ts` - Mock scenarios and demo mode

- **Any files with complex logic that need explanation:**
  - `GameRoom.tsx` - Contains scenario cycling logic, timer management, and vote submission
  - State management split between component state and Zustand store

- **Generated files vs source files:**
  - `build/` directory is generated (don't edit)
  - All files in `src/` are source files

## Resume Instructions
- **Exact commands to run when resuming:**
  ```bash
  # Navigate to project
  cd /Users/joshua/nonprofit-trolley-game/client
  
  # Install dependencies (if needed)
  npm install
  
  # Start development server
  npm start
  
  # Open browser to http://localhost:3000
  ```

- **Any manual steps required before coding:**
  1. Check git status for any uncommitted changes
  2. Pull latest changes from GitHub
  3. Verify environment variables are set

- **How to verify the environment is ready:**
  ```bash
  # Check Node version
  node --version  # Should be 16+
  
  # Verify dependencies installed
  npm list react zustand @supabase/supabase-js
  
  # Test build
  npm run build
  
  # Start dev server and verify it loads
  npm start
  ```

## 3. CRITICAL CODE SNIPPETS

### Scenario Progression Logic
```typescript
// From GameRoom.tsx - How scenarios cycle
const handleNextScenario = async () => {
  if (isMockMode) {
    if (currentScenarioIndex < mockScenarios.length - 1) {
      const nextIndex = currentScenarioIndex + 1;
      setCurrentScenarioIndex(nextIndex);
      setGamePhase('waiting');
      // Clear all state for new scenario
      setRationale('');
      setMitigation('');
      setPullRationales([]);
      setDontPullRationales([]);
      setMitigations([]);
      setSelectedVote(null);
      setMockVotes([]);
      useGameStore.setState({ hasVoted: false, myVote: null, myRationale: '' });
    } else {
      setGamePhase('completed');
    }
  }
};
```

### Vote Submission Pattern
```typescript
// From GameRoom.tsx - Vote submission with moderation
const handleVoteSubmit = async () => {
  if (hasVoted || !selectedVote) return;
  
  // Text moderation
  const processedRationale = rateLimiter(moderateText(rationale));
  
  if (isMockMode) {
    const newVote = { 
      vote: selectedVote, 
      rationale: processedRationale || rationale.trim(),
      mitigation: mitigation.trim()
    };
    setMockVotes(prev => [...prev, newVote]);
    useGameStore.setState({ hasVoted: true, myVote: selectedVote });
  }
};
```

### Timer Control Pattern
```typescript
// Timer stops when participant votes
<CountdownCircleTimer
  isPlaying={timerActive || (gamePhase === 'voting' && !isMockMode && !hasVoted)}
  duration={30}
  onComplete={() => setGamePhase('results')}
/>
```

## 4. VALIDATION CHECKLIST
- [x] All changes committed and pushed
- [x] Tests passing (manual testing completed)
- [x] No sensitive data in commits (verified)
- [x] Documentation updated (test results and summaries created)
- [x] Environment variables documented

## Additional Notes
- Application deployed and live at: https://nonprofit-trolley-game.netlify.app
- Mock mode is currently active (no real database connections)
- All 4 scenarios tested and working in both facilitator and participant roles
- Ready for user testing and feedback collection

## Session Metrics
- Total commits: 3
- Issues resolved: 11
- Test cycles completed: 2
- Build size: 134.85 kB (optimized)
- Deployment status: ✅ Live in production