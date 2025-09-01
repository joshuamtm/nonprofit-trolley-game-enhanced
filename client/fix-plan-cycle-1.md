# Fix Plan - Cycle 1

## Fixes to Implement (in order)
1. Fix: Compilation errors (setRationales, setHasVoted)
   - File(s): GameRoom.tsx
   - Approach: These variables don't exist - need to use proper state management
   - Test: npm run build should succeed
   - Time estimate: 5 minutes

2. Fix: Cannot proceed past Scenario 3
   - File(s): GameRoom.tsx handleNextScenario
   - Approach: Fix scenario index bounds checking
   - Test: Should be able to reach all 4 scenarios
   - Time estimate: 10 minutes

3. Fix: Timer doesn't stop after voting
   - File(s): GameRoom.tsx line 539
   - Approach: Already partially fixed, ensure hasVoted state properly managed
   - Test: Timer should pause when vote submitted
   - Time estimate: 5 minutes

4. Fix: Double-click voting issue
   - File(s): GameRoom.tsx handleVoteSelection
   - Approach: Fix state update logic for selectedVote
   - Test: Single click should show input fields
   - Time estimate: 10 minutes

5. Fix: Mitigations not displaying
   - File(s): GameRoom.tsx results section
   - Approach: Ensure mitigations array populated from votes
   - Test: Submitted mitigations appear in results
   - Time estimate: 15 minutes

6. Fix: Clear data between scenarios
   - File(s): GameRoom.tsx handleNextScenario
   - Approach: Reset all relevant state arrays
   - Test: No data carries over between scenarios
   - Time estimate: 10 minutes

## Deferred to Next Cycle
- Facilitator dashboard sync (medium complexity)
- Completed state UI (already partially done)