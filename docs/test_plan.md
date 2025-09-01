# Test Plan: Nonprofit Trolley Game

## Test Strategy Overview

### Testing Priorities
1. **Critical Path**: Room creation → Join → Vote → Results
2. **Performance**: 200 concurrent users with <2s latency
3. **Accessibility**: WCAG 2.2 AA compliance
4. **Security**: Input validation, rate limiting, XSS prevention
5. **Cross-browser**: Chrome, Firefox, Safari, Edge (latest 2 versions)

### Test Environments
- **Local**: Developer machines
- **Preview**: Netlify Deploy Previews (per PR)
- **Staging**: Dedicated staging environment
- **Production**: Live application

## Unit Tests

### Frontend Components
```typescript
// Test coverage targets: >80%

describe('VotingComponent', () => {
  test('prevents double voting');
  test('enforces rationale character limit');
  test('handles network failures gracefully');
  test('displays countdown timer accurately');
});

describe('WordCloudComponent', () => {
  test('renders without overlapping trolley');
  test('updates in real-time');
  test('handles empty data sets');
  test('maintains responsive layout');
});

describe('TrolleyAnimation', () => {
  test('animates to correct track');
  test('provides screen reader alternatives');
  test('completes within 3 seconds');
});
```

### Backend Functions
```javascript
// Supabase Edge Functions tests

describe('Room Management', () => {
  test('generates unique 6-character codes');
  test('enforces participant limits');
  test('cleans up inactive sessions');
});

describe('Vote Processing', () => {
  test('prevents duplicate votes');
  test('validates vote values');
  test('calculates results accurately');
});

describe('Moderation', () => {
  test('filters profanity');
  test('removes PII patterns');
  test('logs moderation events');
});
```

## Integration Tests

### Critical User Flows

#### 1. Facilitator Flow
```typescript
describe('Facilitator Journey', () => {
  it('creates room with custom settings', async () => {
    // Create room
    // Verify QR code generation
    // Configure timer and limits
    // Select scenarios
    // Start session
  });
  
  it('manages active session', async () => {
    // Monitor participant count
    // Start/stop timer
    // Skip scenarios
    // Lock voting
    // Export results
  });
});
```

#### 2. Participant Flow
```typescript
describe('Participant Journey', () => {
  it('joins and participates', async () => {
    // Scan QR code
    // Join room
    // View scenario
    // Cast vote
    // Add rationale
    // View results
  });
  
  it('handles edge cases', async () => {
    // Rejoin after disconnect
    // Vote near timeout
    // Submit max-length rationale
  });
});
```

### API Integration Tests
```typescript
describe('Supabase Realtime', () => {
  test('broadcasts votes to all participants');
  test('syncs timer across clients');
  test('handles connection drops');
  test('enforces room capacity');
});

describe('Data Persistence', () => {
  test('saves votes atomically');
  test('prevents race conditions');
  test('maintains data integrity');
});
```

## End-to-End Tests (Cypress)

### Test Scenarios

```javascript
// cypress/e2e/complete-session.cy.js

describe('Complete Game Session', () => {
  it('runs full session with 10 participants', () => {
    // Facilitator creates room
    cy.visit('/facilitator');
    cy.contains('Create Room').click();
    cy.get('[data-testid="room-code"]').should('be.visible');
    
    // Participants join
    for(let i = 0; i < 10; i++) {
      cy.window().then(win => {
        // Simulate participant joining
      });
    }
    
    // Run through 3 scenarios
    cy.get('[data-testid="start-button"]').click();
    
    // Verify voting works
    cy.get('[data-testid="vote-pull"]').click();
    cy.get('[data-testid="rationale-input"]').type('Save more lives');
    
    // Check word clouds appear
    cy.get('[data-testid="word-cloud-pull"]').should('exist');
    
    // Verify results
    cy.get('[data-testid="decision-text"]').should('contain', 'people voted');
  });
});
```

### Accessibility Tests
```javascript
describe('Accessibility Compliance', () => {
  it('passes axe-core audit', () => {
    cy.injectAxe();
    cy.checkA11y();
  });
  
  it('supports keyboard navigation', () => {
    cy.get('body').tab();
    cy.focused().should('have.attr', 'data-testid', 'first-interactive');
  });
  
  it('announces changes to screen readers', () => {
    cy.get('[role="status"]').should('have.attr', 'aria-live', 'polite');
  });
});
```

## Performance Tests

### Load Testing Script (k6)
```javascript
import http from 'k6/http';
import ws from 'k6/ws';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up
    { duration: '5m', target: 200 },  // Stay at 200
    { duration: '2m', target: 500 },  // Spike to 500
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% under 2s
    ws_connecting: ['p(95)<1000'],     // WebSocket connection
    checks: ['rate>0.9'],               // 90% success rate
  },
};

export default function() {
  // Join room
  const joinResponse = http.post('/api/join', {
    roomCode: 'TEST01',
  });
  
  check(joinResponse, {
    'joined successfully': (r) => r.status === 200,
  });
  
  // Establish WebSocket
  ws.connect('wss://app.supabase.co/realtime/v1', {}, function(socket) {
    socket.on('open', () => {
      socket.send(JSON.stringify({
        type: 'vote',
        vote: 'pull',
        rationale: 'Test reason',
      }));
    });
    
    socket.on('message', (data) => {
      check(data, {
        'received update': () => true,
      });
    });
    
    socket.setTimeout(() => {
      socket.close();
    }, 30000);
  });
}
```

### Lighthouse Performance Metrics
```yaml
Target Scores:
  Performance: 90+
  Accessibility: 95+
  Best Practices: 90+
  SEO: 90+

Key Metrics:
  First Contentful Paint: <1.5s
  Time to Interactive: <3.5s
  Cumulative Layout Shift: <0.1
  Total Blocking Time: <300ms
```

## Security Tests

### Input Validation
```javascript
describe('Security: Input Validation', () => {
  test('rejects SQL injection attempts');
  test('sanitizes HTML in rationales');
  test('validates room codes format');
  test('enforces rate limits');
});
```

### Authentication & Authorization
```javascript
describe('Security: Access Control', () => {
  test('prevents unauthorized facilitator actions');
  test('enforces room capacity limits');
  test('validates participant fingerprints');
  test('prevents session hijacking');
});
```

### Data Protection
```javascript
describe('Security: Data Protection', () => {
  test('does not expose PII');
  test('uses secure WebSocket connections');
  test('implements CORS properly');
  test('validates all API inputs');
});
```

## Browser Compatibility Matrix

| Feature | Chrome 120+ | Firefox 120+ | Safari 17+ | Edge 120+ |
|---------|------------|--------------|------------|-----------|
| Core Voting | ✅ | ✅ | ✅ | ✅ |
| WebSockets | ✅ | ✅ | ✅ | ✅ |
| Word Clouds | ✅ | ✅ | ✅ | ✅ |
| Animations | ✅ | ✅ | ✅ | ✅ |
| QR Scanner | ✅ | ✅ | ⚠️ | ✅ |
| TTS | ✅ | ✅ | ✅ | ✅ |

## Mobile Testing

### Devices to Test
- iPhone 12+ (Safari)
- iPhone SE (small screen)
- iPad (tablet layout)
- Pixel 6+ (Chrome)
- Samsung Galaxy S21+ (Chrome/Samsung Internet)

### Mobile-Specific Tests
```javascript
describe('Mobile Experience', () => {
  test('QR scanner works');
  test('touch targets are 44x44px minimum');
  test('word clouds remain readable');
  test('voting works with touch');
  test('handles orientation changes');
});
```

## Regression Test Suite

### Critical Path (Run on Every PR)
1. Room creation and code generation
2. Participant joining via QR
3. Voting and rationale submission
4. Word cloud generation
5. Result calculation and display
6. Session data export

### Weekly Full Regression
1. All unit tests
2. All integration tests
3. Full E2E suite
4. Performance benchmarks
5. Security scan
6. Accessibility audit

## Test Data Management

### Scenarios
```json
{
  "test_scenarios": [
    {
      "id": "test-001",
      "title": "Test Scenario 1",
      "expectedVotes": {"pull": 60, "dont_pull": 40}
    }
  ]
}
```

### Test Users
- Facilitator accounts (if implemented)
- Simulated participants (via fingerprinting)
- Rate limit testing identities
- Moderation test cases

## Bug Report Template

```markdown
### Description
Brief description of the issue

### Steps to Reproduce
1. Go to...
2. Click on...
3. Enter...
4. See error

### Expected Behavior
What should happen

### Actual Behavior
What actually happens

### Environment
- Browser: [e.g., Chrome 120]
- OS: [e.g., macOS 14]
- Screen size: [e.g., 1920x1080]
- Network: [e.g., 4G, WiFi]

### Screenshots/Videos
If applicable

### Severity
Critical | High | Medium | Low
```

## Test Metrics & Reporting

### Key Metrics to Track
- Test coverage percentage
- Pass/fail rates by category
- Performance benchmark trends
- Accessibility score trends
- Time to run full suite
- Flaky test identification

### Reporting Dashboard
```
Daily Report:
- Unit Tests: 95% pass (380/400)
- Integration: 100% pass (45/45)
- E2E: 98% pass (49/50)
- Performance: P95 latency 1.8s ✅
- Accessibility: Score 96/100 ✅
```

## Continuous Monitoring

### Production Monitoring
- Real User Monitoring (RUM)
- Error tracking (Sentry)
- Performance monitoring
- Uptime monitoring
- WebSocket health checks

### Alerts
- P95 latency >2s
- Error rate >1%
- Concurrent users >450
- Database connection issues
- Memory usage >80%

## Test Environment Setup

### Local Development
```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run cypress:open

# Run performance tests
k6 run tests/load/k6-script.js
```

### CI/CD Pipeline
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm ci
      - run: npm test
      - run: npm run test:integration
      - run: npm run cypress:run
      - run: npm run lighthouse
```

This test plan ensures comprehensive coverage of functionality, performance, accessibility, and security requirements while maintaining efficient test execution and clear reporting.