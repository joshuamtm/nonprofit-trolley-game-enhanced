# Fix Plan - Cycle 1

## Fixes to Implement (in order)
1. **Fix: MTM Logo path issue**
   - File(s): client/src/components/MTMFooter.tsx
   - Approach: URL encode the filename to handle spaces
   - Test: Check footer displays logo correctly
   - Time estimate: 2 minutes

2. **Fix: Make timer more prominent**
   - File(s): client/src/components/GameRoom.css
   - Approach: Increase timer size and add visual emphasis
   - Test: Verify timer is clearly visible during voting
   - Time estimate: 5 minutes

3. **Fix: Add loading indicator**
   - File(s): client/src/components/GameRoom.tsx
   - Approach: Add loading state during scenario transitions
   - Test: Check smooth transition between scenarios
   - Time estimate: 5 minutes

## Deferred to Next Cycle
- None, all issues will be addressed