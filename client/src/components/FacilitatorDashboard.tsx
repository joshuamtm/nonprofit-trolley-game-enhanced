import React, { useState, useEffect } from 'react';
import { mockScenarios } from '../services/mockData';
import { CountdownCircleTimer } from 'react-countdown-circle-timer';
import './FacilitatorDashboard.css';

interface FacilitatorDashboardProps {
  roomCode: string;
  onStartScenario: () => void;
  onNextScenario: () => void;
  gamePhase: 'waiting' | 'voting' | 'results' | 'completed';
  currentScenarioIndex: number;
  currentScenario?: any;
  participantCount?: number;
  mockVotes: Array<{vote: 'pull' | 'dont_pull', rationale: string, mitigation?: string}>;
}

const FacilitatorDashboard: React.FC<FacilitatorDashboardProps> = ({
  roomCode,
  onStartScenario,
  onNextScenario,
  gamePhase,
  currentScenarioIndex,
  currentScenario: propScenario,
  participantCount = 0,
  mockVotes,
}) => {
  const [showScenarioPreview, setShowScenarioPreview] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedScenarios, setSelectedScenarios] = useState<number[]>([]);

  const currentScenario = propScenario || mockScenarios[currentScenarioIndex];
  const isLastScenario = currentScenarioIndex >= mockScenarios.length - 1;

  const pullVotes = mockVotes.filter(v => v.vote === 'pull').length;
  const dontPullVotes = mockVotes.filter(v => v.vote === 'dont_pull').length;
  const totalVotes = mockVotes.length;


  const handleExportSession = (format: 'csv' | 'json' | 'pdf') => {
    // Simulate export functionality
    const sessionData = {
      roomCode,
      timestamp: new Date().toISOString(),
      scenarios: mockScenarios.slice(0, currentScenarioIndex + 1),
      votes: mockVotes,
      participantCount,
      totalVotes
    };

    const dataStr = format === 'json' 
      ? JSON.stringify(sessionData, null, 2)
      : `Room Code,Scenario,Vote Type,Rationale\n${mockVotes.map((v, i) => 
          `${roomCode},${currentScenario?.title},${v.vote},${v.rationale}`
        ).join('\n')}`;

    const blob = new Blob([dataStr], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trolley-game-session-${roomCode}-${Date.now()}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
    
    setShowExportModal(false);
  };

  const toggleScenarioSelection = (index: number) => {
    setSelectedScenarios(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <div className="facilitator-dashboard">
      <div className="dashboard-header">
        <h2>Facilitator Dashboard</h2>
        <div className="session-info">
          <span className="room-code-badge">Room: {roomCode}</span>
          <span className="participants-badge">{participantCount} participants</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Current Session Status */}
        <div className="dashboard-card session-status">
          <h3>Session Status</h3>
          <div className="status-details">
            <div className="status-item">
              <span className="label">Phase:</span>
              <span className={`value phase-${gamePhase}`}>
                {gamePhase.charAt(0).toUpperCase() + gamePhase.slice(1)}
              </span>
            </div>
            <div className="status-item">
              <span className="label">Scenario:</span>
              <span className="value">
                {currentScenarioIndex + 1} of {mockScenarios.length}
              </span>
            </div>
            <div className="status-item">
              <span className="label">Votes:</span>
              <span className="value">{totalVotes}</span>
            </div>
          </div>
        </div>

        {/* Timer Display */}
        <div className="dashboard-card timer-display">
          <h3>Timer</h3>
          <div className="timer-info">
            <p>All scenarios: 30 seconds</p>
          </div>
          
          {gamePhase === 'voting' && (
            <div className="active-timer">
              <CountdownCircleTimer
                isPlaying={true}
                duration={30}
                colors={['#2ecc71', '#f39c12', '#e74c3c']}
                colorsTime={[20, 10, 0]}
                size={60}
              >
                {({ remainingTime }) => (
                  <span className="timer-text">{remainingTime}</span>
                )}
              </CountdownCircleTimer>
            </div>
          )}
        </div>

        {/* Vote Results */}
        <div className="dashboard-card vote-results">
          <h3>Live Results</h3>
          <div className="results-chart">
            <div className="result-bar pull-bar">
              <div className="bar-label">Pull Lever</div>
              <div className="bar-fill" style={{ width: `${totalVotes ? (pullVotes / totalVotes) * 100 : 0}%` }}></div>
              <div className="bar-count">{pullVotes}</div>
            </div>
            <div className="result-bar dont-pull-bar">
              <div className="bar-label">Don't Pull</div>
              <div className="bar-fill" style={{ width: `${totalVotes ? (dontPullVotes / totalVotes) * 100 : 0}%` }}></div>
              <div className="bar-count">{dontPullVotes}</div>
            </div>
          </div>
        </div>

        {/* Scenario Controls */}
        <div className="dashboard-card scenario-controls">
          <h3>Scenario Control</h3>
          <div className="current-scenario">
            <h4>{currentScenario?.title}</h4>
            <button
              className="preview-button"
              onClick={() => setShowScenarioPreview(!showScenarioPreview)}
            >
              {showScenarioPreview ? 'Hide' : 'Show'} Preview
            </button>
          </div>

          <div className="action-buttons">
            {gamePhase === 'waiting' && (
              <button 
                className="action-btn primary"
                onClick={onStartScenario}
              >
                Start Scenario
              </button>
            )}
            
            {gamePhase === 'results' && (
              <button 
                className="action-btn primary"
                onClick={onNextScenario}
              >
                {isLastScenario ? 'End Session' : 'Next Scenario'}
              </button>
            )}

            {gamePhase === 'voting' && (
              <button className="action-btn secondary" disabled>
                Voting in Progress...
              </button>
            )}
          </div>
        </div>

        {/* Session Management */}
        <div className="dashboard-card session-management">
          <h3>Session Management</h3>
          <div className="management-buttons">
            <button 
              className="mgmt-btn"
              onClick={() => setShowExportModal(true)}
            >
              📊 Export Results
            </button>
            <button 
              className="mgmt-btn"
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join/${roomCode}`)}
            >
              📋 Copy Join Link
            </button>
            <button 
              className="mgmt-btn danger"
              onClick={() => window.confirm('End session?') && window.location.reload()}
            >
              🔚 End Session
            </button>
          </div>
        </div>

        {/* Scenario Queue */}
        <div className="dashboard-card scenario-queue">
          <h3>Scenario Queue</h3>
          <div className="scenario-list">
            {mockScenarios.map((scenario, index) => (
              <div 
                key={scenario.id}
                className={`scenario-item ${index === currentScenarioIndex ? 'current' : ''} ${index < currentScenarioIndex ? 'completed' : ''}`}
              >
                <div className="scenario-number">{index + 1}</div>
                <div className="scenario-info">
                  <div className="scenario-title">{scenario.title}</div>
                  <div className="scenario-difficulty">{scenario.difficulty_level}</div>
                </div>
                <div className="scenario-status">
                  {index < currentScenarioIndex ? '✓' : 
                   index === currentScenarioIndex ? '▶' : '⏸'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scenario Preview Modal */}
      {showScenarioPreview && (
        <div className="modal-overlay">
          <div className="modal scenario-preview-modal">
            <div className="modal-header">
              <h3>Scenario Preview</h3>
              <button 
                className="close-btn"
                onClick={() => setShowScenarioPreview(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <h4>{currentScenario?.title}</h4>
              <div className="scenario-details">
                <div className="detail-section">
                  <h5>Context:</h5>
                  <p>{currentScenario?.context}</p>
                </div>
                <div className="detail-section">
                  <h5>AI Option (Pull):</h5>
                  <p>{currentScenario?.ai_option}</p>
                </div>
                <div className="detail-section">
                  <h5>Human Option (Don't Pull):</h5>
                  <p>{currentScenario?.non_ai_option}</p>
                </div>
                <div className="detail-section">
                  <h5>Key Assumptions:</h5>
                  <ul>
                    {currentScenario?.assumptions.map((assumption, i) => (
                      <li key={i}>{assumption}</li>
                    ))}
                  </ul>
                </div>
                <div className="detail-section">
                  <h5>Discussion Prompts:</h5>
                  <ul>
                    {currentScenario?.discussion_prompts.map((prompt, i) => (
                      <li key={i}>{prompt}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay">
          <div className="modal export-modal">
            <div className="modal-header">
              <h3>Export Session Data</h3>
              <button 
                className="close-btn"
                onClick={() => setShowExportModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-content">
              <p>Choose format to export session results:</p>
              <div className="export-options">
                <button 
                  className="export-btn"
                  onClick={() => handleExportSession('csv')}
                >
                  📈 CSV Spreadsheet
                </button>
                <button 
                  className="export-btn"
                  onClick={() => handleExportSession('json')}
                >
                  📋 JSON Data
                </button>
                <button 
                  className="export-btn"
                  onClick={() => handleExportSession('pdf')}
                >
                  📄 PDF Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacilitatorDashboard;