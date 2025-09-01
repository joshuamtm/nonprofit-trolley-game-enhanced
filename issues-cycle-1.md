# Issues Found - Cycle 1

## Critical (Breaks core functionality)
None found.

## High (Poor UX but functional)
None found.

## Medium (Cosmetic or minor UX)
1. **MTM Logo not displaying in footer**
   - Location: client/src/components/MTMFooter.tsx:7
   - Steps to reproduce: Load any page and check footer
   - Expected: MTM logo should display
   - Actual: Shows alt text "Meet the Moment"
   - Affected scenarios: All pages
   - Cause: Path issue with spaces in filename

2. **Timer display not prominent enough**
   - Location: client/src/components/GameRoom.tsx (timer display section)
   - Steps to reproduce: Start any scenario as facilitator
   - Expected: Timer should be highly visible during voting
   - Actual: Timer is small in header, easy to miss
   - Affected scenarios: All voting phases

## Low (Nice to have)
1. **No loading indicator between scenarios**
   - Location: client/src/components/GameRoom.tsx (transition logic)
   - Steps to reproduce: Click "Next Scenario" 
   - Expected: Loading spinner or transition animation
   - Actual: Instant transition may seem jarring
   - Affected scenarios: All scenario transitions

## Fixed from Previous Cycle
- [✅] Game auto-starting without facilitator action - FIXED
- [✅] MTM Style Guide implementation - COMPLETED