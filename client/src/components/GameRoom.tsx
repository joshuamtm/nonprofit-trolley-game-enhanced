import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { mockScenarios, MockRoomService, isMockMode } from '../services/mockData';
import { RoomService } from '../services/rooms';
import { CountdownCircleTimer } from 'react-countdown-circle-timer';
import Quotes from './Quotes';
import FacilitatorDashboard from './FacilitatorDashboard';
import { moderateText, rateLimiter } from '../utils/textProcessing';
import { useKeyboardNavigation, focusElement } from '../hooks/useKeyboardNavigation';
import { useScreenReader } from '../hooks/useScreenReader';
import './GameRoom.css';

const GameRoom: React.FC = () => {
  const { roomCode } = useParams();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role');
  const isFacilitator = role === 'facilitator';

  const {
    session,
    participant,
    currentScenario,
    loading,
    error,
    hasVoted,
    myVote,
    myRationale,
    timerActive,
    secondsRemaining,
    showResults,
    voteSummary,
    rationales,
    submitVote,
    setError,
    joinRoom,
    startScenario,
    startTimer,
    updateRationales
  } = useGameStore();

  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [availableScenarios, setAvailableScenarios] = useState<any[]>([]);
  const [rationale, setRationale] = useState('');
  const [pullRationales, setPullRationales] = useState<string[]>([]);
  const [dontPullRationales, setDontPullRationales] = useState<string[]>([]);
  const [gamePhase, setGamePhase] = useState<'waiting' | 'voting' | 'results' | 'completed'>('waiting');
  const [mockVotes, setMockVotes] = useState<Array<{vote: 'pull' | 'dont_pull', rationale: string, mitigation?: string}>>([]);
  const [moderationMessage, setModerationMessage] = useState<string>('');
  const [selectedVote, setSelectedVote] = useState<'pull' | 'dont_pull' | null>(null);
  const timerDuration = 30; // Fixed 30-second timer for all scenarios
  const [showFacilitatorView, setShowFacilitatorView] = useState(isFacilitator);
  const [selectedVoteIndex, setSelectedVoteIndex] = useState(0); // For keyboard navigation
  const [keyboardFocusMode, setKeyboardFocusMode] = useState(false);
  const [mitigation, setMitigation] = useState('');
  const [mitigations, setMitigations] = useState<string[]>([]);
  
  const gameRoomRef = useRef<HTMLDivElement>(null);
  const pullButtonRef = useRef<HTMLButtonElement>(null);
  const dontPullButtonRef = useRef<HTMLButtonElement>(null);

  // Use scenario from store, fallback to mock for demo mode or available scenarios
  const scenario = isMockMode 
    ? mockScenarios[currentScenarioIndex] 
    : (currentScenario || availableScenarios[currentScenarioIndex]);

  // Screen reader announcements
  const {
    announceGamePhase,
    announceVoteSubmitted,
    announceResults,
    announceTimer,
    announceScenarioChange,
    announceError,
    announceModeration
  } = useScreenReader();

  useEffect(() => {
    if (!session && !participant && roomCode) {
      // Join room if not already joined
      handleJoinRoom();
    }
    // Load scenarios for non-mock mode
    if (!isMockMode && availableScenarios.length === 0) {
      RoomService.loadScenarios().then(({ data }) => {
        if (data) {
          setAvailableScenarios(data);
          console.log('📚 Loaded scenarios:', data.map(s => s.title));
        }
      });
    }
  }, [roomCode]);

  // Handle scenario loading and game phase transitions
  useEffect(() => {
    // Don't auto-transition to voting just because scenario exists
    // Scenarios are pre-loaded but game should stay in waiting phase
    // until facilitator explicitly starts
    if (!scenario && !isMockMode) {
      // If no scenario is loaded, we should be in waiting phase
      setGamePhase('waiting');
    }
  }, [scenario, isMockMode]);

  // Monitor showResults from store to transition to results phase
  useEffect(() => {
    if (showResults && !isMockMode) {
      console.log('📊 showResults is true, transitioning to results phase');
      setGamePhase('results');
    }
  }, [showResults, isMockMode]);

  // Monitor when scenario changes and timer starts to transition to voting
  useEffect(() => {
    if (currentScenario && timerActive && !isMockMode) {
      console.log('📄 Scenario started by facilitator:', currentScenario.title);
      // Transition to voting phase when timer is active
      setGamePhase('voting');
      setSelectedVote(null);
      setRationale('');
      setMitigation('');
      // Reset hasVoted in store
      useGameStore.setState({ hasVoted: false, myVote: null, myRationale: '' });
    }
  }, [currentScenario?.id, timerActive]);

  // Start a local timer when voting phase begins (for participants)
  useEffect(() => {
    if (gamePhase === 'voting' && !isFacilitator && !isMockMode) {
      console.log('🎯 Participant entering voting phase, starting local timer');
      // Start a local countdown for participants
      let countdown = timerDuration;
      const localTimer = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          clearInterval(localTimer);
          console.log('⏰ Local timer expired, transitioning to results');
          setGamePhase('results');
        }
      }, 1000);
      
      return () => clearInterval(localTimer);
    }
  }, [gamePhase, isFacilitator, timerDuration]);

  // Fetch rationales and mitigations when results phase begins
  useEffect(() => {
    if (gamePhase === 'results') {
      if (isMockMode) {
        // In mock mode, extract mitigations from mockVotes
        const mockMitigations = mockVotes
          .filter(v => v.mitigation && v.mitigation.trim())
          .map(v => v.mitigation!);
        setMitigations(mockMitigations);
        console.log('📊 Mock mitigations:', mockMitigations);
      } else if (session && currentScenario) {
        console.log('📊 Fetching rationales and mitigations for quotes display');
        
        // Fetch rationales
        RoomService.getRationales(session.id, currentScenario.id).then(({ data, error }) => {
          if (data && !error) {
            console.log('✅ Got rationales:', data);
            // Update rationales for display as quotes
            setPullRationales(data.pull);
            setDontPullRationales(data.dont_pull);
            updateRationales({ pull: data.pull, dont_pull: data.dont_pull });
          } else {
            console.error('Failed to fetch rationales:', error);
          }
        });
        
        // Fetch mitigations
        RoomService.getMitigations(session.id, currentScenario.id).then(({ data, error }) => {
          if (data && !error) {
            console.log('✅ Got mitigations:', data);
            setMitigations(data);
          } else {
            console.error('Failed to fetch mitigations:', error);
          }
        });
      }
    }
  }, [gamePhase, session, currentScenario, isMockMode, mockVotes]);

  const handleJoinRoom = async () => {
    if (!roomCode) return;
    
    if (isMockMode && !isFacilitator) {
      const { participant, error } = await MockRoomService.joinRoom(roomCode);
      if (error) {
        setError(error.message);
      }
      // For demo purposes, we'll just continue
    } else if (!isMockMode) {
      await joinRoom(roomCode);
    }
  };

  const handleStartScenario = async () => {
    console.log('🚀 handleStartScenario called', { isMockMode, scenario: scenario?.title });
    
    if (isMockMode) {
      // Mock mode behavior
      setGamePhase('voting');
      // Reset voting state when starting a new scenario
      useGameStore.setState({ hasVoted: false, myVote: null, myRationale: '', showResults: false });
      setSelectedVote(null);
      setRationale('');
      setMitigation('');
      announceGamePhase('voting', `Scenario: ${scenario?.title}. You have ${timerDuration} seconds to make your choice.`);
      announceScenarioChange(currentScenarioIndex, mockScenarios.length, scenario?.title || '');
      
      // Simulate starting timer with custom duration
      setTimeout(() => {
        setGamePhase('results');
        useGameStore.setState({ showResults: true });
      }, timerDuration * 1000);
    } else {
      // Real mode - use the store to start scenario with Supabase
      try {
        console.log('📡 Starting real scenario...', { session: session?.id });
        
        // Load scenarios if not already loaded
        if (availableScenarios.length === 0) {
          console.log('📚 Loading scenarios from database...');
          const { data: scenarios, error } = await RoomService.loadScenarios();
          if (scenarios && scenarios.length > 0) {
            setAvailableScenarios(scenarios);
            console.log('✅ Starting scenario:', scenarios[currentScenarioIndex].title);
            await startScenario(scenarios[currentScenarioIndex].id);
          }
        } else {
          // Use already loaded scenarios
          const scenarioToStart = availableScenarios[currentScenarioIndex];
          console.log('🎯 Starting scenario:', scenarioToStart.title);
          await startScenario(scenarioToStart.id);
        }
        
        // Transition to voting phase when scenario starts
        setGamePhase('voting');
        
        // Start the timer for real mode (always 30 seconds)
        console.log('⏰ Starting timer: 30 seconds');
        startTimer(30);
        
        console.log('✅ Scenario start completed');
      } catch (error: any) {
        console.error('❌ Failed to start scenario:', error);
        setError(error.message || 'Failed to start scenario');
      }
    }
  };

  const handleVoteSelection = (vote: 'pull' | 'dont_pull') => {
    if (hasVoted) return;
    
    // Debug: Vote selection tracking
    // Always set the vote (no toggle behavior for better UX)
    setSelectedVote(vote);
    console.log('🗳️ Vote selected:', vote);
  };

  const handleVoteSubmit = async () => {
    if (hasVoted || !selectedVote) return;

    // Check rate limiting
    const identifier = window.navigator.userAgent + window.location.href;
    if (!rateLimiter.canSubmit(identifier)) {
      const remaining = Math.ceil(rateLimiter.getRemainingTime(identifier) / 1000);
      setModerationMessage(`Please wait ${remaining} seconds before voting again.`);
      return;
    }

    // Moderate the rationale
    let processedRationale = '';
    if (rationale.trim()) {
      const moderated = moderateText(rationale.trim());
      processedRationale = moderated.sanitized;
      
      if (moderated.moderated) {
        setModerationMessage('Your response has been filtered for inappropriate content.');
        announceModeration('Your response has been filtered for inappropriate content.');
      }
    }

    if (isMockMode) {
      // Simulate vote submission
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Add to mock votes for demonstration
      const newVote = { 
        vote: selectedVote, 
        rationale: processedRationale || rationale.trim(),
        mitigation: mitigation.trim()
      };
      // Debug: Adding vote with mitigation
      setMockVotes(prev => {
        const updated = [...prev, newVote];
        return updated;
      });
      
      // Mark as voted in mock mode
      useGameStore.setState({ hasVoted: true, myVote: selectedVote, myRationale: processedRationale || rationale.trim() });
      
      // Announce successful vote submission
      announceVoteSubmitted(selectedVote, processedRationale || rationale.trim());
    } else {
      // Submit vote with mitigation to backend
      await submitVote(selectedVote, processedRationale, mitigation.trim());
      announceVoteSubmitted(selectedVote, processedRationale);
    }

    // Clear moderation message after 3 seconds
    if (moderationMessage) {
      setTimeout(() => setModerationMessage(''), 3000);
    }
  };

  const handleNextScenario = async () => {
    // Debug: Scenario progression tracking
    if (isMockMode) {
      if (currentScenarioIndex < mockScenarios.length - 1) {
        const nextIndex = currentScenarioIndex + 1;
        setCurrentScenarioIndex(nextIndex);
        setGamePhase('waiting');
        setRationale('');
        setMitigation('');
        setPullRationales([]); // Clear pull rationales array
        setDontPullRationales([]); // Clear don't pull rationales array
        setMitigations([]); // Clear mitigations array
        setSelectedVote(null);
        setMockVotes([]); // Clear votes for new scenario
        setModerationMessage('');
        // Reset voting state in store for mock mode
        useGameStore.setState({ hasVoted: false, myVote: null, myRationale: '' });
        announceGamePhase('waiting', `Moving to scenario ${nextIndex + 1} of ${mockScenarios.length}.`);
        console.log(`✅ Advanced to scenario ${nextIndex + 1}: ${mockScenarios[nextIndex]?.title}`);
      } else {
        setGamePhase('completed');
        announceGamePhase('completed', 'Game session complete. All scenarios have been finished.');
        console.log('✅ All scenarios completed!');
      }
    } else {
      // Real mode - load next scenario from database
      try {
        // Use cached scenarios or load them
        let scenarios = availableScenarios;
        if (scenarios.length === 0) {
          const { data } = await RoomService.loadScenarios();
          if (data) {
            scenarios = data;
            setAvailableScenarios(data);
          }
        }
        
        if (scenarios && scenarios.length > 0) {
          // Move to next scenario index
          const nextIndex = (currentScenarioIndex + 1) % scenarios.length;
          setCurrentScenarioIndex(nextIndex);
          
          const nextScenario = scenarios[nextIndex];
          console.log('📚 Moving to next scenario:', nextScenario.title, 'Index:', nextIndex);
          
          // Reset state for new scenario
          setGamePhase('waiting');
          setRationale('');
          setMitigation('');
          setSelectedVote(null);
          setModerationMessage('');
          // Reset voting state in store
          useGameStore.setState({ hasVoted: false, myVote: null, myRationale: '' });
          
          // Don't start the scenario yet - just reset to waiting state
          // The facilitator will start it when ready
          announceGamePhase('waiting', `Ready for next scenario: ${nextScenario.title}`);
        }
      } catch (error) {
        console.error('Failed to load next scenario:', error);
        setError('Failed to load next scenario');
      }
    }
  };

  // Use rationales data - use local state if available, otherwise use mock data
  const displayPullRationales = pullRationales.length > 0 
    ? pullRationales 
    : mockVotes.filter(v => v.vote === 'pull').map(v => v.rationale);
    
  const displayDontPullRationales = dontPullRationales.length > 0
    ? dontPullRationales
    : mockVotes.filter(v => v.vote === 'dont_pull').map(v => v.rationale);

  // Keyboard navigation for voting phase
  useKeyboardNavigation({
    onArrowLeft: () => {
      if (gamePhase === 'voting' && !hasVoted) {
        setSelectedVoteIndex(0);
        setKeyboardFocusMode(true);
        pullButtonRef.current?.focus();
      }
    },
    onArrowRight: () => {
      if (gamePhase === 'voting' && !hasVoted) {
        setSelectedVoteIndex(1);
        setKeyboardFocusMode(true);
        dontPullButtonRef.current?.focus();
      }
    },
    onEnter: () => {
      if (gamePhase === 'voting' && !hasVoted && keyboardFocusMode) {
        if (selectedVoteIndex === 0) {
          handleVoteSelection('pull');
        } else {
          handleVoteSelection('dont_pull');
        }
      }
    },
    onSpace: () => {
      if (gamePhase === 'voting' && !hasVoted && keyboardFocusMode) {
        if (selectedVoteIndex === 0) {
          handleVoteSelection('pull');
        } else {
          handleVoteSelection('dont_pull');
        }
      }
    },
    onEscape: () => {
      setKeyboardFocusMode(false);
      gameRoomRef.current?.focus();
    },
    enabled: gamePhase === 'voting'
  });

  // Focus management for phase changes
  useEffect(() => {
    if (gamePhase === 'voting') {
      // Focus on the first vote button when entering voting phase
      setTimeout(() => {
        pullButtonRef.current?.focus();
      }, 100);
    } else if (gamePhase === 'results') {
      // Announce results
      const pullVotes = mockVotes.filter(v => v.vote === 'pull').length;
      const dontPullVotes = mockVotes.filter(v => v.vote === 'dont_pull').length;
      const decision = pullVotes > dontPullVotes ? 'pull' : 'dont_pull';
      
      announceResults(pullVotes, dontPullVotes, decision);
      announceGamePhase('results', 'Review the voting results and discussion.');
      
      if (isFacilitator) {
        // Focus on next scenario button in results
        setTimeout(() => {
          focusElement('.next-scenario-button');
        }, 100);
      }
    } else if (gamePhase === 'waiting') {
      announceGamePhase('waiting', 'Waiting for the facilitator to start the next scenario.');
    }
  }, [gamePhase, isFacilitator, mockVotes, announceGamePhase, announceResults]);

  if (error) {
    // Announce error to screen readers
    announceError(error);
    
    return (
      <div className="game-room error-state">
        <div className="error-container">
          <h2>Connection Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="game-room loading-state">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  // Show facilitator dashboard if requested
  if (showFacilitatorView && isFacilitator) {
    return (
      <FacilitatorDashboard
        roomCode={roomCode || ''}
        onStartScenario={handleStartScenario}
        onNextScenario={handleNextScenario}
        gamePhase={gamePhase}
        currentScenarioIndex={currentScenarioIndex}
        currentScenario={scenario}
        participantCount={3} // Mock participant count
        mockVotes={mockVotes}
      />
    );
  }

  return (
    <div 
      className="game-room" 
      role="main" 
      aria-label="Nonprofit Trolley Game Room"
      ref={gameRoomRef}
      tabIndex={-1}
    >
      <header className="room-header" role="banner">
        <div className="room-info">
          <h1 id="room-title">Room: {roomCode}</h1>
          <div className="participant-count" aria-live="polite" aria-atomic="true">
            {isFacilitator ? 'Facilitator View' : 'Participant'} • 3 participants
          </div>
        </div>
        
        {isFacilitator && (
          <div className="view-toggle" role="tablist" aria-label="View options">
            <button
              className={`toggle-btn ${!showFacilitatorView ? 'active' : ''}`}
              onClick={() => setShowFacilitatorView(false)}
              role="tab"
              aria-selected={!showFacilitatorView}
              aria-controls="game-content"
              id="game-view-tab"
            >
              Game View
            </button>
            <button
              className={`toggle-btn ${showFacilitatorView ? 'active' : ''}`}
              onClick={() => setShowFacilitatorView(true)}
              role="tab"
              aria-selected={showFacilitatorView}
              aria-controls="facilitator-dashboard"
              id="dashboard-tab"
            >
              Dashboard
            </button>
          </div>
        )}
        
        {gamePhase === 'voting' && (
          <div className="timer-container" role="timer" aria-label="Voting countdown timer">
            <CountdownCircleTimer
              key={`timer-${currentScenario?.id || currentScenarioIndex}`}
              isPlaying={timerActive || (gamePhase === 'voting' && !isMockMode && !hasVoted)}
              duration={timerDuration}
              initialRemainingTime={secondsRemaining > 0 ? secondsRemaining : timerDuration}
              colors={['#2ecc71', '#f39c12', '#e74c3c']}
              colorsTime={[timerDuration * 0.67, timerDuration * 0.33, 0]}
              size={80}
              onComplete={() => {
                console.log('⏰ Timer completed - transitioning to results');
                // Force transition to results phase when timer completes
                setGamePhase('results');
                // The store's startTimer function already sets showResults to true when timer completes
                return { shouldRepeat: false, delay: 0 };
              }}
            >
              {({ remainingTime }) => (
                <div className="timer-display" aria-live="assertive" aria-atomic="true">
                  <span className="sr-only">Time remaining: </span>
                  {remainingTime}
                  <span className="sr-only"> seconds</span>
                </div>
              )}
            </CountdownCircleTimer>
          </div>
        )}
      </header>

      <main className="game-content" id="game-content" role="tabpanel" aria-labelledby={showFacilitatorView ? 'dashboard-tab' : 'game-view-tab'}>
        {gamePhase === 'waiting' ? (
          <section className="waiting-phase" aria-labelledby="waiting-heading">
            <h2 id="waiting-heading">Ready for Next Scenario?</h2>
            {isMockMode ? (
              <p aria-label={`Currently on scenario ${currentScenarioIndex + 1} of ${mockScenarios.length} total scenarios`}>
                Scenario {currentScenarioIndex + 1} of {mockScenarios.length}
              </p>
            ) : (
              <p>Scenario {session ? '1 of 3' : 'Loading...'}</p>
            )}
            
            {isFacilitator ? (
              <button 
                className="start-scenario-button"
                onClick={handleStartScenario}
                aria-describedby="scenario-title-preview"
                disabled={!isMockMode && !scenario}
              >
                Start Scenario: <span id="scenario-title-preview">{scenario?.title || 'Select a scenario'}</span>
              </button>
            ) : (
              <p role="status" aria-live="polite">Waiting for facilitator to start the next scenario...</p>
            )}
            
            {isMockMode && (
              <div className="demo-controls">
                <p><em>Demo Mode: Click "Start Scenario" to begin</em></p>
              </div>
            )}
          </section>
        ) : gamePhase === 'voting' && scenario ? (
          <section className="voting-phase" aria-labelledby="scenario-heading">
            <div className="scenario-layout">
              <div className="scenario-content">
                <header className="scenario-header">
                  <h2 id="scenario-heading">{scenario?.title}</h2>
                  {scenario?.content_warnings && scenario.content_warnings.length > 0 && (
                    <div className="content-warnings" role="alert" aria-label="Content warning">
                      ⚠️ Content warnings: {scenario.content_warnings.join(', ')}
                    </div>
                  )}
                </header>

                <div className="scenario-context" role="region" aria-labelledby="context-heading">
                  <h3 id="context-heading" className="sr-only">Scenario Context</h3>
                  <p>{scenario?.context}</p>
                </div>

                <fieldset className="voting-options" role="radiogroup" aria-labelledby="voting-heading" aria-required="true">
                  <legend id="voting-heading" className="sr-only">Choose your response to the trolley problem</legend>
                  
                  <button
                    ref={pullButtonRef}
                    className={`vote-button pull-lever ${selectedVote === 'pull' ? 'selected' : ''}`}
                    onClick={() => handleVoteSelection('pull')}
                    disabled={hasVoted}
                    role="radio"
                    aria-checked={selectedVote === 'pull'}
                    aria-describedby="pull-description"
                    aria-label="Pull lever to use AI option"
                    data-keyboard-focus={keyboardFocusMode && selectedVoteIndex === 0}
                  >
                    <div className="vote-icon" aria-hidden="true">🔄</div>
                    <div className="vote-label">Pull Lever</div>
                    <div className="vote-description" id="pull-description">{scenario?.ai_option}</div>
                  </button>

                  <button
                    ref={dontPullButtonRef}
                    className={`vote-button dont-pull ${selectedVote === 'dont_pull' ? 'selected' : ''}`}
                    onClick={() => handleVoteSelection('dont_pull')}
                    disabled={hasVoted}
                    role="radio"
                    aria-checked={selectedVote === 'dont_pull'}
                    aria-describedby="dont-pull-description"
                    aria-label="Don't pull lever to use human option"
                    data-keyboard-focus={keyboardFocusMode && selectedVoteIndex === 1}
                  >
                    <div className="vote-icon" aria-hidden="true">🛑</div>
                    <div className="vote-label">Don't Pull</div>
                    <div className="vote-description" id="dont-pull-description">{scenario?.non_ai_option}</div>
                  </button>
                </fieldset>

                {selectedVote && !hasVoted && (
                  <div className="rationale-input" role="region" aria-labelledby="rationale-heading">
                    <div className="input-group">
                      <label htmlFor="rationale" id="rationale-heading">
                        Why? (optional, max 80 characters)
                      </label>
                      <input
                        id="rationale"
                        type="text"
                        value={rationale}
                        onChange={(e) => {
                          console.log('🖊️ Rationale input changed:', e.target.value);
                          // Preserve spaces in the input
                          const newValue = e.target.value;
                          setRationale(newValue);
                        }}
                        onKeyDown={(e) => {
                          // Prevent any key filtering that might block spaces
                          if (e.key === ' ') {
                            e.stopPropagation();
                          }
                        }}
                        maxLength={80}
                        placeholder="Brief explanation of your choice..."
                        aria-describedby="char-count rationale-help"
                        autoComplete="off"
                      />
                      <div id="rationale-help" className="sr-only">
                        Enter a brief explanation for your voting choice. This is optional and will be used anonymously in the word cloud.
                      </div>
                      <div className="char-count" id="char-count" aria-live="polite">
                        {rationale.length}/80
                        <span className="sr-only"> characters used</span>
                      </div>
                    </div>
                    
                    <div className="input-group">
                      <label htmlFor="mitigation" id="mitigation-heading">
                        Risk Mitigation: How could potential harms be reduced? (optional, max 80 characters)
                      </label>
                      <input
                        id="mitigation"
                        type="text"
                        value={mitigation}
                        onChange={(e) => {
                          console.log('🛡️ Mitigation input changed:', e.target.value);
                          const newValue = e.target.value;
                          setMitigation(newValue);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === ' ') {
                            e.stopPropagation();
                          }
                        }}
                        maxLength={80}
                        placeholder={selectedVote === 'pull' ? 'Risk mitigation strategies...' : 'Your suggestions...'}
                        aria-describedby="mitigation-char-count mitigation-help"
                        autoComplete="off"
                      />
                      <div id="mitigation-help" className="sr-only">
                        Enter suggestions for managing risks or alternative approaches.
                      </div>
                      <div className="char-count" id="mitigation-char-count" aria-live="polite">
                        {mitigation.length}/80
                        <span className="sr-only"> characters used</span>
                      </div>
                    </div>
                    
                    {moderationMessage && (
                      <div className="moderation-message" role="alert" aria-live="assertive">
                        ⚠️ {moderationMessage}
                      </div>
                    )}
                    <button
                      className="submit-vote-button"
                      onClick={handleVoteSubmit}
                      disabled={!selectedVote}
                      aria-label="Submit your vote with optional rationale and suggestions"
                    >
                      Submit Vote
                    </button>
                  </div>
                )}

                {hasVoted && (
                  <div className="vote-confirmation" role="status" aria-live="polite">
                    <p>
                      <span aria-hidden="true">✅</span>
                      <span className="sr-only">Success: </span>
                      Vote submitted! You chose to <strong>{myVote === 'pull' ? 'Pull the Lever' : 'Not Pull'}</strong>
                    </p>
                    {myRationale && <p>Your reasoning: "{myRationale}"</p>}
                  </div>
                )}
              </div>

              <aside className="quotes-container-wrapper" role="complementary" aria-labelledby="live-reasoning-heading">
                <h3 id="live-reasoning-heading">Live Participant Views</h3>
                <div className="quotes-split">
                  <section className="quotes-section" aria-labelledby="pull-quotes-heading">
                    <h4 id="pull-quotes-heading" className="pull-title">With AI</h4>
                    <Quotes 
                      quotes={displayPullRationales}
                      type="pull"
                      maxQuotes={3}
                    />
                  </section>
                  
                  <section className="quotes-section" aria-labelledby="dont-pull-quotes-heading">
                    <h4 id="dont-pull-quotes-heading" className="dont-pull-title">Without AI</h4>
                    <Quotes 
                      quotes={displayDontPullRationales}
                      type="dont_pull"
                      maxQuotes={3}
                    />
                  </section>
                </div>
              </aside>
            </div>
          </section>
        ) : gamePhase === 'results' ? (
          <section className="results-phase" aria-labelledby="results-heading">
            <h2 id="results-heading">Results</h2>
            <div className="results-summary" role="region" aria-labelledby="results-heading">
              <div className="vote-tally" role="table" aria-label="Vote count results">
                <div className="tally-item pull" role="cell">
                  <span className="count" aria-label={`${voteSummary?.pull_votes || mockVotes.filter(v => v.vote === 'pull').length} votes`}>
                    {voteSummary?.pull_votes || mockVotes.filter(v => v.vote === 'pull').length}
                  </span>
                  <span className="label">Pull Lever</span>
                </div>
                <div className="tally-item dont-pull" role="cell">
                  <span className="count" aria-label={`${voteSummary?.dont_pull_votes || mockVotes.filter(v => v.vote === 'dont_pull').length} votes`}>
                    {voteSummary?.dont_pull_votes || mockVotes.filter(v => v.vote === 'dont_pull').length}
                  </span>
                  <span className="label">Don't Pull</span>
                </div>
              </div>
              
              <div className="decision" role="status" aria-live="polite">
                {(() => {
                  const pullCount = voteSummary?.pull_votes || mockVotes.filter(v => v.vote === 'pull').length;
                  const dontPullCount = voteSummary?.dont_pull_votes || mockVotes.filter(v => v.vote === 'dont_pull').length;
                  const decision = pullCount > dontPullCount ? 'Pull the Lever' : pullCount < dontPullCount ? "Don't Pull" : 'Tie';
                  const track = pullCount > dontPullCount ? 'With AI' : pullCount < dontPullCount ? 'Without AI' : 'neither';
                  
                  return (
                    <>
                      <h3>The group chose to <strong>{decision}</strong></h3>
                      {track !== 'neither' ? (
                        <p>The trolley goes to the {track} track</p>
                      ) : (
                        <p>The vote ended in a tie</p>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="trolley-animation" role="img" aria-label="Animated trolley moving to the chosen track">
                {(() => {
                  const pullCount = voteSummary?.pull_votes || mockVotes.filter(v => v.vote === 'pull').length;
                  const dontPullCount = voteSummary?.dont_pull_votes || mockVotes.filter(v => v.vote === 'dont_pull').length;
                  const winner = pullCount > dontPullCount ? 'pull' : pullCount < dontPullCount ? 'dont_pull' : 'tie';
                  
                  return (
                    <>
                      <div className="track-junction">
                        <div className="track-line main-track"></div>
                        <div className="track-line left-track"></div>
                        <div className="track-line right-track"></div>
                        <div className={`trolley trolley-${winner}`} aria-hidden="true">
                          {winner === 'dont_pull' ? '🚃' : '🚂'}
                        </div>
                      </div>
                      <div className="tracks" role="presentation">
                        <div className={`track ai-track ${winner === 'pull' ? 'active chosen' : 'inactive'}`} aria-label={winner === 'pull' ? "With AI Track - chosen path" : "With AI Track - not chosen"}>
                          <span className="track-icon">🤖</span>
                          <span className="track-label">With AI</span>
                          {winner === 'pull' && <span className="track-status">✓ Selected</span>}
                        </div>
                        <div className={`track human-track ${winner === 'dont_pull' ? 'active chosen' : 'inactive'}`} aria-label={winner === 'dont_pull' ? "Without AI Track - chosen path" : "Without AI Track - not chosen"}>
                          <span className="track-icon">👥</span>
                          <span className="track-label">Without AI</span>
                          {winner === 'dont_pull' && <span className="track-status">✓ Selected</span>}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Quotes for results phase */}
              <div className="results-quotes" role="region" aria-labelledby="results-rationales-heading">
                <h3 id="results-rationales-heading">Why Participants Voted This Way</h3>
                <div className="quotes-display three-columns">
                  <section className="quotes-column" aria-labelledby="pull-results-quotes">
                    <h4 id="pull-results-quotes" className="pull-title">With AI</h4>
                    <Quotes 
                      quotes={displayPullRationales}
                      type="pull"
                      maxQuotes={5}
                    />
                  </section>
                  
                  <section className="quotes-column" aria-labelledby="dont-pull-results-quotes">
                    <h4 id="dont-pull-results-quotes" className="dont-pull-title">Without AI</h4>
                    <Quotes 
                      quotes={displayDontPullRationales}
                      type="dont_pull"
                      maxQuotes={5}
                    />
                  </section>
                  
                  <section className="quotes-column" aria-labelledby="mitigations-results-quotes">
                    <h4 id="mitigations-results-quotes" className="mitigations-title">Risk Mitigation Ideas</h4>
                    <Quotes 
                      quotes={mitigations}
                      type="mitigations"
                      maxQuotes={5}
                    />
                  </section>
                </div>
              </div>
              
              {/* Mitigations section */}
              {scenario?.mitigations && scenario.mitigations.length > 0 && (
                <div className="mitigations-section" role="region" aria-labelledby="mitigations-heading">
                  <h3 id="mitigations-heading">If Choosing AI: Risk Mitigation Strategies</h3>
                  <ul className="mitigations-list">
                    {scenario.mitigations.map((mitigation, index) => (
                      <li key={index} className="mitigation-item">{mitigation}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {isFacilitator && (
              <nav className="facilitator-controls" aria-label="Facilitator game controls">
                <button 
                  className="next-scenario-button"
                  onClick={handleNextScenario}
                  aria-describedby="next-action-desc"
                >
                  {isMockMode 
                    ? (currentScenarioIndex < mockScenarios.length - 1 ? 'Next Scenario' : 'End Game')
                    : 'Next Scenario'
                  }
                </button>
                <div id="next-action-desc" className="sr-only">
                  {isMockMode && currentScenarioIndex < mockScenarios.length - 1 
                    ? 'Proceed to the next scenario in the game'
                    : 'End the current game session'
                  }
                </div>
              </nav>
            )}
          </section>
        ) : gamePhase === 'completed' ? (
          <section className="completed-phase" aria-labelledby="completed-heading">
            <h2 id="completed-heading">🎉 All Scenarios Complete!</h2>
            <div className="completion-summary">
              <p>Thank you for participating in the Nonprofit Trolley Game.</p>
              <p>You've explored all {mockScenarios.length} ethical scenarios involving AI in nonprofit work.</p>
              <div className="session-stats">
                <h3>Session Summary</h3>
                <ul>
                  <li>Scenarios Completed: {mockScenarios.length}</li>
                  <li>Total Votes Cast: {mockVotes.length}</li>
                </ul>
              </div>
              {isFacilitator && (
                <button 
                  className="restart-button"
                  onClick={() => window.location.reload()}
                >
                  Start New Session
                </button>
              )}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
};

export default GameRoom;