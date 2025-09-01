import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { MockRoomService, isMockMode } from '../services/mockData';
import './ParticipantPage.css';

const ParticipantPage: React.FC = () => {
  const { roomCode: urlRoomCode } = useParams();
  const navigate = useNavigate();
  const { loading, error, joinRoom, setError } = useGameStore();
  const [roomCode, setRoomCode] = useState(urlRoomCode || '');

  useEffect(() => {
    if (urlRoomCode) {
      handleJoinRoom(urlRoomCode);
    }
  }, [urlRoomCode]);

  const handleJoinRoom = async (code: string) => {
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-character room code');
      return;
    }

    setError(null);

    try {
      if (isMockMode) {
        const { participant, error } = await MockRoomService.joinRoom(code.toUpperCase());
        if (error) {
          setError(error.message);
          return;
        }
        // Navigate to the room
        navigate(`/room/${code.toUpperCase()}`);
      } else {
        await joinRoom(code.toUpperCase());
        // Navigate to the room after successful join
        navigate(`/room/${code.toUpperCase()}`);
      }
    } catch (error: any) {
      console.error('Join room error:', error);
      setError(error.message || 'Failed to join room. Please check the room code and try again.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleJoinRoom(roomCode);
  };

  return (
    <div className="participant-page">
      <div className="header">
        <h1>Join a Trolley Game</h1>
        <p>Enter your room code or scan the QR code provided by your facilitator</p>
      </div>

      <div className="join-form">
        <div className="form-container">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="roomCode">Room Code</label>
              <input
                id="roomCode"
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit code (e.g., ABC123)"
                maxLength={6}
                className="room-code-input"
                disabled={loading}
              />
              <div className="input-help">
                Room codes are 6 characters long and contain letters and numbers
              </div>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="join-button"
              disabled={loading || roomCode.length !== 6}
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>
          </form>

          <div className="divider">
            <span>or</span>
          </div>

          <div className="qr-scanner-section">
            <h3>Scan QR Code</h3>
            <p>Use your phone's camera or a QR scanner app</p>
            <div className="qr-placeholder">
              📱 QR Scanner
              <br />
              <small>Point your camera at the QR code on screen</small>
            </div>
          </div>
        </div>

        {isMockMode && (
          <div className="demo-notice">
            <h3>🚧 Demo Mode</h3>
            <p>
              Try joining with room code: <strong>DEMO01</strong> for testing
            </p>
            <button
              className="demo-join-button"
              onClick={() => handleJoinRoom('DEMO01')}
              disabled={loading}
            >
              Join Demo Room
            </button>
          </div>
        )}
      </div>

      <div className="info-section">
        <h2>What to Expect</h2>
        <div className="info-grid">
          <div className="info-item">
            <div className="info-icon">👥</div>
            <h4>Join Your Group</h4>
            <p>Connect with other participants in real-time</p>
          </div>
          
          <div className="info-item">
            <div className="info-icon">⚖️</div>
            <h4>Make Ethical Decisions</h4>
            <p>Vote on AI dilemmas facing nonprofit organizations</p>
          </div>
          
          <div className="info-item">
            <div className="info-icon">💭</div>
            <h4>Share Your Reasoning</h4>
            <p>Explain your choices in brief rationales</p>
          </div>
          
          <div className="info-item">
            <div className="info-icon">📊</div>
            <h4>See Group Results</h4>
            <p>Watch how your collective decisions unfold</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantPage;