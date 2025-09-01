import { useRef, useCallback } from 'react';

interface ScreenReaderOptions {
  politeness?: 'polite' | 'assertive';
  atomic?: boolean;
}

export const useScreenReader = () => {
  const politeRegionRef = useRef<HTMLDivElement | null>(null);
  const assertiveRegionRef = useRef<HTMLDivElement | null>(null);

  // Create live regions if they don't exist
  const ensureLiveRegions = useCallback(() => {
    if (!politeRegionRef.current) {
      const politeRegion = document.createElement('div');
      politeRegion.setAttribute('aria-live', 'polite');
      politeRegion.setAttribute('aria-atomic', 'true');
      politeRegion.className = 'sr-only';
      politeRegion.id = 'polite-announcements';
      document.body.appendChild(politeRegion);
      politeRegionRef.current = politeRegion;
    }

    if (!assertiveRegionRef.current) {
      const assertiveRegion = document.createElement('div');
      assertiveRegion.setAttribute('aria-live', 'assertive');
      assertiveRegion.setAttribute('aria-atomic', 'true');
      assertiveRegion.className = 'sr-only';
      assertiveRegion.id = 'assertive-announcements';
      document.body.appendChild(assertiveRegion);
      assertiveRegionRef.current = assertiveRegion;
    }
  }, []);

  const announce = useCallback((
    message: string, 
    options: ScreenReaderOptions = { politeness: 'polite', atomic: true }
  ) => {
    ensureLiveRegions();

    const region = options.politeness === 'assertive' 
      ? assertiveRegionRef.current 
      : politeRegionRef.current;

    if (region) {
      // Clear previous message first
      region.textContent = '';
      
      // Use setTimeout to ensure the clearing is processed before new content
      setTimeout(() => {
        region.textContent = message;
      }, 100);
    }
  }, [ensureLiveRegions]);

  const announceGamePhase = useCallback((phase: string, context?: string) => {
    const messages = {
      waiting: `Game phase: Waiting. ${context || 'Ready for the next scenario.'}`,
      voting: `Game phase: Voting has started. ${context || 'Choose your response to the trolley problem.'}`,
      results: `Game phase: Results are now available. ${context || 'The voting has ended.'}`
    };

    announce(messages[phase as keyof typeof messages] || `Game phase changed to ${phase}`, {
      politeness: 'assertive'
    });
  }, [announce]);

  const announceVoteSubmitted = useCallback((vote: 'pull' | 'dont_pull', rationale?: string) => {
    const action = vote === 'pull' ? 'pull the lever' : 'not pull the lever';
    let message = `Vote submitted successfully. You chose to ${action}.`;
    
    if (rationale) {
      message += ` Your reasoning: "${rationale}"`;
    }

    announce(message, { politeness: 'assertive' });
  }, [announce]);

  const announceResults = useCallback((
    pullVotes: number, 
    dontPullVotes: number, 
    decision: 'pull' | 'dont_pull'
  ) => {
    const total = pullVotes + dontPullVotes;
    const winner = decision === 'pull' ? 'pull the lever' : 'not pull the lever';
    
    const message = `Voting results: ${pullVotes} votes to pull, ${dontPullVotes} votes to not pull, out of ${total} total votes. The group decided to ${winner}.`;
    
    announce(message, { politeness: 'assertive' });
  }, [announce]);

  const announceTimer = useCallback((secondsRemaining: number) => {
    if (secondsRemaining <= 10 && secondsRemaining > 0) {
      announce(`${secondsRemaining} seconds remaining`, { politeness: 'assertive' });
    } else if (secondsRemaining === 0) {
      announce('Time is up. Voting has ended.', { politeness: 'assertive' });
    }
  }, [announce]);

  const announceScenarioChange = useCallback((
    scenarioIndex: number, 
    totalScenarios: number, 
    title: string
  ) => {
    const message = `New scenario ${scenarioIndex + 1} of ${totalScenarios}: ${title}`;
    announce(message, { politeness: 'polite' });
  }, [announce]);

  const announceParticipantCount = useCallback((count: number) => {
    const message = count === 1 
      ? `${count} participant in the room` 
      : `${count} participants in the room`;
    announce(message, { politeness: 'polite' });
  }, [announce]);

  const announceError = useCallback((error: string) => {
    announce(`Error: ${error}`, { politeness: 'assertive' });
  }, [announce]);

  const announceSuccess = useCallback((message: string) => {
    announce(`Success: ${message}`, { politeness: 'polite' });
  }, [announce]);

  const announceModeration = useCallback((message: string) => {
    announce(`Content moderation: ${message}`, { politeness: 'assertive' });
  }, [announce]);

  return {
    announce,
    announceGamePhase,
    announceVoteSubmitted,
    announceResults,
    announceTimer,
    announceScenarioChange,
    announceParticipantCount,
    announceError,
    announceSuccess,
    announceModeration
  };
};