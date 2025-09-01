# Product Requirements Document: Nonprofit Trolley Game
## Real-time Multiplayer Ethics Decision Platform

### Executive Summary
A web-based, real-time multiplayer "trolley problem" game designed for nonprofit organizations to facilitate discussions about AI ethics in social services. Participants vote on whether to "pull the lever" (adopt AI) or not, with decisions visualized through animated trolley graphics and dual word clouds showing rationales.

### Core Requirements

#### 1. System Architecture
- **Frontend**: React TypeScript SPA with responsive design
- **Backend**: Supabase (Postgres + Realtime)
- **Hosting**: Netlify with Deploy Previews
- **Target Load**: 200 concurrent users (stretch: 500)
- **Latency**: P95 ≤ 2 seconds for vote registration

#### 2. User Flows

##### Facilitator Flow
1. Create room → Generate 6-character room code
2. Configure session (timer duration, moderation settings)
3. Select/order scenarios from library
4. Launch rounds with countdown timer
5. Lock voting when timer expires
6. Review results and word clouds
7. Export session data (CSV/JSON/PDF)

##### Participant Flow
1. Scan QR code (no PIN required)
2. Join room with ephemeral identity
3. View scenario and ethical dilemma
4. Cast vote: "Pull Lever" or "Don't Pull"
5. Add rationale (≤8 words/80 chars)
6. Watch real-time word clouds form
7. See trolley animation and final decision

#### 3. Core Features

##### Room Management
```typescript
interface Room {
  id: string;           // 6-char uppercase alphanumeric
  sessionId: UUID;
  facilitatorId: string;
  config: {
    timerDuration: number;    // 10-120 seconds, default 30
    maxParticipants: number;  // 10-500, default 200
    moderationEnabled: boolean;
    contentWarnings: boolean;
  };
  status: 'waiting' | 'active' | 'complete';
  currentScenario?: UUID;
  participants: Set<ParticipantId>;
}
```

##### Voting System
- One vote per participant per scenario
- Double-vote prevention via browser fingerprinting
- Real-time vote tallying
- Votes locked when timer expires
- Anonymous voting (no persistent identity)

##### Rationale Collection
- Max 8 words or 80 characters
- One rationale per participant per round
- Profanity filter + PII scrubbing
- Optional human moderation queue
- Real-time word cloud updates

##### Word Cloud Visualization
- Two separate clouds: "Pull" and "Don't Pull"
- Non-overlapping layout constraint
- Responsive sizing (mobile → desktop)
- Text processing pipeline:
  1. Lowercase normalization
  2. Punctuation removal
  3. Stop word filtering
  4. Stemming/lemmatization
  5. Frequency counting
  6. Top-N selection

##### Trolley Animation
- SVG/Canvas-based visualization
- Trolley starts center, moves to chosen track
- Smooth 3-second transition
- Accessible alternative: text announcement
- Visual layout: Trolley left, clouds right

#### 4. Data Models

##### Database Schema
```sql
-- Core Tables
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  room_code VARCHAR(6) UNIQUE,
  facilitator_id UUID,
  created_at TIMESTAMP,
  config JSONB,
  status VARCHAR(20)
);

CREATE TABLE participants (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  fingerprint VARCHAR(255),
  joined_at TIMESTAMP,
  user_agent TEXT
);

CREATE TABLE votes (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  participant_id UUID REFERENCES participants(id),
  scenario_id UUID,
  vote VARCHAR(10), -- 'pull' or 'dont_pull'
  created_at TIMESTAMP,
  latency_ms INTEGER,
  UNIQUE(session_id, participant_id, scenario_id)
);

CREATE TABLE rationales (
  id UUID PRIMARY KEY,
  vote_id UUID REFERENCES votes(id),
  text VARCHAR(80),
  processed_text VARCHAR(80),
  moderated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP
);

CREATE TABLE moderation_events (
  id UUID PRIMARY KEY,
  session_id UUID,
  participant_id UUID,
  event_type VARCHAR(50),
  original_content TEXT,
  reason TEXT,
  created_at TIMESTAMP
);
```

##### Realtime Events
- `room_created`: Initialize session
- `participant_joined`: Track attendance
- `vote_cast`: Register decision
- `rationale_added`: Update word clouds
- `timer_tick`: Countdown sync
- `decision_announced`: Final result
- `word_clouds_updated`: Visual refresh

#### 5. Security & Moderation

##### Anti-Abuse Measures
- Rate limiting: 1 vote per scenario per participant
- Room capacity caps (configurable max)
- Exponential backoff for rapid requests
- Browser fingerprinting for identity persistence
- IP-based rate limiting for room creation

##### Content Moderation
- Profanity filter (configurable strictness)
- PII pattern detection (emails, phones, SSNs)
- Banned word list (customizable)
- Human review queue (optional)
- Audit log for all moderation actions

#### 6. Accessibility (WCAG 2.2 AA)

##### Visual
- Minimum contrast ratio 4.5:1
- Resizable text up to 200%
- No information conveyed by color alone
- Focus indicators on all interactive elements

##### Screen Reader Support
- ARIA live regions for timer and vote counts
- Semantic HTML structure
- Alternative text for trolley graphics
- Keyboard navigation for all features

##### Interaction
- Large touch targets (44x44px minimum)
- No time limits except game timer
- Pause/resume capability for facilitator
- Text alternatives for animations

#### 7. Performance Requirements

##### Load Testing Targets
- 200 concurrent users per room
- 10 rooms active simultaneously
- P95 vote latency ≤ 2 seconds
- P99 page load ≤ 3 seconds
- Zero message loss under normal load

##### Optimization Strategies
- CDN for static assets
- WebSocket connection pooling
- Database connection pooling
- Aggressive caching for scenarios
- Lazy loading for word cloud libraries

#### 8. Analytics & Reporting

##### Session Metrics
- Total participants
- Vote distribution per scenario
- Engagement rate (votes/participants)
- Common rationale themes
- Time to decision

##### Export Formats
- CSV: Votes and rationales
- JSON: Complete session data
- PDF: Visual report with charts
- Anonymized data only

#### 9. Facilitator Tools

##### Dashboard Features
- Real-time participant count
- Vote progress visualization
- Start/stop/reset timer
- Skip to next scenario
- Lock/unlock voting
- Emergency stop button

##### Session Management
- Pre-load scenario queue
- Adjust timer mid-round
- Remove disruptive participants
- Toggle content warnings
- Export results immediately

#### 10. Technical Implementation

##### Frontend Stack
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "react": "^18.x",
    "typescript": "^5.x",
    "d3-cloud": "^1.x",
    "framer-motion": "^10.x",
    "qrcode.react": "^3.x",
    "react-aria-live": "^2.x"
  }
}
```

##### Backend Services
- Supabase Realtime for WebSocket management
- Supabase Auth for facilitator accounts (optional)
- Netlify Functions for export generation
- Netlify Deploy Previews for PR testing

##### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
- Run ESLint and TypeScript checks
- Execute Cypress E2E tests
- Run Lighthouse accessibility audit
- Deploy preview to Netlify
- Run k6 load tests on preview
- Manual approval for production
```

### Development Phases

#### Phase 1: Foundation (Week 1-2)
- Project setup and architecture
- Database schema and migrations
- Basic realtime connectivity
- Simple voting mechanism

#### Phase 2: Core Features (Week 3-4)
- Room management system
- Timer and round logic
- Word cloud visualization
- Trolley animation

#### Phase 3: Polish (Week 5-6)
- Moderation and filtering
- Facilitator dashboard
- Export functionality
- Accessibility compliance

#### Phase 4: Testing & Launch (Week 7-8)
- Load testing at scale
- Security audit
- Documentation
- Pilot with partner organizations

### Success Criteria
1. Support 200 concurrent users with <2s latency
2. WCAG 2.2 AA compliance verified
3. 90% participant engagement rate in pilots
4. Zero critical security vulnerabilities
5. Facilitator satisfaction score >4.5/5

### Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| WebSocket scaling issues | Medium | High | Implement fallback polling; consider Socket.io |
| Inappropriate content | High | Medium | Multi-layer moderation; facilitator controls |
| Browser compatibility | Low | Medium | Progressive enhancement; fallback UI |
| DDoS attacks | Low | High | Cloudflare protection; rate limiting |
| Data privacy concerns | Medium | High | No PII storage; ephemeral sessions |

### Appendices
- A: Scenario JSON Schema
- B: Event Contract Definitions
- C: Accessibility Checklist
- D: Load Testing Results
- E: Security Audit Report